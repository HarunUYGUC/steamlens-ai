// Unit test script for SteamApiClient and SteamLensAIEngine logic
const fs = require('fs');

// Mock window environment
global.window = global;

// Load steam-api.js and ai-engine.js
eval(fs.readFileSync('./src/content/steam-api.js', 'utf8'));
eval(fs.readFileSync('./src/content/ai-engine.js', 'utf8'));

console.log('Testing SteamApiClient...');

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

// Mock Reviews dataset
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
      review: '[b]Hikaye ve atmosfer muhteşem![/b] Oynanış akıcı ve müzikler harika. Kesinlikle fiyatını hak ediyor.',
      author: { playtime_forever: 1200, playtime_at_review: 600 },
      weighted_vote_score: '0.9'
    },
    {
      recommendationid: '2',
      voted_up: false,
      review: 'Optimizasyon berbat. FPS drop ve ani takılmalar oyunu oynanamaz hale getiriyor. Crash yedim iki kere.',
      author: { playtime_forever: 180, playtime_at_review: 180 },
      weighted_vote_score: '0.85'
    },
    {
      recommendationid: '3',
      voted_up: true,
      review: 'Son güncelleme ve yama ile performans bayağı toparladı. 60 FPS akıcı oynanıyor.',
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

// Test Rule-Based Analyzer
console.log('\nTesting SteamLensAIEngine (Tier 3 Rule-Based Analyzer)...');
const analysis = SteamLensAIEngine.runRuleBasedAnalysis(processed.validReviews, processed.stats);
console.log('Analysis Result:', JSON.stringify(analysis, null, 2));

console.assert(analysis.optimizationScore > 0 && analysis.optimizationScore <= 100, 'Score should be between 0 and 100');
console.assert(analysis.pros.length > 0, 'Should generate pros');
console.assert(analysis.cons.length > 0, 'Should generate cons');
console.assert(typeof analysis.verdict === 'string' && analysis.verdict.length > 10, 'Should have verdict');

console.log('\n✅ ALL UNIT TESTS PASSED SUCCESSFULLY!');
