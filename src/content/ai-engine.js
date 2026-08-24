/**
 * SteamLens AI — Analysis Engine
 * Dual-Engine Architecture:
 * 1. Cloud Gemini Flash (User chosen Gemini mode via Google AI Studio)
 * 2. High-Speed Rule-Based NLP & Statistical Sentiment Analyzer (User chosen Rule mode or fallback)
 */

class SteamLensAIEngine {
  /**
   * Main entry point to analyze reviews.
   * @param {Object} processedData - Result from SteamApiClient.processReviews
   * @param {Object} options - { engineMode, preferredLanguage, geminiApiKey, onProgress }
   * @returns {Promise<Object>} Analysis result with tier badge and structured summary
   */
  static async analyze(processedData, options = {}) {
    const {
      engineMode = 'rule',
      geminiApiKey = '',
      preferredLanguage = 'all',
      onProgress = () => {}
    } = options;

    const { validReviews, stats, totalFetched, validCount, querySummary } = processedData;

    if (!validReviews || validReviews.length === 0) {
      return this.generateEmptyResult();
    }

    // --- 1. CLOUD GEMINI FLASH (When user selected Gemini Mode) ---
    if (engineMode === 'gemini' && geminiApiKey && geminiApiKey.trim().length > 15) {
      try {
        onProgress({ tier: 'cloud', status: 'running', message: 'Google Gemini AI ile bulut analizi yapılıyor...' });
        const cloudResult = await this.runCloudGeminiAnalysis(validReviews, stats, geminiApiKey.trim());
        if (cloudResult) {
          return {
            tier: `Gemini AI (${cloudResult.modelUsed || 'Flash'})`,
            tierCode: 'cloud',
            isAI: true,
            ...cloudResult,
            stats,
            totalFetched: totalFetched || validReviews.length,
            validCount: validCount || validReviews.length
          };
        }
      } catch (cloudError) {
        console.warn('[SteamLens AI] Cloud Gemini failed, falling back to rule-based:', cloudError);
      }
    }

    // --- 2. HIGH-SPEED RULE-BASED NLP & STATISTICAL ANALYZER (Rule Mode or Safe Fallback) ---
    onProgress({ tier: 'rule', status: 'running', message: 'Kural tabanlı NLP analiz motoru devrede...' });
    const ruleResult = this.runRuleBasedAnalysis(validReviews, stats);
    return {
      tier: 'Kural Tabanlı NLP & İstatistik',
      tierCode: 'rule',
      isAI: false,
      ...ruleResult,
      stats,
      totalFetched: totalFetched || validReviews.length,
      validCount: validCount || validReviews.length
    };
  }

