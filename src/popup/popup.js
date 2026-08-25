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
  const btnClearCache = document.getElementById('btn-clear-cache');
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
      } else if (key === 'geminiKeyHint' || key === 'quickGuideText') {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    });

    // Update tooltips and attributes
    if (btnToggleKey) btnToggleKey.title = i18n.t('btnToggleKeyTitle', lang);
    if (btnTestKey) btnTestKey.title = i18n.t('btnTestKeyTitle', lang);
    if (btnClearCache) btnClearCache.title = i18n.t('btnClearCacheTitle', lang);
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

  // 7. Clear cache
  btnClearCache.addEventListener('click', async () => {
    const t = (k, p) => i18n ? i18n.t(k, currentLanguage, p) : k;
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
      showToast(t('toastCacheCleared'));
    } catch (e) {
      showToast(t('toastCacheCleared'));
    }
  });

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
 * Dynamically queries Google AI Studio and tests available models until finding the active working one.
 */
async function testGeminiApiKey(apiKey) {
  const cleanKey = apiKey.trim();

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
    const listRes = await fetch(listUrl);

    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => null);
      const errMsg = errData?.error?.message || `HTTP ${listRes.status}`;
      return { success: false, message: `HTTP ${errMsg}` };
    }

    const listData = await listRes.json();
    const models = listData.models || [];

    const contentModels = models.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
    );

    if (contentModels.length === 0) {
      return { success: false, message: 'No suitable generateContent model found.' };
    }

    contentModels.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aName.includes('3.6-flash')) return -1;
      if (bName.includes('3.6-flash')) return 1;
      if (aName.includes('2.0-flash')) return -1;
      if (bName.includes('2.0-flash')) return 1;
      if (aName.includes('flash')) return -1;
      if (bName.includes('flash')) return 1;
      return 0;
    });

    let lastErrorMsg = '';

    for (const modelObj of contentModels) {
      const modelResourceName = modelObj.name;
      const testGenUrl = `https://generativelanguage.googleapis.com/v1beta/${modelResourceName}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      
      const payload = {
        contents: [{ parts: [{ text: 'Ping' }] }]
      };

      try {
        const genRes = await fetch(testGenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (genRes.ok) {
          const shortName = modelResourceName.replace('models/', '');
          return { success: true, model: shortName, modelResource: modelResourceName };
        }

        const genErrData = await genRes.json().catch(() => null);
        lastErrorMsg = genErrData?.error?.message || `HTTP ${genRes.status}`;
      } catch (err) {
        lastErrorMsg = err.message;
      }
    }

    return { success: false, message: `Model test failed: ${lastErrorMsg}` };
  } catch (err) {
    return { success: false, message: `Connection error: ${err.message}` };
  }
}
