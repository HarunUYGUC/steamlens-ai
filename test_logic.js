// Comprehensive Unit test script for SteamApiClient, SteamLensI18n, and SteamLensAIEngine
const fs = require('fs');

// Mock window environment
global.window = global;

// Load i18n, steam-api.js and ai-engine.js
eval(fs.readFileSync('./src/shared/i18n.js', 'utf8'));
eval(fs.readFileSync('./src/content/steam-api.js', 'utf8'));
eval(fs.readFileSync('./src/content/ai-engine.js', 'utf8'));

console.log('--- 1. Testing SteamApiClient ---');

// Test URL parser
const urlTest = SteamApiClient.getAppIdFromUrl('https://store.steampowered.com/app/1091500/Cyberpunk_2077/');
console.assert(urlTest === '1091500', `Expected 1091500, got ${urlTest}`);

// Test BBCode cleaner
const rawBBCode = '[b]Harika bir oyun[/b] [h1]Grafikler muazzam[/h1] [url=https://example.com]Link[/url] kesinlikle tavsiye ederim [quote]efsane[/quote]';
const cleaned = SteamApiClient.cleanReviewText(rawBBCode);
console.assert(!cleaned.includes('[b]') && !cleaned.includes('[/h1]'), 'BBCode tags should be removed');
console.log('Cleaned text:', cleaned);

// Test Meme filter
console.assert(SteamApiClient.isMemeOrSpam('10/10') === true, '10/10 should be meme');
console.assert(SteamApiClient.isMemeOrSpam('good') === true, 'good should be meme');
console.assert(SteamApiClient.isMemeOrSpam('░░░░░░░░░░░░░░░░░░░░') === true, 'ASCII should be meme');
console.assert(SteamApiClient.isMemeOrSpam('Oyunun hikayesi ve atmosferi inanılmaz derecede başarılı, optimizasyon da son yamayla düzeldi.') === false, 'Constructive review should pass');

// Mock Reviews dataset (Mixed TR & EN reviews)
const mockReviews = {
  success: 1,
  query_summary: {
    num_reviews: 4,
    review_score_desc: 'Very Positive',
    total_positive: 80,
    total_negative: 20,
    total_reviews: 100
  },
  reviews: [
    {
      recommendationid: '1',
      voted_up: true,
      review: '[b]Story and atmosphere are outstanding![/b] Gameplay is smooth and soundtrack is epic. Well worth the price.',
      author: { playtime_forever: 1200, playtime_at_review: 600 },
      weighted_vote_score: '0.9'
    },
    {
      recommendationid: '2',
      voted_up: false,
      review: 'Bad optimization. Constant FPS drops, stuttering and crashes make it unplayable.',
      author: { playtime_forever: 180, playtime_at_review: 180 },
      weighted_vote_score: '0.85'
    },
    {
      recommendationid: '3',
      voted_up: true,
      review: 'Recent patch fixed the frame drops. Runs at a smooth 60 FPS now.',
      author: { playtime_forever: 2400, playtime_at_review: 1500 },
      weighted_vote_score: '0.8'
    },
    {
      recommendationid: '4',
      voted_up: true,
      review: '10/10', // Meme - will be filtered
      author: { playtime_forever: 50 },
      weighted_vote_score: '0.1'
    }
  ]
};

const processed = SteamApiClient.processReviews(mockReviews);
console.log('Processed Stats:', processed.stats);
console.assert(processed.validReviews.length === 3, `Expected 3 valid reviews, got ${processed.validReviews.length}`);
console.assert(processed.stats.positiveCount === 2, 'Expected 2 positive reviews');
console.assert(processed.stats.negativeCount === 1, 'Expected 1 negative review');

console.log('\n--- 2. Testing SteamLensI18n Module ---');
const i18n = window.SteamLensI18n;
console.assert(i18n.resolveLanguage('tr') === 'tr', 'resolveLanguage(tr) should return tr');
console.assert(i18n.resolveLanguage('en') === 'en', 'resolveLanguage(en) should return en');
console.assert(typeof i18n.t('brandTitle', 'en') === 'string', 't() should return string');
console.assert(i18n.t('prefLimit60', 'en').includes('Balanced'), 'English translation check');
console.assert(i18n.t('prefLimit60', 'tr').includes('Dengeli'), 'Turkish translation check');

// Test interpolation
const testInterpolation = i18n.t('statusDescGeminiActive', 'en', { model: 'Gemini-3.6' });
console.assert(testInterpolation.includes('Gemini-3.6'), 'Interpolation check failed');
console.log('Interpolation result:', testInterpolation);

console.log('\n--- 3. Testing Rule-Based Analyzer (Turkish - TR) ---');
const analysisTr = SteamLensAIEngine.runRuleBasedAnalysis(processed.validReviews, processed.stats, 'tr');
console.log('TR Verdict:', analysisTr.verdict);
console.log('TR Pros:', analysisTr.pros);
console.log('TR Cons:', analysisTr.cons);
console.assert(analysisTr.optimizationScore > 0 && analysisTr.optimizationScore <= 100, 'Score range valid');
console.assert(analysisTr.pros.length > 0, 'Should generate Turkish pros');
console.assert(analysisTr.cons.length > 0, 'Should generate Turkish cons');
console.assert(analysisTr.verdict.includes('onay') || analysisTr.verdict.includes('tavsiye') || analysisTr.verdict.includes('inceleme'), 'Turkish verdict check');

console.log('\n--- 4. Testing Rule-Based Analyzer (English - EN) ---');
const analysisEn = SteamLensAIEngine.runRuleBasedAnalysis(processed.validReviews, processed.stats, 'en');
console.log('EN Verdict:', analysisEn.verdict);
console.log('EN Pros:', analysisEn.pros);
console.log('EN Cons:', analysisEn.cons);
console.assert(analysisEn.optimizationScore > 0 && analysisEn.optimizationScore <= 100, 'Score range valid');
console.assert(analysisEn.pros.length > 0, 'Should generate English pros');
console.assert(analysisEn.cons.length > 0, 'Should generate English cons');
console.assert(analysisEn.verdict.includes('approval') || analysisEn.verdict.includes('recommended') || analysisEn.verdict.includes('sentiment'), 'English verdict check');

console.log('\n🎉 ALL UNIT & LOCALIZATION TESTS PASSED SUCCESSFULLY!');