  /**
   * Runs analysis using Google AI Studio BYOK Gemini API with model fallback.
   */
  static async runCloudGeminiAnalysis(reviews, stats, apiKey) {
    const cleanKey = apiKey.trim();
    const posReviews = reviews.filter(r => r.votedUp).slice(0, 10);
    const negReviews = reviews.filter(r => !r.votedUp).slice(0, 10);

    let promptContext = `Topluluk Onayı: %${stats.positivePercentage}, Ortalama Oynanış: ${stats.avgPlaytimeHours} saat\n\n`;
    promptContext += `--- OLUMLU İNCELEMELER ---\n`;
    posReviews.forEach((r, i) => promptContext += `[#${i + 1}]: ${r.text.substring(0, 200)}\n`);
    promptContext += `\n--- OLUMSUZ İNCELEMELER ---\n`;
    negReviews.forEach((r, i) => promptContext += `[#${i + 1}]: ${r.text.substring(0, 200)}\n`);

    const systemInstruction = `Sen uzman bir Steam oyun inceleme ve değerlendirme asistanısın. Sana verilen kullanıcı yorumlarını analiz et ve geçerli bir JSON objesi olarak şu formatta Türkçe yanıt ver:
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
              parts: [{ text: `${systemInstruction}\n\nİncelenecek Yorumlar:\n${promptContext}` }]
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
          verdict: parsed.verdict || 'İncelemeler başarıyla analiz edildi.',
          optimizationScore: Number(parsed.optimizationScore) || 75,
          optimizationSummary: parsed.optimizationSummary || 'Optimizasyon durumu stabil.',
          pros: Array.isArray(parsed.pros) ? parsed.pros : ['Oynanış mekanikleri beğeniliyor.'],
          cons: Array.isArray(parsed.cons) ? parsed.cons : ['Kullanıcılar bazı teknik pürüzlerden şikayetçi.'],
          patchImpact: parsed.patchImpact || 'Son güncellemeler deneyimi iyileştirmiş.',
          valueAnalysis: parsed.valueAnalysis || 'Oynanış süresine göre değerlendirilebilir.'
        };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Uygun Gemini modeli bulunamadı.');
  }

  /**
   * Ultra-Fast Rule-Based Statistical NLP Engine.
   * Runs in ~5ms without GPU load, network requests, or API limits.
   */
  static runRuleBasedAnalysis(reviews, stats) {
    const keywords = {
      optBad: [/fps drop/i, /kasma/i, /stutter/i, /donma/i, /optimizasyon berbat/i, /bad optimization/i, /lag/i, /unplayable/i, /çökme/i, /crash/i, /frame drop/i, /fatal error/i, /siyah ekran/i, /low fps/i, /fps düşüş/i],
      optGood: [/smooth/i, /akıcı/i, /optimizasyon iyi/i, /good optimization/i, /high fps/i, /60 fps/i, /144 fps/i, /dlss/i, /fsr/i, /runs well/i, /tertemiz/i, /yağ gibi/i, /stabil/i],
      storyGood: [/hikaye/i, /story/i, /lore/i, /atmosfer/i, /atmosphere/i, /soundtrack/i, /müzik/i, /mükemmel senaryo/i, /emotional/i, /grafik/i, /visuals/i, /art style/i, /sinematik/i],
      gameplayGood: [/oynanış/i, /gameplay/i, /combat/i, /bağımlılık/i, /fun/i, /zevk/i, /sarıyor/i, /keyifli/i, /akıcı mekanik/i, /mechanics/i, /satisfying/i, /vuruş hissi/i],
      gameplayBad: [/sıkıcı/i, /boring/i, /repetitive/i, /tekrar/i, /clunky/i, /hantal/i, /boş dünya/i, /bug dolu/i, /glitch/i, /kötü kontrol/i, /yapay zeka kötü/i],
      priceGood: [/fiyatını hak ediyor/i, /worth/i, /ucuz/i, /bedava/i, /cheap/i, /fiyatı uygun/i, /dolu dolu/i, /doyurucu/i, /kuruşuna kadar/i],
      priceBad: [/pahalı/i, /expensive/i, /değmez/i, /not worth/i, /para tuzağı/i, /p2w/i, /overpriced/i, /iade ettim/i, /refund/i, /zam/i, /bu fiyata alınmaz/i],
      patches: [/güncelleme/i, /update/i, /patch/i, /yama/i, /yeni güncelleme/i, /fixed/i, /düzelttiler/i, /bozdular/i]
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
      const t = r.text;
      if (keywords.optBad.some(regex => regex.test(t))) {
        optBadCount++;
        if (/crash|çökme|fatal error/i.test(t)) crashCount++;
      }
      if (keywords.optGood.some(regex => regex.test(t))) optGoodCount++;
      if (keywords.storyGood.some(regex => regex.test(t))) storyGoodCount++;
      if (keywords.gameplayGood.some(regex => regex.test(t))) gameplayGoodCount++;
      if (keywords.gameplayBad.some(regex => regex.test(t))) gameplayBadCount++;
      if (keywords.priceGood.some(regex => regex.test(t))) priceGoodCount++;
      if (keywords.priceBad.some(regex => regex.test(t))) priceBadCount++;
      if (keywords.patches.some(regex => regex.test(t))) patchCount++;
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
      pros.push(`Akıcı ve tatmin edici oynanış dinamikleri oyuncuların %${stats.positivePercentage}'i tarafından övülüyor.`);
    }
    if (storyGoodCount >= 2) {
      pros.push('Atmosfer, görsel tasarım ve işitsel detaylar oldukça başarılı bulunmuş.');
    }
    if (optGoodCount >= 2 || optimizationScore > 75) {
      pros.push('Donanım uyumluluğu ve genel performans stabil bir seviyede.');
    }
    if (priceGoodCount >= 1 || stats.avgPlaytimeHours > 20) {
      pros.push(`Ortalama ${stats.avgPlaytimeHours} saatlik oynanış süresiyle yüksek içerik doyuruculuğu.`);
    }
    if (pros.length === 0) {
      pros.push('Konsept ve temel fikir oyuncuların ilgisini çekmeyi başarıyor.');
    }

