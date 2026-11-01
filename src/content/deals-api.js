/**
 * SteamLens AI — Deals & Authorized Key Affiliate Service
 * 
 * Fetches real-time Steam key deals from authorized digital distributors (Humble Store)
 * via CheapShark API, verifies if the deal is strictly CHEAPER than Steam's current price,
 * and generates direct affiliate links to ensure 100% partner attribution.
 */

(function () {
  'use strict';

  const DEALS_CONFIG = {
    humblePartnerTag: 'steamlens-ai', // Impact.com partner tag (can be updated when approved)
    enableAffiliate: true,
    cacheDurationMs: 6 * 60 * 60 * 1000 // 6 hours persistent cache (fresh prices without API spam)
  };

  class DealsApiClient {
    constructor() {
      this.memoryCache = new Map();
      this.rateLimitBackoffUntil = 0;

      // Load persisted backoff timestamp if any
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.get('steamlens_deals_backoff_until').then(data => {
            if (data?.steamlens_deals_backoff_until) {
              this.rateLimitBackoffUntil = Number(data.steamlens_deals_backoff_until) || 0;
            }
          }).catch(() => {});
        }
      } catch {}
    }

    /**
     * Sanitizes raw Steam game titles for high-accuracy Humble Store searches.
     * Strips trademarks (™, ®, ©), bracketed region/platform tags, and edition/remaster suffixes.
     */
    sanitizeGameTitle(rawTitle) {
      if (!rawTitle || typeof rawTitle !== 'string') return '';

      let clean = rawTitle
        // 1. Remove trademark and copyright symbols
        .replace(/[™®©]/g, '')
        // 2. Remove common region, platform, or edition brackets e.g. (LATAM), [VR], [Remastered]
        .replace(/\s*[\(\[][^\)\]]*(LATAM|RU|CIS|NA|EU|ROW|VR|PC|Mac|Linux|Remaster|Edition|Cut)[^\)\]]*[\)\]]/gi, '')
        // 3. Remove verbose edition suffixes or remaster tags
        .replace(/\s*[-:]*\s*(Ultimate Edition|Gold Edition|Platinum Edition|Premium Edition|Remastered|Remaster|HD Remaster|Remake|Reboot|Director\'?s Cut|Anniversary Edition|Game of the Year Edition|GOTY Edition|Definitive Edition|Definitive Experience|Digital Deluxe Edition|Deluxe Edition|Complete Edition|Enhanced Edition|Special Edition|Standard Edition|Legacy Edition|Collector\'?s Edition|VR Edition)$/gi, '')
        // 4. Clean up colons, double-dashes, and underscores into clean single spaces
        .replace(/[-:_]+/g, ' ')
        // 5. Collapse multiple whitespace into one
        .replace(/\s+/g, ' ')
        .trim();

      return clean || rawTitle.trim();
    }

    /**
     * Generates a direct search URL on Humble Store with the official affiliate tag.
     * Never uses third-party redirect links.
     */
    getHumbleSearchUrl(gameTitle) {
      const cleanName = this.sanitizeGameTitle(gameTitle);
      const encoded = encodeURIComponent(cleanName);
      const partner = DEALS_CONFIG.humblePartnerTag;
      return `https://www.humblebundle.com/store/search?sort=bestselling&search=${encoded}&partner=${partner}`;
    }

    /**
     * Resolves the country code for Steam Store pricing.
     * Turkish ('tr') -> 'tr' (Turkey & MENA-USD regional pricing)
     * English ('en') or other -> 'us' (US Standard USD pricing)
     */
    resolveCountryCode(lang = 'tr') {
      return (lang === 'tr') ? 'tr' : 'us';
    }

    /**
     * Fetches official Steam Store price for the exact App ID and country code.
     * Uses background Service Worker message first, with direct store API fallback.
     * 
     * @param {string|number} appId - Steam App ID
     * @param {string} cc - Country code ('tr' or 'us')
     * @returns {Promise<number|null>} Exact current price in USD, or 0 if free, or null
     */
    async getSteamPriceFromAPI(appId, cc = 'tr') {
      // 1. Try background Service Worker message (clean bypass of CORS/redirects)
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          const swResponse = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { type: 'FETCH_STEAM_PRICE', appId, cc },
              (res) => {
                if (chrome.runtime.lastError) {
                  resolve(null);
                } else {
                  resolve(res);
                }
              }
            );
          });

          if (swResponse && swResponse.success && typeof swResponse.price === 'number') {
            return swResponse.price;
          }
        } catch (swErr) {
          console.warn('[SteamLens AI] SW price fetch failed, trying direct:', swErr);
        }
      }

      // 2. Direct same-origin fetch from content script
      try {
        const url = `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&cc=${encodeURIComponent(cc)}&filters=price_overview`;
        const resp = await fetch(url);
        if (resp.ok) {
          const json = await resp.json();
          const appObj = json && json[String(appId)];
          if (appObj && appObj.success && appObj.data) {
            if (appObj.data.is_free) return 0;
            const po = appObj.data.price_overview;
            if (po && typeof po.final === 'number') {
              return po.final / 100;
            }
          }
        }
      } catch (directErr) {
        console.warn('[SteamLens AI] Direct price fetch error:', directErr);
      }

      return null;
    }

    /**
     * Reads current active Steam purchase price directly from the store DOM as a fallback.
     * Prioritizes the main game container matching this exact App ID to avoid picking
     * up cheaper soundtracks or more expensive deluxe bundles.
     * 
     * @param {string|number} appId - Steam App ID
     * @returns {number|null} Current price as float, or null if unparseable / free
     */
    getSteamPriceFromDOM(appId) {
      try {
        // 1. Check schema.org meta tag in page head/body
        const metaPrice = document.querySelector('meta[itemprop="price"]');
        if (metaPrice && metaPrice.content) {
          const val = parseFloat(metaPrice.content);
          if (!isNaN(val) && val >= 0) return val;
        }

        // 2. Target specific game purchase container matching this exact App ID
        const targetBox = appId ? document.querySelector(`.game_area_purchase_game[data-ds-appid="${appId}"]`) : null;
        const purchaseContainer = targetBox || 
                                  document.querySelector('.game_area_purchase_game') || 
                                  document.querySelector('.game_area_purchase') || 
                                  document.body;

        // Try final discount price first, then normal purchase price
        const priceEl = purchaseContainer.querySelector('.discount_final_price') ||
                        purchaseContainer.querySelector('.game_purchase_price.price') ||
                        purchaseContainer.querySelector('.game_purchase_price');

        if (!priceEl) return null;

        const text = priceEl.textContent.trim();
        if (/free|ücretsiz|demo/i.test(text)) return 0;

        // Normalize currency text e.g. "$19.99", "19,99 USD", "19.99€"
        // Replace commas used as decimal separators (e.g. 19,99 -> 19.99)
        const match = text.match(/[\d]+([.,][\d]{2})?/);
        if (match) {
          const rawNum = match[0].replace(',', '.');
          const val = parseFloat(rawNum);
          return isNaN(val) ? null : val;
        }
      } catch (e) {
        console.warn('[SteamLens AI] Could not parse Steam price from DOM:', e);
      }
      return null;
    }

    /**
     * Resolves the most accurate Steam price: official API first, DOM fallback second.
     * 
     * @param {string|number} appId - Steam App ID
     * @param {string} lang - UI language code ('tr' or 'en')
     * @returns {Promise<number|null>} Resolved Steam price
     */
    async getSteamPrice(appId, lang = 'tr') {
      const cc = this.resolveCountryCode(lang);

      // 1. Primary: Official Steam Store API with region-specific pricing
      const apiPrice = await this.getSteamPriceFromAPI(appId, cc);
      if (apiPrice !== null) {
        return apiPrice;
      }

      // 2. Fallback: Scoped DOM parsing
      return this.getSteamPriceFromDOM(appId);
    }

    /**
     * Creates a clean fallback object when no deal or error occurs.
     */
    createFallback(gameTitle) {
      const searchUrl = this.getHumbleSearchUrl(gameTitle);
      return {
        hasDeal: false,
        storeId: '11',
        storeName: 'Humble Store',
        salePrice: null,
        salePriceFormatted: null,
        normalPrice: null,
        normalPriceFormatted: null,
        savingsPercent: 0,
        steamPrice: null,
        steamPriceFormatted: null,
        isCheaperThanSteam: false,
        savingsVsSteamPercent: 0,
        savingsVsSteamAmount: '0.00',
        dealUrl: searchUrl
      };
    }

    /**
     * Fetches real-time Humble Store deal for a single Steam AppID.
     * Verifies if Humble is strictly cheaper than Steam's regional price (MENA-USD or US-USD).
     * 
     * @param {string|number} appId - Steam App ID
     * @param {string} gameTitle - Name of the game
     * @param {string} lang - Active language code ('tr' or 'en')
     * @returns {Promise<object>} Deal metadata object
     */
    async getBestDeal(appId, gameTitle, lang = 'tr') {
      if (!appId) return null;

      const idStr = String(appId);
      const cc = this.resolveCountryCode(lang);
      const cacheKey = `${idStr}_${cc}`;
      const now = Date.now();

      // 1. Check in-memory cache
      if (this.memoryCache.has(cacheKey)) {
        const cached = this.memoryCache.get(cacheKey);
        if (now - cached.timestamp < DEALS_CONFIG.cacheDurationMs) {
          return cached.deal;
        }
      }

      // 2. Check chrome.storage.local cache
      const storageKey = `steamlens_deal_${cacheKey}`;
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const stored = await chrome.storage.local.get(storageKey);
          if (stored[storageKey] && (now - stored[storageKey].timestamp < DEALS_CONFIG.cacheDurationMs)) {
            const deal = stored[storageKey].deal;
            if (deal) {
              deal.dealUrl = this.getHumbleSearchUrl(gameTitle);
              this.memoryCache.set(cacheKey, { deal, timestamp: stored[storageKey].timestamp });
              return deal;
            }
          }
        }
      } catch {}

      const fallback = this.createFallback(gameTitle);

      // 3. Rate-limit backoff check
      if (now < this.rateLimitBackoffUntil) {
        return fallback;
      }

      // 4. Fetch authoritative Steam price for this region
      const steamPrice = await this.getSteamPrice(appId, lang);

      // 5. Fetch fresh deal from CheapShark API for Humble Store (storeID=11)
      try {
        const url = `https://www.cheapshark.com/api/1.0/deals?steamAppID=${idStr}&storeID=11&pageSize=5`;
        const response = await fetch(url);

        if (response.status === 429) {
          // 429 Silent backoff for 3 minutes
          this.rateLimitBackoffUntil = Date.now() + (3 * 60 * 1000);
          try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
              chrome.storage.local.set({ steamlens_deals_backoff_until: this.rateLimitBackoffUntil });
            }
          } catch {}
          return fallback;
        }

        if (!response.ok) {
          return fallback;
        }

        const data = await response.json();
        const directHumbleUrl = this.getHumbleSearchUrl(gameTitle);

        if (Array.isArray(data) && data.length > 0) {
          // Find deal matching Humble Store
          const matched = data.find(d => String(d.storeID) === '11') || data[0];

          const salePrice = parseFloat(matched.salePrice);
          const normalPrice = parseFloat(matched.normalPrice || matched.salePrice);
          const savings = Math.round(parseFloat(matched.savings || '0'));

          let isCheaper = false;
          let savingsVsSteamAmount = '0.00';
          let savingsVsSteamPercent = savings;

          if (steamPrice !== null && !isNaN(salePrice)) {
            // Is Humble price strictly cheaper than Steam's region-specific price?
            isCheaper = salePrice < (steamPrice - 0.05);
            if (isCheaper && steamPrice > 0) {
              savingsVsSteamAmount = (steamPrice - salePrice).toFixed(2);
              savingsVsSteamPercent = Math.round(((steamPrice - salePrice) / steamPrice) * 100);
            }
          } else if (savings > 0) {
            // Fallback when Steam price cannot be determined
            isCheaper = true;
          }

          const resolvedDeal = {
            hasDeal: true,
            storeId: '11',
            storeName: 'Humble Store',
            salePrice: isNaN(salePrice) ? null : salePrice,
            salePriceFormatted: isNaN(salePrice) ? null : `$${salePrice.toFixed(2)}`,
            normalPrice: isNaN(normalPrice) ? null : normalPrice,
            normalPriceFormatted: isNaN(normalPrice) ? null : `$${normalPrice.toFixed(2)}`,
            savingsPercent: savings,
            steamPrice: steamPrice,
            steamPriceFormatted: steamPrice !== null ? `$${steamPrice.toFixed(2)}` : null,
            isCheaperThanSteam: isCheaper,
            savingsVsSteamPercent: savingsVsSteamPercent,
            savingsVsSteamAmount: savingsVsSteamAmount,
            dealUrl: directHumbleUrl
          };

          // Cache in memory and chrome.storage.local with region-specific key
          this.memoryCache.set(cacheKey, { deal: resolvedDeal, timestamp: now });
          try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
              await chrome.storage.local.set({
                [storageKey]: { deal: resolvedDeal, timestamp: now }
              });
            }
          } catch {}

          return resolvedDeal;
        } else {
          // No deal on Humble Store, cache fallback
          this.memoryCache.set(cacheKey, { deal: fallback, timestamp: now });
          try {
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
              await chrome.storage.local.set({
                [storageKey]: { deal: fallback, timestamp: now }
              });
            }
          } catch {}
          return fallback;
        }
      } catch (err) {
        console.warn('[SteamLens AI] Deals API fetch error:', err);
        return fallback;
      }
    }
  }

  // Export to isolated content script window
  if (typeof window !== 'undefined') {
    window.DealsApiClient = new DealsApiClient();
  }
})();
