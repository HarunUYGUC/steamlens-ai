/**
 * SteamLens AI — Popup Controller
 * Manages preferences, language switching, mode toggle switch, API key validation, and cache.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const i18n = window.SteamLensI18n;

  // Elements
  const engineStatusPill = document.getElementById('engine-status-pill');
  const engineStatusDesc = document.getElementById('engine-status-desc');
  const btnModeRule = document.getElementById('btn-mode-rule');
  const btnModeGemini = document.getElementById('btn-mode-gemini');
  const prefUiLanguage = document.getElementById('pref-ui-language');
  const prefLanguage = document.getElementById('pref-language');
  const prefLimit = document.getElementById('pref-limit');
  const geminiKeyInput = document.getElementById('gemini-key');
  const btnToggleKey = document.getElementById('btn-toggle-key');
  const btnTestKey = document.getElementById('btn-test-key');
  const keyTestHint = document.getElementById('key-test-hint');
  const btnSave = document.getElementById('btn-save');
  const btnDeleteKey = document.getElementById('btn-delete-key');
  const toastEl = document.getElementById('popup-toast');

  let activeEngineMode = 'rule'; // 'rule' or 'gemini'
  let verifiedModelName = '';
  let currentLanguage = 'tr'; // resolved language code ('tr' or 'en')

  // 0. Dynamic Version Display from manifest.json
  const versionBadge = document.getElementById('popup-version-badge');
  if (versionBadge && typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    versionBadge.textContent = `v${chrome.runtime.getManifest().version}`;
  }

  // 1. Load stored preferences & apply initial language
  await loadPreferences();

  // 2. Language switch handler (live update in popup)
  if (prefUiLanguage) {
    prefUiLanguage.addEventListener('change', () => {
      const selected = prefUiLanguage.value;
      currentLanguage = i18n ? i18n.resolveLanguage(selected) : (selected === 'tr' ? 'tr' : 'en');
      applyTranslations(currentLanguage);
      setEngineMode(activeEngineMode);
    });
  }

  // 3. Mode Toggle Click Handlers
  btnModeRule.addEventListener('click', () => {
    setEngineMode('rule');
  });

  btnModeGemini.addEventListener('click', () => {
    setEngineMode('gemini');
  });

  function setEngineMode(mode) {
    activeEngineMode = mode;
    const t = (k, p) => i18n ? i18n.t(k, currentLanguage, p) : k;

    if (mode === 'rule') {
      btnModeRule.classList.add('active');
      btnModeGemini.classList.remove('active');
      engineStatusPill.className = 'status-pill ready';
      engineStatusPill.textContent = t('badgeRuleNLP');
      engineStatusDesc.textContent = t('statusDescRule');
    } else {
      btnModeGemini.classList.add('active');
      btnModeRule.classList.remove('active');
      engineStatusPill.className = 'status-pill gemini';
      engineStatusPill.textContent = t('badgeGeminiAI');
      
      const hasKey = Boolean(geminiKeyInput.value.trim().length > 15);
      if (hasKey) {
        engineStatusDesc.textContent = t('statusDescGeminiActive', { model: verifiedModelName || 'Flash' });
      } else {
        engineStatusDesc.textContent = t('statusDescGeminiNoKey');
      }
    }
  }

  /**
   * Applies translations to all data-i18n elements in popup.html.
   */
  function applyTranslations(lang) {
    if (!i18n) return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translation = i18n.t(key, lang);
      if (!translation) return;

      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translation;
      } else if (key === 'geminiKeyHint') {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    });

    // Update tooltips and attributes
    if (btnToggleKey) btnToggleKey.title = i18n.t('btnToggleKeyTitle', lang);
    if (btnTestKey) btnTestKey.title = i18n.t('btnTestKeyTitle', lang);
    if (btnDeleteKey) btnDeleteKey.title = i18n.t('btnDeleteKeyTitle', lang);
    const promoLink = document.getElementById('promo-link');
    if (promoLink) promoLink.title = i18n.t('promoTitle', lang);
  }

  // 4. Toggle password visibility
  btnToggleKey.addEventListener('click', () => {
    if (geminiKeyInput.type === 'password') {
      geminiKeyInput.type = 'text';
      btnToggleKey.textContent = '🔒';
    } else {
      geminiKeyInput.type = 'password';
      btnToggleKey.textContent = '👁️';
    }
  });

  // 5. Test API Key
  btnTestKey.addEventListener('click', async () => {
    const key = geminiKeyInput.value.trim();
    const t = (k, p) => i18n ? i18n.t(k, currentLanguage, p) : k;

    if (!key) {
      keyTestHint.textContent = t('keyTestMissing');
      keyTestHint.style.color = '#ff5252';
      return;
    }

    keyTestHint.textContent = t('keyTestChecking');
    keyTestHint.style.color = '#66c0f4';
    btnTestKey.disabled = true;

    try {
      const result = await testGeminiApiKey(key);
      if (result.success) {
        verifiedModelName = result.model;
        keyTestHint.textContent = t('keyTestSuccess', { model: result.model });
        keyTestHint.style.color = '#a4d007';
        setEngineMode('gemini');

        // Automatically persist key, active model and Gemini mode
        try {
          await chrome.storage.local.set({
            geminiApiKey: key,
            activeModel: verifiedModelName,
            engineMode: 'gemini'
          });
          showToast(t('toastSaved'));
        } catch (storageErr) {
          console.warn('[SteamLens AI] Failed to auto-save key:', storageErr);
        }
      } else {
        keyTestHint.textContent = t('keyTestFailed', { error: result.message });
        keyTestHint.style.color = '#ff5252';
      }
    } catch (e) {
      keyTestHint.textContent = t('keyTestConnError', { error: e.message });
      keyTestHint.style.color = '#ff5252';
    } finally {
      btnTestKey.disabled = false;
    }
  });

  // 6. Save settings
  btnSave.addEventListener('click', async () => {
    const t = (k, p) => i18n ? i18n.t(k, currentLanguage, p) : k;

    const settings = {
      engineMode: activeEngineMode,
      uiLanguage: prefUiLanguage.value || 'auto',
      preferredLanguage: prefLanguage.value,
      reviewLimit: parseInt(prefLimit.value, 10) || 60,
      geminiApiKey: geminiKeyInput.value.trim(),
      activeModel: verifiedModelName || ''
    };

    try {
      await chrome.storage.local.set(settings);
      showToast(t('toastSaved'));
    } catch (e) {
      showToast(t('toastSaveError'));
      console.error(e);
    }
  });

  // 7. Delete API Key
  if (btnDeleteKey) {
    btnDeleteKey.addEventListener('click', async () => {
      const t = (k, p) => i18n ? i18n.t(k, currentLanguage, p) : k;
      geminiKeyInput.value = '';
      verifiedModelName = '';
      if (keyTestHint && i18n) {
        keyTestHint.innerHTML = i18n.t('geminiKeyHint', currentLanguage);
        keyTestHint.style.color = '';
      }
      try {
        await chrome.storage.local.remove(['geminiApiKey', 'activeModel']);
        setEngineMode('rule');
        showToast(t('toastKeyDeleted'));
      } catch (e) {
        showToast(t('toastKeyDeleted'));
      }
    });
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2200);
  }

  /**
   * Loads preferences from chrome.storage.local.
   */
  async function loadPreferences() {
    try {
      const data = await chrome.storage.local.get([
        'engineMode',
        'uiLanguage',
        'preferredLanguage',
        'reviewLimit',
        'geminiApiKey',
        'activeModel'
      ]);

      const storedUiLang = data.uiLanguage || 'auto';
      if (prefUiLanguage) prefUiLanguage.value = storedUiLang;
      currentLanguage = i18n ? i18n.resolveLanguage(storedUiLang) : 'en';
      applyTranslations(currentLanguage);

      if (data.preferredLanguage) prefLanguage.value = data.preferredLanguage;
      if (data.reviewLimit) prefLimit.value = String(data.reviewLimit);
      if (data.geminiApiKey) geminiKeyInput.value = data.geminiApiKey;
      if (data.activeModel) verifiedModelName = data.activeModel;

      const initialMode = data.engineMode || (data.geminiApiKey && data.geminiApiKey.length > 15 ? 'gemini' : 'rule');
      setEngineMode(initialMode);
    } catch (e) {
      console.warn('Could not load preferences:', e);
    }
  }
});

