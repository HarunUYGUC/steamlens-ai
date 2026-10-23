/**
 * SteamLens AI — Service Worker (Manifest V3)
 * Manages extension lifecycle, default settings, and inter-component messaging.
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  try {
    const existing = await chrome.storage.local.get([
      'uiLanguage',
      'preferredLanguage',
      'geminiApiKey',
      'reviewLimit',
      'analysisHistory'
    ]);

    const defaults = {};
    if (existing.uiLanguage === undefined) defaults.uiLanguage = 'auto';
    if (existing.preferredLanguage === undefined) defaults.preferredLanguage = 'all';
    if (existing.geminiApiKey === undefined) defaults.geminiApiKey = '';
    if (existing.reviewLimit === undefined) defaults.reviewLimit = 60;
    if (existing.analysisHistory === undefined) defaults.analysisHistory = {};

    if (Object.keys(defaults).length > 0) {
      await chrome.storage.local.set(defaults);
    }
  } catch (error) {
    console.error('[SteamLens AI SW] Initialization error:', error);
  }
});

// Listener for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  (async () => {
    try {
      if (message.type === 'PING') {
        sendResponse({ status: 'PONG', timestamp: Date.now() });
      } else if (message.type === 'GET_SETTINGS') {
        const settings = await chrome.storage.local.get([
          'uiLanguage',
          'preferredLanguage',
          'geminiApiKey',
          'reviewLimit'
        ]);
        sendResponse({ success: true, settings });
      } else if (message.type === 'SAVE_SETTINGS') {
        await chrome.storage.local.set(message.settings || {});
        sendResponse({ success: true });
      } else if (message.type === 'CLEAR_CACHE') {
        await chrome.storage.local.remove('analysisHistory');
        sendResponse({ success: true });
      } else if (message.type === 'FETCH_STEAM_REVIEWS') {
        const { appId, options = {} } = message;
        const queryParams = new URLSearchParams({
          appid: String(appId),
          filter: options.filter || 'recent',
          language: options.language || 'all',
          num_per_page: Math.min(100, Math.max(20, options.numPerPage || 60)).toString(),
          purchase_type: options.purchaseType || 'all',
          review_type: 'all',
          cursor: '*'
        });

        const endpoint = `https://api.steampowered.com/IUserReviewsService/GetAppReviews/v1/?${queryParams.toString()}`;
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Steam API responded with HTTP ${response.status}`);
        }

        const data = await response.json();
        const payload = data.response || data;
        sendResponse({ success: true, data: payload });
      } else {
        sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[SteamLens AI SW] Message error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});
