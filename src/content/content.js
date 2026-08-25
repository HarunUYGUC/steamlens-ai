/**
 * SteamLens AI — Content Script UI & Page Integration
 * Manages DOM injection, SPA navigation detection, dynamic storage listeners,
 * multilingual UI rendering, and interactive report states.
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
      uiLanguage: 'auto',
      preferredLanguage: 'all',
      geminiApiKey: '',
      reviewLimit: 60
    }
  };

  /**
   * Helper to get active language code ('tr' or 'en').
   */
  function getLang() {
    if (window.SteamLensI18n) {
      return window.SteamLensI18n.resolveLanguage(state.settings.uiLanguage);
    }
    return (state.settings.uiLanguage === 'tr') ? 'tr' : 'en';
  }

  /**
   * Helper to get translated string for key in current language.
   */
  function t(key, params = {}) {
    if (window.SteamLensI18n) {
      return window.SteamLensI18n.t(key, getLang(), params);
    }
    return key;
  }

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
        'uiLanguage',
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
        let langChanged = false;

        if (changes.engineMode) {
          state.settings.engineMode = changes.engineMode.newValue;
          changed = true;
        }
        if (changes.uiLanguage) {
          state.settings.uiLanguage = changes.uiLanguage.newValue;
          changed = true;
          langChanged = true;
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
          updateTriggerButton();
          // If a report container exists and language changed, clear cache for current game and re-render if needed
          if (langChanged && state.currentAppId && state.cache.has(state.currentAppId)) {
            state.cache.delete(state.currentAppId);
            const container = document.getElementById('steamlens-container');
            if (container) {
              startAnalysis(true);
            }
          }
        }
      }
    });
  }

  /**
   * Updates trigger button label and badge dynamically without page reload.
   */
  function updateTriggerButton() {
    const btn = document.querySelector('.steamlens-trigger-btn');
    if (!btn) return;

    const isGemini = state.settings.engineMode === 'gemini' && Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.trim().length > 15);
    const badgeText = isGemini ? t('badgeGeminiAI') : t('badgeRuleNLP');
    const badgeClass = isGemini ? 'gemini' : 'rule';

    btn.innerHTML = `
      <span class="sl-btn-icon">🤖</span>
      <span>${escapeHtml(t('triggerButtonText'))}</span>
      <span class="sl-btn-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
    `;
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
      updateTriggerButton();
      return;
    }

    const targetContainer = findInjectionTarget();
    if (!targetContainer) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'steamlens-trigger-wrapper';

    const isGemini = state.settings.engineMode === 'gemini' && Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.trim().length > 15);
    const badgeText = isGemini ? t('badgeGeminiAI') : t('badgeRuleNLP');
    const badgeClass = isGemini ? 'gemini' : 'rule';

    const btn = document.createElement('button');
    btn.className = 'steamlens-trigger-btn';
    btn.type = 'button';
    btn.innerHTML = `
      <span class="sl-btn-icon">🤖</span>
      <span>${escapeHtml(t('triggerButtonText'))}</span>
      <span class="sl-btn-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
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
    renderLoading(t('loadingFetchAndFilter'));

    try {
      // 1. Fetch raw reviews
      const rawData = await window.SteamApiClient.fetchReviews(appId, {
        language: state.settings.preferredLanguage || 'all',
        numPerPage: state.settings.reviewLimit || 60
      });

      // 2. Preprocess & filter reviews
      const processedData = window.SteamApiClient.processReviews(rawData);

      if (processedData.validReviews.length === 0) {
        renderError(t('errorNoReviews'));
        state.isAnalyzing = false;
        return;
      }

      // 3. Run Analysis with selected engine mode & UI language
      const analysisResult = await window.SteamLensAIEngine.analyze(processedData, {
        engineMode: state.settings.engineMode || 'rule',
        uiLanguage: state.settings.uiLanguage || 'auto',
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
      renderError(t('errorGeneral', { error: err.message || 'Unknown error' }));
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
          <h3 class="sl-heading">${escapeHtml(t('loadingTitle'))}</h3>
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
              ${escapeHtml(t('reportTitle'))}
              <span class="sl-tier-badge ${tierClass}">${escapeHtml(tier)}</span>
            </h3>
          </div>
        </div>
        <div class="sl-header-actions">
          <button class="sl-action-btn" id="sl-copy-btn" title="${escapeHtml(t('btnCopy'))}">
            ${escapeHtml(t('btnCopy'))}
          </button>
          <button class="sl-action-btn" id="sl-refresh-btn" title="${escapeHtml(t('btnRefresh'))}">
            ${escapeHtml(t('btnRefresh'))}
          </button>
          <button class="sl-action-btn" id="sl-close-btn" title="${escapeHtml(t('btnClose'))}">
            ✕
          </button>
        </div>
      </div>

      <!-- Key Metrics Bar -->
      <div class="sl-metrics-grid">
        <div class="sl-metric-card">
          <span class="sl-metric-label">${escapeHtml(t('metricCommunityApproval'))}</span>
          <span class="sl-metric-val">
            <span style="color: ${positivePct >= 70 ? '#a4d007' : positivePct >= 50 ? '#ffc83b' : '#ff5252'};">
              %${positivePct}
            </span>
            <span style="font-size:12px; font-weight:400; color:#8f98a0;">(${stats?.positiveCount || 0}+ / ${stats?.negativeCount || 0}-)</span>
          </span>
        </div>

        <div class="sl-metric-card">
          <span class="sl-metric-label">${escapeHtml(t('metricOptimizationScore'))}</span>
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
          <span class="sl-metric-label">${escapeHtml(t('metricAvgPlaytime'))}</span>
          <span class="sl-metric-val">
            ⏱️ ${stats?.avgPlaytimeHours || 0} <span style="font-size:12px; font-weight:400; color:#8f98a0;">${escapeHtml(t('unitHours'))}</span>
          </span>
        </div>

        <div class="sl-metric-card">
          <span class="sl-metric-label">${escapeHtml(t('metricFilteredReviews'))}</span>
          <span class="sl-metric-val">
            🔍 ${finalValid} <span style="font-size:12px; font-weight:400; color:#8f98a0;">/ ${finalTotal}</span>
          </span>
        </div>
      </div>

      <!-- Verdict Banner -->
      <div class="sl-verdict-box">
        <strong>${escapeHtml(t('verdictTitle'))}</strong> ${escapeHtml(verdict)}
        <div style="margin-top:6px; font-size:12px; color:#a4d007;">
          ⚡ ${escapeHtml(optimizationSummary)}
        </div>
      </div>

      <!-- Categorized Details Grid -->
      <div class="sl-details-grid">
        <!-- Pros -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title pros">${escapeHtml(t('prosTitle'))}</h4>
          <ul class="sl-bullet-list">
            ${(pros || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')}
          </ul>
        </div>

        <!-- Cons -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title cons">${escapeHtml(t('consTitle'))}</h4>
          <ul class="sl-bullet-list">
            ${(cons || []).map(c => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>
      </div>

      <!-- Bottom Row Details -->
      <div class="sl-details-grid">
        <!-- Patch Impact -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title patch">${escapeHtml(t('patchTitle'))}</h4>
          <p class="sl-card-body">${escapeHtml(patchImpact || 'N/A')}</p>
        </div>

        <!-- Value Analysis -->
        <div class="sl-detail-card">
          <h4 class="sl-card-title value">${escapeHtml(t('valueTitle'))}</h4>
          <p class="sl-card-body">${escapeHtml(valueAnalysis || 'N/A')}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="sl-footer">
        <span>${escapeHtml(t('footerSummary'))}</span>
        <span>${escapeHtml(t('footerDisclaimer'))}</span>
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
      .trim() || 'Steam Game';
  }

  /**
   * Copies formatted markdown summary to user's clipboard in active language.
   */
  async function copySummaryToClipboard(data, btnElement) {
    const gameName = getGameTitle();
    const valid = data.validCount || data.stats?.validReviews?.length || 0;
    const total = data.totalFetched || 60;

    const text = `${t('clipboardHeader')}
