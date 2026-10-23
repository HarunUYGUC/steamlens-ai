/**
 * SteamLens AI — Steam API & Review Preprocessing Engine
 * Responsible for fetching reviews from Steam's public API, filtering spam/memes,
 * cleaning BBCode/ASCII, and extracting core metrics.
 */

class SteamApiClient {
  /**
   * Extracts Steam App ID from a URL or current window location.
   * Example: https://store.steampowered.com/app/1091500/Cyberpunk_2077/ -> 1091500
   */
  static getAppIdFromUrl(url = window.location.href) {
    try {
      const match = url.match(/\/app\/(\d+)/i);
      return match ? match[1] : null;
    } catch (e) {
      console.warn('[SteamLens AI] Error extracting App ID:', e);
      return null;
    }
  }

  /**
   * Fetches recent reviews from Steam's public Web API.
   * @param {string|number} appId 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  static async fetchReviews(appId, options = {}) {
    // 1. Primary: Route via background service worker to bypass CORS and redirects
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      try {
        const swResponse = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { type: 'FETCH_STEAM_REVIEWS', appId, options },
            (res) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(res);
              }
            }
          );
        });

        if (swResponse && swResponse.success && swResponse.data) {
          return swResponse.data;
        }
      } catch (swErr) {
        console.warn('[SteamLens AI] SW fetch failed, attempting direct fetch:', swErr);
      }
    }

    // 2. Fallback: Direct WebAPI fetch to official IUserReviewsService endpoint
    const {
      filter = 'recent',
      language = 'all',
      numPerPage = 60,
      purchaseType = 'all'
    } = options;

    const queryParams = new URLSearchParams({
      appid: String(appId),
      filter: filter,
      language: language,
      num_per_page: Math.min(100, Math.max(20, numPerPage)).toString(),
      purchase_type: purchaseType,
      review_type: 'all',
      cursor: '*'
    });

    const endpoint = `https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?${queryParams.toString()}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Steam API responded with HTTP ${response.status}`);
      }

      const data = await response.json();
      const payload = data.response || data;
      return payload;
    } catch (error) {
      console.error('[SteamLens AI] Failed to fetch reviews:', error);
      throw error;
    }
  }

  /**
   * Cleans BBCode, HTML entities, and ASCII copypastas from review text.
   * @param {string} rawText 
   * @returns {string}
   */
  static cleanReviewText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText;

