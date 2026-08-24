/**
 * SteamLens AI — Popup Controller
 * Manages preferences, mode toggle switch, API key validation, and cache.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const engineStatusPill = document.getElementById('engine-status-pill');
  const engineStatusDesc = document.getElementById('engine-status-desc');
  const btnModeRule = document.getElementById('btn-mode-rule');
  const btnModeGemini = document.getElementById('btn-mode-gemini');
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

  // 0. Dynamic Version Display from manifest.json
  const versionBadge = document.getElementById('popup-version-badge');
  if (versionBadge && typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
    versionBadge.textContent = `v${chrome.runtime.getManifest().version}`;
  }

  // 1. Load stored preferences
  await loadPreferences();

  // 2. Mode Toggle Click Handlers
  btnModeRule.addEventListener('click', () => {
    setEngineMode('rule');
  });

  btnModeGemini.addEventListener('click', () => {
    setEngineMode('gemini');
  });

  function setEngineMode(mode) {
    activeEngineMode = mode;
    if (mode === 'rule') {
      btnModeRule.classList.add('active');
      btnModeGemini.classList.remove('active');
      engineStatusPill.className = 'status-pill ready';
      engineStatusPill.textContent = '🚀 Hızlı NLP';
      engineStatusDesc.textContent = 'Ultra hızlı kural tabanlı analiz devrede. Donanımınızı yormaz, 0.01 sn içinde anında özet üretir.';
    } else {
      btnModeGemini.classList.add('active');
      btnModeRule.classList.remove('active');
      engineStatusPill.className = 'status-pill gemini';
      engineStatusPill.textContent = '⚡ Gemini AI';
      
      const hasKey = Boolean(geminiKeyInput.value.trim().length > 15);
      if (hasKey) {
        engineStatusDesc.textContent = `Google Gemini (${verifiedModelName || 'Flash'}) aktif. İncelemeler Google bulutunda akıllıca analiz edilir.`;
      } else {
        engineStatusDesc.textContent = '⚠️ Gemini modu seçildi. Lütfen aşağıya ücretsiz Google AI Studio API anahtarınızı girip kaydedin.';
      }
    }
  }

  // 3. Toggle password visibility
  btnToggleKey.addEventListener('click', () => {
    if (geminiKeyInput.type === 'password') {
      geminiKeyInput.type = 'text';
      btnToggleKey.textContent = '🔒';
    } else {
      geminiKeyInput.type = 'password';
      btnToggleKey.textContent = '👁️';
    }
  });

  // 4. Test API Key
  btnTestKey.addEventListener('click', async () => {
    const key = geminiKeyInput.value.trim();
    if (!key) {
      keyTestHint.textContent = '⚠️ Lütfen önce bir API anahtarı girin.';
      keyTestHint.style.color = '#ff5252';
      return;
    }

    keyTestHint.textContent = '⏳ Google AI Studio ile doğrulanıyor...';
    keyTestHint.style.color = '#66c0f4';
    btnTestKey.disabled = true;

    try {
      const result = await testGeminiApiKey(key);
      if (result.success) {
        verifiedModelName = result.model;
        keyTestHint.textContent = `✅ API Anahtarı geçerli ve çalışıyor! (${result.model} Aktif)`;
        keyTestHint.style.color = '#a4d007';
        setEngineMode('gemini');
      } else {
        keyTestHint.textContent = `❌ ${result.message}`;
        keyTestHint.style.color = '#ff5252';
      }
    } catch (e) {
      keyTestHint.textContent = `❌ Bağlantı hatası: ${e.message}`;
      keyTestHint.style.color = '#ff5252';
    } finally {
      btnTestKey.disabled = false;
    }
  });

  // 5. Save settings
  btnSave.addEventListener('click', async () => {
    const settings = {
      engineMode: activeEngineMode,
      preferredLanguage: prefLanguage.value,
      reviewLimit: parseInt(prefLimit.value, 10) || 60,
      geminiApiKey: geminiKeyInput.value.trim(),
      activeModel: verifiedModelName || ''
    };

    try {
      await chrome.storage.local.set(settings);
      showToast('✅ Ayarlar başarıyla kaydedildi!');
    } catch (e) {
      showToast('❌ Ayarlar kaydedilemedi.');
      console.error(e);
    }
  });

  // 6. Clear cache
  btnClearCache.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' });
      showToast('🗑️ Analiz önbelleği temizlendi!');
    } catch (e) {
      showToast('Önbellek temizlendi.');
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
        'preferredLanguage',
        'reviewLimit',
        'geminiApiKey',
        'activeModel'
      ]);

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
      return { success: false, message: `Doğrulama başarısız: ${errMsg}` };
    }

    const listData = await listRes.json();
    const models = listData.models || [];

    const contentModels = models.filter(m => 
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
    );

    if (contentModels.length === 0) {
      return { success: false, message: 'Bu anahtar için uygun içerik üretim modeli bulunamadı.' };
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

    return { success: false, message: `Model testi başarısız: ${lastErrorMsg}` };
  } catch (err) {
    return { success: false, message: `Bağlantı hatası: ${err.message}` };
  }
}
