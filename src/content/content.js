/**
 * SteamLens AI — Content Script UI & Page Integration
 * Manages DOM injection, SPA navigation detection, dynamic storage listeners, and interactive UI states.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__steamlens_injected) return;
  window.__steamlens_injected = true;

  const state = {
    currentAppId: null,
    cache: new Map(),
    isAnalyzing: false,
    settings: {
      engineMode: 'rule',
      preferredLanguage: 'all',
      geminiApiKey: '',
      reviewLimit: 60
    }
  };

  /**
   * Initializes content script, loads settings and starts observers.
   */
  async function init() {
    await loadSettings();
    checkAndInject();
    observeNavigation();
    listenToStorageChanges();
  }

  /**
   * Loads user preferences from chrome.storage.local.
   */
  async function loadSettings() {
    try {
      const stored = await chrome.storage.local.get([
        'engineMode',
        'preferredLanguage',
        'geminiApiKey',
        'reviewLimit'
      ]);
      if (stored) {
        state.settings = { ...state.settings, ...stored };
      }
    } catch (e) {
      console.warn('[SteamLens AI] Could not load storage settings:', e);
    }
  }

  /**
   * Listens to real-time storage changes (e.g. from popup) to update UI immediately.
   */
  function listenToStorageChanges() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        let changed = false;
        if (changes.engineMode) {
          state.settings.engineMode = changes.engineMode.newValue;
          changed = true;
        }
        if (changes.geminiApiKey) {
          state.settings.geminiApiKey = changes.geminiApiKey.newValue;
          changed = true;
        }
        if (changes.preferredLanguage) {
          state.settings.preferredLanguage = changes.preferredLanguage.newValue;
        }
        if (changes.reviewLimit) {
          state.settings.reviewLimit = changes.reviewLimit.newValue;
        }

        if (changed) {
          updateTriggerButtonBadge();
        }
      }
    });
  }

  /**
   * Updates trigger button badge dynamically without page reload.
   */
  function updateTriggerButtonBadge() {
    const badgeEl = document.querySelector('.steamlens-trigger-btn .sl-btn-badge');
    if (badgeEl) {
      const isGemini = state.settings.engineMode === 'gemini' && Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.trim().length > 15);
      badgeEl.textContent = isGemini ? '⚡ Gemini AI' : '🚀 Hızlı NLP';
      badgeEl.className = `sl-btn-badge ${isGemini ? 'gemini' : 'rule'}`;
    }
  }

  /**
   * Detects current App ID and injects the trigger button if on a game page.
   */
  function checkAndInject() {
    const appId = window.SteamApiClient ? window.SteamApiClient.getAppIdFromUrl() : null;
    if (!appId) {
      removeInjectedElements();
      state.currentAppId = null;
      return;
    }

    if (state.currentAppId !== appId) {
      state.currentAppId = appId;
      removeInjectedElements();
    }

    injectTriggerButton();
  }

  /**
   * Injects the SteamLens AI trigger button above the purchase area.
   */
  function injectTriggerButton() {
    if (document.getElementById('steamlens-trigger-wrapper')) {
      updateTriggerButtonBadge();
      return;
    }

    const targetContainer = findInjectionTarget();
    if (!targetContainer) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'steamlens-trigger-wrapper';

    const isGemini = state.settings.engineMode === 'gemini' && Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.trim().length > 15);
    const badgeText = isGemini ? '⚡ Gemini AI' : '🚀 Hızlı NLP';
    const badgeClass = isGemini ? 'gemini' : 'rule';

    const btn = document.createElement('button');
    btn.className = 'steamlens-trigger-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <span class="sl-btn-icon">🤖</span>
      <span>SteamLens AI ile İncelemeleri Özetle</span>
      <span class="sl-btn-badge ${badgeClass}">${badgeText}</span>
    `;

    btn.addEventListener('click', () => {
      startAnalysis(false);
    });

    wrapper.appendChild(btn);
    targetContainer.parentNode.insertBefore(wrapper, targetContainer);
  }

  /**
   * Locates the best insertion anchor on the Steam Store DOM.
   */
  function findInjectionTarget() {
    return (
      document.querySelector('.game_area_purchase') ||
      document.getElementById('game_area_purchase') ||
      document.getElementById('game_highlights') ||
      document.getElementById('userReviews') ||
      document.querySelector('.user_reviews')
    );
  }

  /**
   * Removes injected UI elements when navigating away from game pages.
   */
  function removeInjectedElements() {
    const btn = document.getElementById('steamlens-trigger-wrapper');
    if (btn) btn.remove();
    const container = document.getElementById('steamlens-container');
    if (container) container.remove();
  }

  /**
   * Watches for dynamic SPA navigation and DOM changes on Steam with debouncing.
   */
  function observeNavigation() {
    let lastUrl = window.location.href;
    let debounceTimer = null;

    const observer = new MutationObserver(() => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          checkAndInject();
        } else if (!document.getElementById('steamlens-trigger-wrapper')) {
          checkAndInject();
        }
      }, 350);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('popstate', () => {
      checkAndInject();
    });
  }

  /**
   * Starts the analysis pipeline.
   * @param {boolean} forceFresh - If true, ignores in-memory cache
   */
  async function startAnalysis(forceFresh = false) {
    if (state.isAnalyzing) return;
    const appId = state.currentAppId;
    if (!appId) return;

    // Refresh latest settings
    await loadSettings();

    // Check cache
    if (!forceFresh && state.cache.has(appId)) {
      renderResult(state.cache.get(appId));
      return;
    }

    state.isAnalyzing = true;
    renderLoading('Steam incelemeleri çekiliyor ve spam/meme filtrelerinden geçiriliyor...');

    try {
      // 1. Fetch raw reviews
      const rawData = await window.SteamApiClient.fetchReviews(appId, {
        language: state.settings.preferredLanguage || 'all',
        numPerPage: state.settings.reviewLimit || 60
      });

      // 2. Preprocess & filter reviews
      const processedData = window.SteamApiClient.processReviews(rawData);

      if (processedData.validReviews.length === 0) {
        renderError('Bu oyun için yeterli inceleme bulunamadı veya tüm incelemeler filtreye takıldı.');
        state.isAnalyzing = false;
        return;
      }

      // 3. Run Analysis with selected engine mode
      const analysisResult = await window.SteamLensAIEngine.analyze(processedData, {
        engineMode: state.settings.engineMode || 'rule',
        geminiApiKey: state.settings.geminiApiKey,
        preferredLanguage: state.settings.preferredLanguage,
        onProgress: (prog) => {
          updateLoadingMessage(prog.message);
        }
      });

      // 4. Save to session cache & render
      state.cache.set(appId, analysisResult);
      renderResult(analysisResult);
    } catch (err) {
      console.error('[SteamLens AI] Analysis error:', err);
      renderError(`Analiz sırasında bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      state.isAnalyzing = false;
    }
  }

  /**
   * Renders loading skeleton.
   */
  function renderLoading(message) {
    let container = document.getElementById('steamlens-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'steamlens-container';
      const triggerWrapper = document.getElementById('steamlens-trigger-wrapper');
      if (triggerWrapper) {
        triggerWrapper.parentNode.insertBefore(container, triggerWrapper.nextSibling);
      } else {
        const target = findInjectionTarget();
        if (target) target.parentNode.insertBefore(container, target);
      }
    }

    container.innerHTML = `
      <div class="sl-header">
        <div class="sl-title-group">
          <div class="sl-logo">🤖</div>
          <h3 class="sl-heading">SteamLens AI <span style="font-size:12px; font-weight:400; color:#8f98a0;">(Analiz Ediliyor...)</span></h3>
        </div>
      </div>
      <div style="margin-bottom:16px; font-size:13px; color:#66c0f4;" id="sl-loading-msg">
        ⏳ ${escapeHtml(message)}
      </div>
      <div class="sl-skeleton sl-skeleton-title"></div>
      <div class="sl-skeleton sl-skeleton-box"></div>
      <div class="sl-details-grid">
        <div class="sl-skeleton sl-skeleton-box" style="height:110px;"></div>
        <div class="sl-skeleton sl-skeleton-box" style="height:110px;"></div>
      </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updateLoadingMessage(msg) {
    const el = document.getElementById('sl-loading-msg');
    if (el) el.innerHTML = `⏳ ${escapeHtml(msg)}`;
  }

  /**
   * Renders the complete analysis report card.
   */
  function renderResult(data) {
    let container = document.getElementById('steamlens-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'steamlens-container';
      const triggerWrapper = document.getElementById('steamlens-trigger-wrapper');
      if (triggerWrapper) {
        triggerWrapper.parentNode.insertBefore(container, triggerWrapper.nextSibling);
      } else {
        const target = findInjectionTarget();
        if (target) target.parentNode.insertBefore(container, target);
      }
    }

    const { stats, tier, tierCode, verdict, optimizationScore, optimizationSummary, pros, cons, patchImpact, valueAnalysis, totalFetched, validCount } = data;

    let tierClass = 'rule';
    if (tierCode === 'cloud') tierClass = 'cloud';

    let optScoreClass = 'good';
    if (optimizationScore < 60) optScoreClass = 'bad';
    else if (optimizationScore < 75) optScoreClass = 'med';

    const positivePct = stats?.positivePercentage || 0;
    const finalValid = validCount || data.stats?.validReviews?.length || (stats?.positiveCount + stats?.negativeCount) || 0;
    const finalTotal = totalFetched || state.settings.reviewLimit || 60;

    container.innerHTML = `
      <!-- Header -->
      <div class="sl-header">
        <div class="sl-title-group">
          <div class="sl-logo">🤖</div>
          <div>
            <h3 class="sl-heading">
              SteamLens AI Analiz Özeti
              <span class="sl-tier-badge ${tierClass}">${escapeHtml(tier)}</span>
            </h3>
          </div>
        </div>
        <div class="sl-header-actions">
          <button class="sl-action-btn" id="sl-copy-btn" title="Özeti panoya kopyala">
            📋 Kopyala
          </button>
          <button class="sl-action-btn" id="sl-refresh-btn" title="İncelemeleri yeniden çek ve analiz et">
            🔄 Yenile
          </button>
          <button class="sl-action-btn" id="sl-close-btn" title="Kapat">
            ✕
          </button>
        </div>
      </div>

      <!-- Key Metrics Bar -->
      <div class="sl-metrics-grid">
        <div class="sl-metric-card">
          <span class="sl-metric-label">Topluluk Onayı</span>
          <span class="sl-metric-val">
            <span style="color: ${positivePct >= 70 ? '#a4d007' : positivePct >= 50 ? '#ffc83b' : '#ff5252'};">
              %${positivePct}
            </span>
            <span style="font-size:12px; font-weight:400; color:#8f98a0;">(${stats?.positiveCount || 0}+ / ${stats?.negativeCount || 0}-)</span>
          </span>
        </div>

        <div class="sl-metric-card">
          <span class="sl-metric-label">Optimizasyon Skoru</span>
          <span class="sl-metric-val">
            <span style="color: ${optScoreClass === 'good' ? '#a4d007' : optScoreClass === 'med' ? '#ffc83b' : '#ff5252'};">
              %${optimizationScore}
            </span>
            <span style="font-size:11px; font-weight:400; color:#8f98a0;">/ 100</span>
          </span>
          <div class="sl-meter-container">
            <div class="sl-meter-fill ${optScoreClass}" style="width: ${optimizationScore}%;"></div>
          </div>
        </div>

        <div class="sl-metric-card">
          <span class="sl-metric-label">Ort. Oynanış Süresi</span>
          <span class="sl-metric-val">
            ⏱️ ${stats?.avgPlaytimeHours || 0} <span style="font-size:12px; font-weight:400; color:#8f98a0;">saat</span>
          </span>
        </div>

        <div class="sl-metric-card">
          <span class="sl-metric-label">Filtrelenmiş İnceleme</span>
          <span class="sl-metric-val">
            🔍 ${finalValid} <span style="font-size:12px; font-weight:400; color:#8f98a0;">/ ${finalTotal}</span>
          </span>
        </div>
      </div>

      <!-- Verdict Banner -->
      <div class="sl-verdict-box">
        <strong>💡 Genel Sonuç:</strong> ${escapeHtml(verdict)}
        <div style="margin-top:6px; font-size:12px; color:#a4d007;">
          ⚡ ${escapeHtml(optimizationSummary)}
        </div>
      </div>

      <!-- Categorized Details Grid -->
      <div class="sl-details-grid">
        <!-- Pros -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title pros">🟢 Güçlü Yönler</h4>
          <ul class="sl-bullet-list">
            ${(pros || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>

        <!-- Cons -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title cons">🔴 Kritik Sorunlar & Şikayetler</h4>
          <ul class="sl-bullet-list">
            ${(cons || []).map(c => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Bottom Row Details -->
      <div class="sl-details-grid">
        <!-- Patch Impact -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title patch">⚡ Son Güncellemeler & Yama Durumu</h4>
          <p class="sl-card-body">${escapeHtml(patchImpact || 'Veri bulunmuyor.')}</p>
        </div>

        <!-- Value Analysis -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title value">⏱️ Fiyat / Süre / Değer Analizi</h4>
          <p class="sl-card-body">${escapeHtml(valueAnalysis || 'Veri bulunmuyor.')}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="sl-footer">
        <span>SteamLens AI — Steam İnceleme Özeti</span>
        <span>Spam ve meme yorumlar filtrelenerek saf geri bildirim analiz edilir 🛡️</span>
      </div>
    `;

    // Event listeners
    container.querySelector('#sl-close-btn')?.addEventListener('click', () => {
      container.remove();
    });

    container.querySelector('#sl-refresh-btn')?.addEventListener('click', () => {
      startAnalysis(true);
    });

    container.querySelector('#sl-copy-btn')?.addEventListener('click', (e) => {
      copySummaryToClipboard(data, e.target);
    });
  }

  /**
   * Retrieves the game title from the Steam Store DOM.
   */
  function getGameTitle() {
    const el = document.getElementById('appHubAppName') || 
               document.querySelector('.apphub_AppName') || 
               document.querySelector('.game_name');
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
    const docTitle = document.title || '';
    return docTitle
      .replace(/ on Steam$/i, '')
      .replace(/ Steam'de$/i, '')
      .replace(/^Save \d+% on /i, '')
      .trim() || 'Steam Oyunu';
  }

  /**
   * Copies formatted markdown summary to user's clipboard.
   */
  async function copySummaryToClipboard(data, btnElement) {
    const gameName = getGameTitle();
    const valid = data.validCount || data.stats?.validReviews?.length || 0;
    const total = data.totalFetched || 60;

    const text = `🤖 SteamLens AI Analiz Özeti
🎮 Oyun: ${gameName}
🧠 Analiz Motoru: ${data.tier}
━━━━━━━━━━━━━━━━━━━━
📊 Topluluk Onayı: %${data.stats?.positivePercentage || 0}
⚡ Optimizasyon Skoru: %${data.optimizationScore}/100
⏱️ Ort. Oynanış: ${data.stats?.avgPlaytimeHours || 0} saat
🔍 Filtrelenmiş İnceleme: ${valid} / ${total}

💡 Genel Değerlendirme:
${data.verdict}
${data.optimizationSummary ? `⚡ ${data.optimizationSummary}` : ''}

🟢 Güçlü Yönler:
${(data.pros || []).map(p => `• ${p}`).join('\n')}

🔴 Kritik Sorunlar & Şikayetler:
${(data.cons || []).map(c => `• ${c}`).join('\n')}

⚡ Son Güncellemeler & Yama Durumu:
${data.patchImpact}

⏱️ Fiyat / Süre / Değer Analizi:
${data.valueAnalysis}
━━━━━━━━━━━━━━━━━━━━
SteamLens AI ile üretildi.`;

    try {
      await navigator.clipboard.writeText(text);
      if (btnElement) {
        const orig = btnElement.innerText;
        btnElement.innerText = '✅ Kopyalandı!';
        setTimeout(() => { btnElement.innerText = orig; }, 2000);
      }
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  }

  /**
   * Renders error card with retry button.
   */
  function renderError(errorMessage) {
    const container = document.getElementById('steamlens-container');
    if (!container) return;

    container.innerHTML = `
      <div class="sl-header">
        <div class="sl-title-group">
          <div class="sl-logo">⚠️</div>
          <h3 class="sl-heading" style="color: #ff5252;">Analiz Tamamlanamadı</h3>
        </div>
        <button class="sl-action-btn" id="sl-close-err-btn">✕</button>
      </div>
      <div style="font-size:13px; color:#d1dbe3; margin-bottom:16px; line-height:1.5;">
        ${escapeHtml(errorMessage)}
      </div>
      <button class="steamlens-trigger-btn" id="sl-retry-btn" style="padding:8px 16px; font-size:12px;">
        🔄 Yeniden Dene
      </button>
    `;

    container.querySelector('#sl-close-err-btn')?.addEventListener('click', () => {
      container.remove();
    });

    container.querySelector('#sl-retry-btn')?.addEventListener('click', () => {
      startAnalysis(true);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