    // 1. Remove Steam BBCode tags
    text = text
      .replace(/\[\/?(b|i|u|strike|h[1-6]|code|quote|spoiler|list|\*|table|tr|th|td|hr|previewyoutube)\]/gi, ' ')
      .replace(/\[url=[^\]]*\]/gi, ' ')
      .replace(/\[\/url\]/gi, ' ')
      .replace(/\[img\][\s\S]*?\[\/img\]/gi, ' ')
      .replace(/\[noparse\][\s\S]*?\[\/noparse\]/gi, ' ');

    // 2. Decode common HTML entities
    text = text
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    // 3. Remove ASCII Art and unicode symbol spam (e.g. ░, █, ▄, ▀, ⣿, ⠄, ⠆)
    text = text.replace(/[\u2580-\u259F\u2800-\u28FF\u2500-\u257F]+/g, ' ');

    // 4. Remove excessive consecutive duplicate characters (e.g. "sooooo baaaaad!!!!!!" -> "soo baad!!")
    text = text.replace(/(.)\1{4,}/g, '$1$1');

    // 5. Normalize whitespace and newlines
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    return text;
  }

  /**
   * Detects if a review is a useless meme, ASCII art, or copypasta.
   * @param {string} cleanedText 
   * @returns {boolean}
   */
  static isMemeOrSpam(cleanedText) {
    if (!cleanedText || cleanedText.length < 20) return true;

    const lower = cleanedText.toLowerCase().trim();

    // Common short meme phrases
    const memePatterns = [
      /^(10\/10|100\/10|11\/10|0\/10|1\/10|10\\10)$/i,
      /^(yes|no|good|bad|nice|trash|goat|masterpiece|recommended|not recommended|meh|ok|okay|fun|boring)$/i,
      /^(\+rep|-rep|like|dislike|buy it|dont buy|don't buy|skip)$/i,
      /^(goty|best game ever|worst game ever|rip|fix the game|dead game)$/i,
      /^(helldivers|amogus|among us|morbius|sigma|skibidi|shrek|cat|dog)$/i,
      /^(this is a story of|father went to get milk|my wife left me|my girlfriend left me)/i,
      /(please like this review|farming steam points|award this review|points please)/i
    ];

    if (memePatterns.some(p => p.test(lower))) {
      return true;
    }

    // Check for repetitive lines (copypasta checklist)
    const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 4) {
      const checkCount = (cleanedText.match(/(\[ \]|\[x\]|---)/gi) || []).length;
      if (checkCount >= 5) {
        // Copypasta rating list (Graphics: --- [x] Good [ ] Bad ...)
        return false; // Still contains signal, allowed if structured
      }
    }

    // Ratio of alphanumeric to total characters (filter out pure punctuation spam)
    const alphaCount = (cleanedText.match(/[\p{L}\p{N}]/gu) || []).length;
    if (alphaCount / cleanedText.length < 0.45) {
      return true;
    }

    return false;
  }

  /**
   * Filters, cleans, and packages raw reviews into high-signal datasets.
   * @param {Object} rawData - Response from Steam API
   * @returns {Object}
   */
  static processReviews(rawData) {
    const payload = rawData?.response || rawData;
    if (!payload || !Array.isArray(payload.reviews)) {
      return {
        querySummary: payload?.query_summary || {},
        totalFetched: 0,
        validReviews: [],
        stats: {
          positiveCount: 0,
          negativeCount: 0,
          positivePercentage: 0,
          avgPlaytimeHours: 0
        }
      };
    }

    const querySummary = payload.query_summary || {};
    const validReviews = [];
    let positiveCount = 0;
    let negativeCount = 0;
    let totalPlaytimeMinutes = 0;

    for (const r of payload.reviews) {
      const cleaned = this.cleanReviewText(r.review);

      if (this.isMemeOrSpam(cleaned)) {
        continue;
      }

      const isPositive = Boolean(r.voted_up);
      if (isPositive) positiveCount++;
      else negativeCount++;

      const playtimeForever = r.author?.playtime_forever || 0;
      totalPlaytimeMinutes += playtimeForever;

      validReviews.push({
        id: r.recommendationid,
        votedUp: isPositive,
        playtimeHours: Math.round((playtimeForever / 60) * 10) / 10,
        playtimeAtReviewHours: Math.round(((r.author?.playtime_at_review || 0) / 60) * 10) / 10,
        votesUp: r.votes_up || 0,
        votesFunny: r.votes_funny || 0,
        weightedVoteScore: r.weighted_vote_score || 0,
        writtenDuringEarlyAccess: Boolean(r.written_during_early_access),
        receivedForFree: Boolean(r.received_for_free),
        timestampCreated: r.timestamp_created,
        timestampUpdated: r.timestamp_updated,
        text: cleaned
      });
    }

    // Sort valid reviews by weighted vote score / helpfulness
    validReviews.sort((a, b) => b.weightedVoteScore - a.weightedVoteScore);

    const totalValid = validReviews.length;
    const positivePercentage = totalValid > 0 ? Math.round((positiveCount / totalValid) * 100) : (
      querySummary.total_reviews > 0 ? Math.round((querySummary.total_positive / querySummary.total_reviews) * 100) : 0
    );

    const avgPlaytimeHours = totalValid > 0 ? Math.round((totalPlaytimeMinutes / totalValid / 60) * 10) / 10 : 0;

    return {
      querySummary,
      totalFetched: payload.reviews ? payload.reviews.length : 0,
      validCount: totalValid,
      validReviews,
      stats: {
        positiveCount,
        negativeCount,
        positivePercentage,
        avgPlaytimeHours,
        steamScoreDesc: querySummary.review_score_desc || 'Bilinmiyor'
      }
    };
  }
}

// Attach to window / global scope for content scripts
if (typeof window !== 'undefined') {
  window.SteamApiClient = SteamApiClient;
}