/**
 * Dynamically queries Google AI Studio, verifies key validity, and detects the best available model (<300ms).
 */
async function testGeminiApiKey(apiKey) {
  const cleanKey = apiKey.trim();

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const listRes = await fetch(listUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${listRes.status}`;
      return { success: false, message: errMsg };
    }

    const listData = await listRes.json();
    const models = listData.models || [];

    // Filter to valid Gemini models supporting generateContent (exclude TTS, Live audio, image models, and heavy reasoning 3.8 models)
    const geminiModels = models.filter(m => {
      if (!m.name || !m.supportedGenerationMethods || !m.supportedGenerationMethods.includes('generateContent')) {
        return false;
      }
      const lower = m.name.toLowerCase();
      if (!lower.includes('gemini')) return false;
      if (lower.includes('tts') || lower.includes('live') || lower.includes('image') || lower.includes('dialog') || lower.includes('3.8')) return false;
      return true;
    });

    if (geminiModels.length === 0) {
      return { success: false, message: 'Hesabınızda generateContent destekleyen Gemini modeli bulunamadı.' };
    }

    // Priority sort: fast and high-quota models first
    geminiModels.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      const score = (name) => {
        if (name.includes('3.6-flash')) return 130;
        if (name.includes('3.5-flash-lite')) return 125;
        if (name.includes('3.1-flash-lite')) return 120;
        if (name.includes('3.5-flash')) return 115;
        if (name.includes('3-flash')) return 110;
        if (name.includes('2.5-flash-lite')) return 100;
        if (name.includes('2.5-flash')) return 90;
        if (name.includes('flash-lite')) return 70;
        if (name.includes('flash')) return 60;
        return 10;
      };

      return score(bName) - score(aName);
    });

    // Pick top verified model in user's account
    const bestModel = geminiModels[0];
    const shortName = bestModel.name.replace('models/', '');
    return { success: true, model: shortName, modelResource: bestModel.name };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, message: 'Google sunucusu zaman aşımına uğradı (Timeout).' };
    }
    return { success: false, message: `Bağlantı hatası: ${err.message}` };
  }
}