${t('clipboardGame')} ${gameName}
${t('clipboardEngine')} ${data.tier}
━━━━━━━━━━━━━━━━━━━━
📊 ${t('metricCommunityApproval')}: %${data.stats?.positivePercentage || 0}
⚡ ${t('metricOptimizationScore')}: %${data.optimizationScore}/100
⏱️ ${t('metricAvgPlaytime')}: ${data.stats?.avgPlaytimeHours || 0} ${t('unitHours')}
🔍 ${t('metricFilteredReviews')}: ${valid} / ${total}

${t('verdictTitle')}
${data.verdict}
${data.optimizationSummary ? `⚡ ${data.optimizationSummary}` : ''}

${t('prosTitle')}:
${(data.pros || []).map(p => `• ${p}`).join('\n')}

${t('consTitle')}:
${(data.cons || []).map(c => `• ${c}`).join('\n')}

${t('patchTitle')}:
${data.patchImpact}

${t('valueTitle')}:
${data.valueAnalysis}
━━━━━━━━━━━━━━━━━━━━
${t('clipboardFooter')}`;

    try {
      await navigator.clipboard.writeText(text);
      if (btnElement) {
        const orig = btnElement.innerText;
        btnElement.innerText = t('btnCopied');
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
          <h3 class="sl-heading" style="color: #ff5252;">${escapeHtml(t('errorTitle'))}</h3>
        </div>
        <button class="sl-action-btn" id="sl-close-err-btn">✕</button>
      </div>
      <div style="font-size:13px; color:#d1dbe3; margin-bottom:16px; line-height:1.5;">
        ${escapeHtml(errorMessage)}
      </div>
      <button class="steamlens-trigger-btn" id="sl-retry-btn" style="padding:8px 16px; font-size:12px;">
        ${escapeHtml(t('btnRetry'))}
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
