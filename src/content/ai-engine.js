/**
 * SteamLens AI — Analysis Engine
 * Dual-Engine Architecture with Full Internationalization (EN / TR):
 * 1. Cloud Gemini Flash (User chosen Gemini mode via Google AI Studio)
 * 2. High-Speed Rule-Based NLP & Statistical Sentiment Analyzer (User chosen Rule mode or fallback)
 */

class SteamLensAIEngine {
  /**
   * Main entry point to analyze reviews.
   * @param {Object} processedData - Result from SteamApiClient.processReviews
   * @param {Object} options - { engineMode, uiLanguage, preferredLanguage, geminiApiKey, onProgress }
   * @returns {Promise<Object>} Analysis result with tier badge and structured summary
   */
  static async analyze(processedData, options = {}) {
    const {
      engineMode = 'rule',
      geminiApiKey = '',
      uiLanguage = 'auto',
      preferredLanguage = 'all',
      onProgress = () => {}
    } = options;

    const i18n = (typeof window !== 'undefined' && window.SteamLensI18n) ? window.SteamLensI18n : null;
    const lang = i18n ? i18n.resolveLanguage(uiLanguage) : (uiLanguage === 'tr' ? 'tr' : 'en');
    const t = (k, p) => i18n ? i18n.t(k, lang, p) : k;

    const { validReviews, stats, totalFetched, validCount, querySummary } = processedData;

    if (!validReviews || validReviews.length === 0) {
      return this.generateEmptyResult(lang);
    }

    // --- 1. CLOUD GEMINI FLASH (When user selected Gemini Mode) ---
    if (engineMode === 'gemini' && geminiApiKey && geminiApiKey.trim().length > 15) {
      try {
        onProgress({ tier: 'cloud', status: 'running', message: t('loadingGeminiCloud') });
        const cloudResult = await this.runCloudGeminiAnalysis(validReviews, stats, geminiApiKey.trim(), lang);
        if (cloudResult) {
          const modelName = cloudResult.modelUsed || 'Flash';
          return {
            tier: t('tierGeminiAI', { model: modelName }),
            tierCode: 'cloud',
            isAI: true,
            ...cloudResult,
            stats,
            totalFetched: totalFetched || validReviews.length,
            validCount: validCount || validReviews.length,
            language: lang
          };
        }
      } catch (cloudError) {
        console.warn('[SteamLens AI] Cloud Gemini failed, falling back to rule-based:', cloudError);
      }
    }

    // --- 2. HIGH-SPEED RULE-BASED NLP & STATISTICAL ANALYZER (Rule Mode or Safe Fallback) ---
    onProgress({ tier: 'rule', status: 'running', message: t('loadingRuleNLP') });
    const ruleResult = this.runRuleBasedAnalysis(validReviews, stats, lang);
    return {
      tier: t('tierRuleNLP'),
      tierCode: 'rule',
      isAI: false,
      ...ruleResult,
      stats,
      totalFetched: totalFetched || validReviews.length,
      validCount: validCount || validReviews.length,
      language: lang
    };
  }