    // Dynamic Cons
    const cons = [];
    if (optBadCount >= 2 || optimizationScore < 70) {
      cons.push(`İncelenen yorumların %${Math.round(optBadRatio * 100)}'inde FPS düşüşü, takılma veya optimizasyon şikayeti var.`);
    }
    if (crashCount >= 1) {
      cons.push('Bazı kullanıcılar beklenmeyen oyun çökmeleri ve kilitlenmeler bildirmiş.');
    }
    if (priceBadCount >= 2) {
      cons.push('Fiyat/içerik dengesi konusunda eleştiriler mevcut, indirim beklenmesi öneriliyor.');
    }
    if (gameplayBadCount >= 2) {
      cons.push('İlerleyen saatlerde görev veya mekaniklerin kendini tekrarladığı ifade edilmiş.');
    }
    if (cons.length === 0) {
      cons.push('Ciddi bir teknik blokaj yok; incelemelerdeki eleştiriler çoğunlukla kişisel tercihlere dayanıyor.');
    }

    // Patch impact
    let patchImpact = 'Topluluk son dönemde büyük bir yama kırılması bildirmemiş.';
    if (patchCount >= 2) {
      patchImpact = `İncelemelerde son güncellemelere değinilmiş (${patchCount} yorum); geliştirici ekibin oyunu aktif desteklediği görülüyor.`;
    }

    // Value analysis
    let valueAnalysis = `Ortalama oynanış süresi ${stats.avgPlaytimeHours} saat. `;
    if (stats.positivePercentage >= 75) {
      valueAnalysis += 'Türün meraklıları için tam fiyatını veya küçük indirimleri fazlasıyla hak ediyor.';
    } else if (stats.positivePercentage >= 50) {
      valueAnalysis += 'İçerik miktarı fena değil, ancak %30-%50 arası bir Steam indiriminde alınması daha avantajlı.';
    } else {
      valueAnalysis += 'Teknik eksikler ve fiyatlandırma sebebiyle derin bir indirim veya büyük güncellemeler beklenmeli.';
    }

    // General Verdict
    let verdict = '';
    if (stats.positivePercentage >= 80 && optimizationScore >= 75) {
      verdict = `Topluluğun %${stats.positivePercentage} gibi ezici bir çoğunluğu tarafından tavsiye edilen, performansı stabil ve güçlü bir yapım.`;
    } else if (stats.positivePercentage >= 60) {
      verdict = `Genel olarak eğlenceli ve olumlu (%${stats.positivePercentage} onay), ancak bazı küçük optimizasyon pürüzleri ve tekrar eden unsurları var.`;
    } else {
      verdict = `Karışık/olumsuz incelemelere sahip. Satın almadan önce eksileri ve sistem gereksinimlerini dikkatlice inceleyin.`;
    }

    let optimizationSummary = `Optimizasyon Sağlık Skoru %${optimizationScore}/100. `;
    if (optimizationScore >= 80) optimizationSummary += 'Performans oldukça akıcı ve stabil.';
    else if (optimizationScore >= 60) optimizationSummary += 'Orta seviye donanımlarda yer yer FPS dropları yaşanabilir.';
    else optimizationSummary += 'Ciddi performans ve optimizasyon sorunları raporlanmış.';

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

  static generateEmptyResult() {
    return {
      tier: 'Veri Yetersiz',
      tierCode: 'empty',
      isAI: false,
      verdict: 'Bu oyun için henüz analiz yapılabilecek yeterlilikte filtrelenmiş inceleme bulunamadı.',
      optimizationScore: 0,
      optimizationSummary: 'Yetersiz veri.',
      pros: ['Henüz yeterli yorum yok.'],
      cons: ['Henüz yeterli yorum yok.'],
      patchImpact: 'Yama bilgisi yok.',
      valueAnalysis: 'Fiyat değerlendirmesi için daha fazla inceleme gerekiyor.',
      stats: { positivePercentage: 0, avgPlaytimeHours: 0, validReviews: [] }
    };
  }
}

// Attach to window for content script usage
if (typeof window !== 'undefined') {
  window.SteamLensAIEngine = SteamLensAIEngine;
}
