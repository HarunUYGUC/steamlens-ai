/**
 * SteamLens AI — Shared i18n & Localization Module
 * Provides unified translation dictionary, auto language resolver, and message formatting.
 */

(function () {
  'use strict';

  const translations = {
    tr: {
      // General & Brand
      brandTitle: 'SteamLens AI',
      brandSubtitle: 'Steam İnceleme Özeti',
      
      // Popup - Engine Section
      activeEngineLabel: '⚡ Aktif Analiz Motoru',
      badgeRuleNLP: '🚀 Hızlı NLP',
      badgeGeminiAI: '⚡ Gemini AI',
      btnModeRule: '🚀 Kural Tabanlı (Hızlı)',
      btnModeGemini: '⚡ Gemini AI (Bulut)',
      statusDescRule: 'Ultra hızlı kural tabanlı analiz devrede. Donanımınızı yormaz, 0.01 sn içinde anında özet üretir.',
      statusDescGeminiActive: 'Google Gemini ({model}) aktif. İncelemeler Google bulutunda akıllıca analiz edilir.',
      statusDescGeminiNoKey: '⚠️ Gemini modu seçildi. Lütfen aşağıya ücretsiz Google AI Studio API anahtarınızı girip kaydedin.',
      
      // Popup - Settings Section
      settingsHeading: '⚙️ Tercihler & Ayarlar',
      prefUiLanguageLabel: 'Arayüz ve Çıktı Dili',
      prefUiLangAuto: '🌐 Otomatik (Tarayıcı Dili)',
      prefUiLangTr: '🇹🇷 Türkçe',
      prefUiLangEn: '🇬🇧 English',
      
      prefReviewLanguageLabel: 'Taranacak İnceleme Dili',
      prefReviewLangAll: '🌐 Tüm Diller (Önerilen)',
      prefReviewLangTr: '🇹🇷 Yalnızca Türkçe',
      prefReviewLangEn: '🇬🇧 Yalnızca İngilizce',
      
      prefLimitLabel: 'Taranacak İnceleme Sayısı',
      prefLimit40: '40 İnceleme (En Hızlı)',
      prefLimit60: '60 İnceleme (Dengeli)',
      prefLimit80: '80 İnceleme (Kapsamlı)',
      prefLimit100: '100 İnceleme (Maksimum Detay)',
      
      geminiKeyLabel: 'Google Gemini API Anahtarı',
      geminiKeyBadge: 'Gemini Modu İçin',
      geminiKeyHint: 'Bulut AI için <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#66c0f4;">Google AI Studio</a>\'dan ücretsiz anahtar alabilirsiniz.',
      btnToggleKeyTitle: 'Göster/Gizle',
      btnTestKeyTitle: 'Test Et',
      btnTestKeyText: 'Test',
      
      keyTestMissing: '⚠️ Lütfen önce bir API anahtarı girin.',
      keyTestChecking: '⏳ Google AI Studio ile doğrulanıyor...',
      keyTestSuccess: '✅ API Anahtarı geçerli ve çalışıyor! ({model} Aktif)',
      keyTestFailed: '❌ Doğrulama başarısız: {error}',
      keyTestConnError: '❌ Bağlantı hatası: {error}',
      
      btnSave: '💾 Ayarları Kaydet',
      btnClearCache: '🗑️ Sıfırla',
      btnClearCacheTitle: 'Önbelleği temizle',
      
      toastSaved: '✅ Ayarlar başarıyla kaydedildi!',
      toastSaveError: '❌ Ayarlar kaydedilemedi.',
      toastCacheCleared: '🗑️ Analiz önbelleği temizlendi!',
      
      quickGuideText: '🎮 <strong>Kullanım:</strong> İstediğiniz zaman yukarıdaki butonla <strong>Kural Tabanlı</strong> ve <strong>Gemini AI</strong> arasında geçiş yapabilirsiniz.',

      // In-page Steam DOM Trigger Button
      triggerButtonText: 'SteamLens AI ile İncelemeleri Özetle',

      // Loading State
      loadingTitle: 'SteamLens AI (Analiz Ediliyor...)',
      loadingFetchAndFilter: 'Steam incelemeleri çekiliyor ve spam/meme filtrelerinden geçiriliyor...',
      loadingGeminiCloud: 'Google Gemini AI ile bulut analizi yapılıyor...',
      loadingRuleNLP: 'Kural tabanlı NLP analiz motoru devrede...',

      // Report Card
      reportTitle: 'SteamLens AI Analiz Özeti',
      tierRuleNLP: 'Kural Tabanlı NLP & İstatistik',
      tierGeminiAI: 'Gemini AI ({model})',
      tierEmpty: 'Veri Yetersiz',
      
      btnCopy: '📋 Kopyala',
      btnCopied: '✅ Kopyalandı!',
      btnRefresh: '🔄 Yenile',
      btnClose: '✕',
      
      metricCommunityApproval: 'Topluluk Onayı',
      metricOptimizationScore: 'Optimizasyon Skoru',
      metricAvgPlaytime: 'Ort. Oynanış Süresi',
      metricFilteredReviews: 'Filtrelenmiş İnceleme',
      unitHours: 'saat',
      
      verdictTitle: '💡 Genel Sonuç:',
      prosTitle: '🟢 Güçlü Yönler',
      consTitle: '🔴 Kritik Sorunlar & Şikayetler',
      patchTitle: '⚡ Son Güncellemeler & Yama Durumu',
      valueTitle: '⏱️ Fiyat / Süre / Değer Analizi',
      footerSummary: 'SteamLens AI — Steam İnceleme Özeti',
      footerDisclaimer: 'Spam ve meme yorumlar filtrelenerek saf geri bildirim analiz edilir 🛡️',

      // Error States
      errorTitle: 'Analiz Tamamlanamadı',
      errorNoReviews: 'Bu oyun için yeterli inceleme bulunamadı veya tüm incelemeler filtreye takıldı.',
      errorGeneral: 'Analiz sırasında bir hata oluştu: {error}',
      btnRetry: '🔄 Yeniden Dene',

      // Clipboard formatting
      clipboardHeader: '🤖 SteamLens AI Analiz Özeti',
      clipboardGame: '🎮 Oyun:',
      clipboardEngine: '🧠 Analiz Motoru:',
      clipboardFooter: 'SteamLens AI ile üretildi.',

      // Rule-Based NLP dynamic phrases
      ruleProsGameplay: 'Akıcı ve tatmin edici oynanış dinamikleri oyuncuların %{pct}\'i tarafından övülüyor.',
      ruleProsStory: 'Atmosfer, görsel tasarım ve işitsel detaylar oldukça başarılı bulunmuş.',
      ruleProsOpt: 'Donanım uyumluluğu ve genel performans stabil bir seviyede.',
      ruleProsValue: 'Ortalama {hours} saatlik oynanış süresiyle yüksek içerik doyuruculuğu.',
      ruleProsDefault: 'Konsept ve temel fikir oyuncuların ilgisini çekmeyi başarıyor.',

      ruleConsOpt: 'İncelenen yorumların %{pct}\'inde FPS düşüşü, takılma veya optimizasyon şikayeti var.',
      ruleConsCrash: 'Bazı kullanıcılar beklenmeyen oyun çökmeleri ve kilitlenmeler bildirmiş.',
      ruleConsPrice: 'Fiyat/içerik dengesi konusunda eleştiriler mevcut, indirim beklenmesi öneriliyor.',
      ruleConsRepetitive: 'İlerleyen saatlerde görev veya mekaniklerin kendini tekrarladığı ifade edilmiş.',
      ruleConsDefault: 'Ciddi bir teknik blokaj yok; incelemelerdeki eleştiriler çoğunlukla kişisel tercihlere dayanıyor.',

      rulePatchDefault: 'Topluluk son dönemde büyük bir yama kırılması bildirmemiş.',
      rulePatchActive: 'İncelemelerde son güncellemelere değinilmiş ({count} yorum); geliştirici ekibin oyunu aktif desteklediği görülüyor.',

      ruleValuePrefix: 'Ortalama oynanış süresi {hours} saat. ',
      ruleValueHigh: 'Türün meraklıları için tam fiyatını veya küçük indirimleri fazlasıyla hak ediyor.',
      ruleValueMid: 'İçerik miktarı fena değil, ancak %30-%50 arası bir Steam indiriminde alınması daha avantajlı.',
      ruleValueLow: 'Teknik eksikler ve fiyatlandırma sebebiyle derin bir indirim veya büyük güncellemeler beklenmeli.',

      ruleVerdictHigh: 'Topluluğun %{pct} gibi ezici bir çoğunluğu tarafından tavsiye edilen, performansı stabil ve güçlü bir yapım.',
      ruleVerdictMid: 'Genel olarak eğlenceli ve olumlu (%{pct} onay), ancak bazı küçük optimizasyon pürüzleri ve tekrar eden unsurları var.',
      ruleVerdictLow: 'Karışık/olumsuz incelemelere sahip. Satın almadan önce eksileri ve sistem gereksinimlerini dikkatlice inceleyin.',

      ruleOptSummaryPrefix: 'Optimizasyon Sağlık Skoru %{score}/100. ',
      ruleOptSummaryHigh: 'Performans oldukça akıcı ve stabil.',
      ruleOptSummaryMid: 'Orta seviye donanımlarda yer yer FPS dropları yaşanabilir.',
      ruleOptSummaryLow: 'Ciddi performans ve optimizasyon sorunları raporlanmış.',

      ruleEmptyVerdict: 'Bu oyun için henüz analiz yapılabilecek yeterlilikte filtrelenmiş inceleme bulunamadı.',
      ruleEmptyOptSummary: 'Yetersiz veri.',
      ruleEmptyPros: 'Henüz yeterli yorum yok.',
      ruleEmptyCons: 'Henüz yeterli yorum yok.',
      ruleEmptyPatch: 'Yama bilgisi yok.',
      ruleEmptyValue: 'Fiyat değerlendirmesi için daha fazla inceleme gerekiyor.'
    },

    en: {
      // General & Brand
      brandTitle: 'SteamLens AI',
      brandSubtitle: 'Steam Review Summarizer',
      
      // Popup - Engine Section
      activeEngineLabel: '⚡ Active Analysis Engine',
      badgeRuleNLP: '🚀 Fast NLP',
      badgeGeminiAI: '⚡ Gemini AI',
      btnModeRule: '🚀 Rule-Based (Fast)',
      btnModeGemini: '⚡ Gemini AI (Cloud)',
      statusDescRule: 'Ultra-fast rule-based analysis active. Zero hardware load, delivers instant summary in 0.01s.',
      statusDescGeminiActive: 'Google Gemini ({model}) active. Reviews are intelligently synthesized via Google Cloud AI.',
      statusDescGeminiNoKey: '⚠️ Gemini mode selected. Please enter your free Google AI Studio API key below and save.',
      
      // Popup - Settings Section
      settingsHeading: '⚙️ Preferences & Settings',
      prefUiLanguageLabel: 'UI & Output Language',
      prefUiLangAuto: '🌐 Auto (Browser Language)',
      prefUiLangTr: '🇹🇷 Türkçe',
      prefUiLangEn: '🇬🇧 English',
      
      prefReviewLanguageLabel: 'Reviews Language to Scan',
      prefReviewLangAll: '🌐 All Languages (Recommended)',
      prefReviewLangTr: '🇹🇷 Turkish Only',
      prefReviewLangEn: '🇬🇧 English Only',
      
      prefLimitLabel: 'Review Scan Limit',
      prefLimit40: '40 Reviews (Fastest)',
      prefLimit60: '60 Reviews (Balanced)',
      prefLimit80: '80 Reviews (Comprehensive)',
      prefLimit100: '100 Reviews (Maximum Detail)',
      
      geminiKeyLabel: 'Google Gemini API Key',
      geminiKeyBadge: 'For Gemini Mode',
      geminiKeyHint: 'Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#66c0f4;">Google AI Studio</a> for Cloud AI mode.',
      btnToggleKeyTitle: 'Show/Hide',
      btnTestKeyTitle: 'Test',
      btnTestKeyText: 'Test',
      
      keyTestMissing: '⚠️ Please enter an API key first.',
      keyTestChecking: '⏳ Verifying with Google AI Studio...',
      keyTestSuccess: '✅ API Key is valid and working! ({model} Active)',
      keyTestFailed: '❌ Verification failed: {error}',
      keyTestConnError: '❌ Connection error: {error}',
      
      btnSave: '💾 Save Settings',
      btnClearCache: '🗑️ Reset',
      btnClearCacheTitle: 'Clear analysis cache',
      
      toastSaved: '✅ Settings saved successfully!',
      toastSaveError: '❌ Could not save settings.',
      toastCacheCleared: '🗑️ Analysis cache cleared!',
      
      quickGuideText: '🎮 <strong>Usage:</strong> Switch between <strong>Rule-Based</strong> and <strong>Gemini AI</strong> anytime using the toggle above.',

      // In-page Steam DOM Trigger Button
      triggerButtonText: 'Summarize Reviews with SteamLens AI',

      // Loading State
      loadingTitle: 'SteamLens AI (Analyzing...)',
      loadingFetchAndFilter: 'Fetching Steam reviews and filtering spam/memes...',
      loadingGeminiCloud: 'Analyzing reviews via Google Gemini AI...',
      loadingRuleNLP: 'Running rule-based statistical NLP analyzer...',

      // Report Card
      reportTitle: 'SteamLens AI Review Summary',
      tierRuleNLP: 'Rule-Based NLP & Statistics',
      tierGeminiAI: 'Gemini AI ({model})',
      tierEmpty: 'Insufficient Data',
      
      btnCopy: '📋 Copy',
      btnCopied: '✅ Copied!',
      btnRefresh: '🔄 Refresh',
      btnClose: '✕',
      
      metricCommunityApproval: 'Community Approval',
      metricOptimizationScore: 'Optimization Score',
      metricAvgPlaytime: 'Avg. Playtime',
      metricFilteredReviews: 'Filtered Reviews',
      unitHours: 'hrs',
      
      verdictTitle: '💡 Verdict:',
      prosTitle: '🟢 Key Strengths',
      consTitle: '🔴 Critical Issues & Complaints',
      patchTitle: '⚡ Recent Updates & Patch Status',
      valueTitle: '⏱️ Price / Time / Value Analysis',
      footerSummary: 'SteamLens AI — Steam Review Summarizer',
      footerDisclaimer: 'Spam and meme reviews filtered to extract pure player feedback 🛡️',

      // Error States
      errorTitle: 'Analysis Failed',
      errorNoReviews: 'Not enough constructive reviews found or all reviews were filtered out.',
      errorGeneral: 'An error occurred during analysis: {error}',
      btnRetry: '🔄 Retry',

      // Clipboard formatting
      clipboardHeader: '🤖 SteamLens AI Review Summary',
      clipboardGame: '🎮 Game:',
      clipboardEngine: '🧠 Analysis Engine:',
      clipboardFooter: 'Generated by SteamLens AI.',

      // Rule-Based NLP dynamic phrases
      ruleProsGameplay: 'Smooth and satisfying gameplay praised by {pct}% of positive reviewers.',
      ruleProsStory: 'Atmosphere, visual presentation, and audio design received high acclaim.',
      ruleProsOpt: 'Hardware compatibility and general performance are well-optimized.',
      ruleProsValue: 'Rich content depth with an average playtime of {hours} hours.',
      ruleProsDefault: 'Core concept and mechanics successfully engage players.',

      ruleConsOpt: '{pct}% of analyzed reviews report FPS drops, stuttering, or optimization flaws.',
      ruleConsCrash: 'Some players reported unexpected game crashes or freezing issues.',
      ruleConsPrice: 'Price-to-content ratio received criticism; waiting for a sale is recommended.',
      ruleConsRepetitive: 'Repetitive mission loops and mechanics noted in extended play sessions.',
      ruleConsDefault: 'No critical technical blockers; criticisms are mostly subjective preferences.',

      rulePatchDefault: 'No major patch regressions or breaking updates reported recently.',
      rulePatchActive: 'Recent patches mentioned in {count} reviews; developer is actively supporting the game.',

      ruleValuePrefix: 'Average playtime is {hours} hours. ',
      ruleValueHigh: 'Well worth full price or minor discounts for fans of the genre.',
      ruleValueMid: 'Decent content volume, but best purchased during a 30%-50% Steam sale.',
      ruleValueLow: 'Consider waiting for deeper discounts or major performance patches before buying.',

      ruleVerdictHigh: 'Overwhelmingly recommended by {pct}% of the community with stable performance and strong mechanics.',
      ruleVerdictMid: 'Generally enjoyable and positive ({pct}% approval), though with minor rough edges or repetitive elements.',
      ruleVerdictLow: 'Mixed to negative player sentiment. Review system requirements and flaws carefully before purchasing.',

      ruleOptSummaryPrefix: 'Optimization Health Score {score}/100. ',
      ruleOptSummaryHigh: 'Performance is smooth, fluid, and stable.',
      ruleOptSummaryMid: 'Occasional frame drops may occur on mid-range hardware.',
      ruleOptSummaryLow: 'Noticeable performance issues and stuttering reported.',

      ruleEmptyVerdict: 'Not enough constructive reviews found to generate an accurate summary for this game.',
      ruleEmptyOptSummary: 'Insufficient data.',
      ruleEmptyPros: 'No constructive feedback available yet.',
      ruleEmptyCons: 'No constructive feedback available yet.',
      ruleEmptyPatch: 'No patch data available.',
      ruleEmptyValue: 'More reviews needed for value analysis.'
    }
  };

  /**
   * Resolves language code ('tr' or 'en') from preference or browser environment.
   * @param {string} pref - 'auto', 'tr', 'en', or undefined
   * @returns {'tr' | 'en'}
   */
  function resolveLanguage(pref) {
    if (pref === 'tr' || pref === 'en') {
      return pref;
    }
    
    // Auto-detect browser/UI language
    let browserLang = 'en';
    if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function') {
      browserLang = chrome.i18n.getUILanguage() || 'en';
    } else if (typeof navigator !== 'undefined' && navigator.language) {
      browserLang = navigator.language;
    }

    return browserLang.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }

  /**
   * Fetches translated text for key in the specified language with optional parameter interpolation.
   * @param {string} key 
   * @param {string} lang 
   * @param {Object} params 
   * @returns {string}
   */
  function t(key, lang = 'en', params = {}) {
    const activeLang = (lang === 'tr' || lang === 'en') ? lang : resolveLanguage(lang);
    const langDict = translations[activeLang] || translations.en;
    let template = langDict[key] !== undefined ? langDict[key] : (translations.en[key] !== undefined ? translations.en[key] : key);

    if (typeof template === 'string' && params && typeof params === 'object') {
      for (const [paramKey, paramVal] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      }
    }

    return template;
  }

  const I18nModule = {
    translations,
    resolveLanguage,
    t
  };

  // Export to window / global scope
  if (typeof window !== 'undefined') {
    window.SteamLensI18n = I18nModule;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18nModule;
  }
})();