  /**
   * Runs analysis using Google AI Studio BYOK Gemini API with model fallback and language adaptation.
   */
  static async runCloudGeminiAnalysis(reviews, stats, apiKey, lang = 'en') {
    const cleanKey = apiKey.trim();
    const posReviews = reviews.filter(r => r.votedUp).slice(0, 10);
    const negReviews = reviews.filter(r => !r.votedUp).slice(0, 10);

    let promptContext = '';
    if (lang === 'tr') {
      promptContext = `Topluluk Onayı: %${stats.positivePercentage}, Ortalama Oynanış: ${stats.avgPlaytimeHours} saat\n\n`;
      promptContext += `--- OLUMLU İNCELEMELER ---\n`;
      posReviews.forEach((r, i) => promptContext += `[#${i + 1}]: ${r.text.substring(0, 200)}\n`);
      promptContext += `\n--- OLUMSUZ İNCELEMELER ---\n`;
      negReviews.forEach((r, i) => promptContext += `[#${i + 1}]: ${r.text.substring(0, 200)}\n`);
    } else {
      promptContext = `Community Approval: ${stats.positivePercentage}%, Average Playtime: ${stats.avgPlaytimeHours} hours\n\n`;
      promptContext += `--- POSITIVE REVIEWS ---\n`;
      posReviews.forEach((r, i) => promptContext += `[#${i + 1}]: ${r.text.substring(0, 200)}\n`);
      promptContext += `\n--- NEGATIVE REVIEWS ---\n`;
      negReviews.forEach((r, i) => promptContext += `[#${i + 1}]: ${r.text.substring(0, 200)}\n`);
    }

    const systemInstruction = lang === 'tr' ? `Sen uzman bir Steam oyun inceleme ve değerlendirme asistanısın. Sana verilen kullanıcı yorumlarını analiz et ve geçerli bir JSON objesi olarak şu formatta Türkçe yanıt ver:
{
  "verdict": "Oyun hakkında 2 cümlelik genel değerlendirme ve net satın alma tavsiyesi.",
  "optimizationScore": 85,
  "optimizationSummary": "Performans, FPS, takılma ve donanım uyumluluğu hakkında 1 cümle.",
  "pros": [
    "Güçlü yön 1",
    "Güçlü yön 2",
    "Güçlü yön 3"
  ],
  "cons": [
    "Eleştirilen yön veya sorun 1",
    "Eleştirilen yön veya sorun 2"
  ],
  "patchImpact": "Son güncellemelerin veya yamaların oyuna etkisi.",
  "valueAnalysis": "Fiyat, oynanış süresi ve içerik doyuruculuğu analizi."
}` : `You are an expert Steam video game review analyst. Analyze the user reviews provided and return a valid JSON object strictly matching this schema in English:
{
  "verdict": "A 2-sentence comprehensive evaluation of the game with a clear purchase recommendation.",
  "optimizationScore": 85,
  "optimizationSummary": "1 concise sentence summarizing performance, framerates, stuttering, and stability.",
  "pros": [
    "Key strength 1",
    "Key strength 2",
    "Key strength 3"
  ],
  "cons": [
    "Criticism or technical issue 1",
    "Criticism or technical issue 2"
  ],
  "patchImpact": "Impact of recent updates, patches, and developer support.",
  "valueAnalysis": "Evaluation of price, content volume, and average playtime value."
}`;

    const candidateModels = [
      'models/gemini-3.6-flash',
      'models/gemini-2.0-flash',
      'models/gemini-2.5-flash',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-flash-latest',
      'models/gemini-pro'
    ];

    let lastError = null;

    for (const modelPath of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\n${lang === 'tr' ? 'İncelenecek Yorumlar:' : 'Reviews to Analyze:'}\n${promptContext}` }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) continue;

        const cleanJson = candidateText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        return {
          modelUsed: modelPath.replace('models/', ''),
          verdict: parsed.verdict || (lang === 'tr' ? 'İncelemeler başarıyla analiz edildi.' : 'Reviews successfully analyzed.'),
          optimizationScore: Number(parsed.optimizationScore) || 75,
          optimizationSummary: parsed.optimizationSummary || (lang === 'tr' ? 'Optimizasyon durumu stabil.' : 'Optimization status is stable.'),
          pros: Array.isArray(parsed.pros) ? parsed.pros : [lang === 'tr' ? 'Oynanış mekanikleri beğeniliyor.' : 'Gameplay mechanics are praised.'],
          cons: Array.isArray(parsed.cons) ? parsed.cons : [lang === 'tr' ? 'Kullanıcılar bazı teknik pürüzlerden şikayetçi.' : 'Players noted minor technical issues.'],
          patchImpact: parsed.patchImpact || (lang === 'tr' ? 'Son güncellemeler deneyimi iyileştirmiş.' : 'Recent patches have improved the experience.'),
          valueAnalysis: parsed.valueAnalysis || (lang === 'tr' ? 'Oynanış süresine göre değerlendirilebilir.' : 'Fair value relative to playtime.')
        };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('No working Gemini model available.');
  }

  /**
   * Ultra-Fast Rule-Based Statistical NLP Engine.
   * Runs in ~5ms without GPU load, network requests, or API limits.
   * Outputs results in Turkish or English according to lang parameter.
   */
  static runRuleBasedAnalysis(reviews, stats, lang = 'en') {
    const i18n = (typeof window !== 'undefined' && window.SteamLensI18n) ? window.SteamLensI18n : null;
    const t = (k, p) => i18n ? i18n.t(k, lang, p) : k;

    const keywords = {
      optBad: [/fps drop/i, /kasma/i, /stutter/i, /donma/i, /optimizasyon berbat/i, /bad optimization/i, /poorly optimized/i, /lag/i, /unplayable/i, /çökme/i, /crash/i, /freez/i, /frame drop/i, /fatal error/i, /siyah ekran/i, /black screen/i, /low fps/i, /fps düşüş/i],
      optGood: [/smooth/i, /akıcı/i, /optimizasyon iyi/i, /good optimization/i, /well optimized/i, /high fps/i, /60 fps/i, /144 fps/i, /dlss/i, /fsr/i, /runs well/i, /tertemiz/i, /yağ gibi/i, /stabil/i, /stable/i, /flawless/i],
      storyGood: [/hikaye/i, /story/i, /lore/i, /atmosfer/i, /atmosphere/i, /soundtrack/i, /müzik/i, /music/i, /mükemmel senaryo/i, /emotional/i, /grafik/i, /visuals/i, /art style/i, /graphics/i, /cinematic/i, /sinematik/i],
      gameplayGood: [/oynanış/i, /gameplay/i, /combat/i, /bağımlılık/i, /fun/i, /zevk/i, /sarıyor/i, /keyifli/i, /akıcı mekanik/i, /mechanics/i, /satisfying/i, /vuruş hissi/i, /addictive/i, /responsive/i],
      gameplayBad: [/sıkıcı/i, /boring/i, /repetitive/i, /tekrar/i, /clunky/i, /hantal/i, /boş dünya/i, /empty world/i, /bug dolu/i, /buggy/i, /glitch/i, /kötü kontrol/i, /bad controls/i, /yapay zeka kötü/i, /bad ai/i],
      priceGood: [/fiyatını hak ediyor/i, /worth/i, /ucuz/i, /bedava/i, /cheap/i, /fiyatı uygun/i, /dolu dolu/i, /doyurucu/i, /kuruşuna kadar/i, /bargain/i, /great value/i],
      priceBad: [/pahalı/i, /expensive/i, /değmez/i, /not worth/i, /para tuzağı/i, /cash grab/i, /p2w/i, /overpriced/i, /iade ettim/i, /refund/i, /zam/i, /bu fiyata alınmaz/i, /wait for sale/i],
      patches: [/güncelleme/i, /update/i, /patch/i, /yama/i, /yeni güncelleme/i, /fixed/i, /düzelttiler/i, /bozdular/i, /broke/i, /hotfix/i]
    };

    let optBadCount = 0;
    let optGoodCount = 0;
    let storyGoodCount = 0;
    let gameplayGoodCount = 0;
    let gameplayBadCount = 0;
    let priceGoodCount = 0;
    let priceBadCount = 0;
    let patchCount = 0;
    let crashCount = 0;

    for (const r of reviews) {
      const tStr = r.text;
      if (keywords.optBad.some(regex => regex.test(tStr))) {
        optBadCount++;
        if (/crash|çökme|fatal error|freez/i.test(tStr)) crashCount++;
      }
      if (keywords.optGood.some(regex => regex.test(tStr))) optGoodCount++;
      if (keywords.storyGood.some(regex => regex.test(tStr))) storyGoodCount++;
      if (keywords.gameplayGood.some(regex => regex.test(tStr))) gameplayGoodCount++;
      if (keywords.gameplayBad.some(regex => regex.test(tStr))) gameplayBadCount++;
      if (keywords.priceGood.some(regex => regex.test(tStr))) priceGoodCount++;
      if (keywords.priceBad.some(regex => regex.test(tStr))) priceBadCount++;
      if (keywords.patches.some(regex => regex.test(tStr))) patchCount++;
    }

    const total = reviews.length || 1;
    const optBadRatio = optBadCount / total;
    const optGoodRatio = optGoodCount / total;

    // Optimization Score (0 - 100)
    let optimizationScore = Math.round(75 + (optGoodRatio * 40) - (optBadRatio * 60));
    optimizationScore = Math.max(20, Math.min(98, optimizationScore));

    // Dynamic Pros
    const pros = [];
    if (gameplayGoodCount >= 2 || stats.positivePercentage > 65) {
      pros.push(t('ruleProsGameplay', { pct: stats.positivePercentage }));
    }
    if (storyGoodCount >= 2) {
      pros.push(t('ruleProsStory'));
    }
    if (optGoodCount >= 2 || optimizationScore > 75) {
      pros.push(t('ruleProsOpt'));
    }
    if (priceGoodCount >= 1 || stats.avgPlaytimeHours > 20) {
      pros.push(t('ruleProsValue', { hours: stats.avgPlaytimeHours }));
    }
    if (pros.length === 0) {
      pros.push(t('ruleProsDefault'));
    }

    // Dynamic Cons
    const cons = [];
    if (optBadCount >= 2 || optimizationScore < 70) {
      cons.push(t('ruleConsOpt', { pct: Math.round(optBadRatio * 100) }));
    }
    if (crashCount >= 1) {
      cons.push(t('ruleConsCrash'));
    }
    if (priceBadCount >= 2) {
      cons.push(t('ruleConsPrice'));
    }
    if (gameplayBadCount >= 2) {
      cons.push(t('ruleConsRepetitive'));
    }
    if (cons.length === 0) {
      cons.push(t('ruleConsDefault'));
    }

    // Patch impact
    let patchImpact = t('rulePatchDefault');
    if (patchCount >= 2) {
      patchImpact = t('rulePatchActive', { count: patchCount });
    }

    // Value analysis
    let valueAnalysis = t('ruleValuePrefix', { hours: stats.avgPlaytimeHours });
    if (stats.positivePercentage >= 75) {
      valueAnalysis += t('ruleValueHigh');
    } else if (stats.positivePercentage >= 50) {
      valueAnalysis += t('ruleValueMid');
    } else {
      valueAnalysis += t('ruleValueLow');
    }

    // General Verdict
    let verdict = '';
    if (stats.positivePercentage >= 80 && optimizationScore >= 75) {
      verdict = t('ruleVerdictHigh', { pct: stats.positivePercentage });
    } else if (stats.positivePercentage >= 60) {
      verdict = t('ruleVerdictMid', { pct: stats.positivePercentage });
    } else {
      verdict = t('ruleVerdictLow');
    }

    let optimizationSummary = t('ruleOptSummaryPrefix', { score: optimizationScore });
    if (optimizationScore >= 80) optimizationSummary += t('ruleOptSummaryHigh');
    else if (optimizationScore >= 60) optimizationSummary += t('ruleOptSummaryMid');
    else optimizationSummary += t('ruleOptSummaryLow');

    return {
      verdict,
      optimizationScore,
      optimizationSummary,
      pros,
      cons,
      patchImpact,
      valueAnalysis
    };
  }

  static generateEmptyResult(lang = 'en') {
    const i18n = (typeof window !== 'undefined' && window.SteamLensI18n) ? window.SteamLensI18n : null;
    const t = (k, p) => i18n ? i18n.t(k, lang, p) : k;

    return {
      tier: t('tierEmpty'),
      tierCode: 'empty',
      isAI: false,
      verdict: t('ruleEmptyVerdict'),
      optimizationScore: 0,
      optimizationSummary: t('ruleEmptyOptSummary'),
      pros: [t('ruleEmptyPros')],
      cons: [t('ruleEmptyCons')],
      patchImpact: t('ruleEmptyPatch'),
      valueAnalysis: t('ruleEmptyValue'),
      stats: { positivePercentage: 0, avgPlaytimeHours: 0, validReviews: [] }
    };
  }
}

// Attach to window / global scope for content script & tests
if (typeof window !== 'undefined') {
  window.SteamLensAIEngine = SteamLensAIEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SteamLensAIEngine;
}
