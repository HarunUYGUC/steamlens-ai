# Privacy Policy for SteamLens AI

**Last Updated:** August 26, 2026  
**Effective Date:** August 26, 2026

SteamLens AI ("we", "our", or "the Extension") is committed to protecting user privacy. This Privacy Policy describes how SteamLens AI handles data in accordance with the Google Chrome Web Store Developer Program Policies.

---

## 1. Information Collection (Data Collection)
SteamLens AI operates on a strict **privacy-first, client-side** architecture:
* **No Personally Identifiable Information (PII):** We do not collect, extract, log, or track names, email addresses, Steam account credentials, financial data, or browsing history.
* **User Preferences:** The Extension stores user-selected preferences locally, including interface language (`auto`, `tr`, `en`), review scanning language (`all`, `turkish`, `english`), review fetch limit (`40`, `60`, `80`, `100`), and active engine mode (`rule` or `gemini`).
* **Optional API Key (BYOK):** If you choose to enable the Google Gemini AI mode, your personal Google Gemini API key is stored locally on your device.
* **Public Game Reviews:** The Extension fetches publicly available game reviews from Valve's official Steam Web API (`store.steampowered.com/appreviews`) solely to generate on-demand review summaries for the game you are viewing.

---

## 2. Information Processing and Usage (Data Processing)
All data processed by SteamLens AI is used exclusively for providing core extension features:
* **Rule-Based NLP Engine (Default):** Statistical and natural language processing is performed **100% locally** within your browser using JavaScript. No review data or query is sent to external servers.
* **Cloud Gemini AI Engine (Optional):** If and only if you explicitly enable Gemini mode and provide your own API key, anonymized review excerpts are transmitted via HTTPS directly to Google's Generative Language API (`generativelanguage.googleapis.com`) to generate the summary.
* **No Analytics or Tracking:** We do not use Google Analytics, telemetry trackers, cookies, or fingerprinting scripts.

---

## 3. Information Storage and Retention (Data Storage)
* **Local Storage Only:** All user settings and optional API keys are stored exclusively on your device using Chrome's local storage API (`chrome.storage.local`).
* **No Remote Servers:** We do not operate remote databases or external servers. We do not retain copies of your settings or API keys on any central server.
* **User Control and Deletion:** You can delete all locally stored preferences, cached analysis results, and API keys at any time by clicking the **"Sıfırla / Reset"** button in the extension popup or by uninstalling the extension from your browser.

---

## 4. Information Sharing and Disclosure (Data Sharing)
* **No Sale or Commercial Transfer:** We **never** sell, rent, trade, lease, or monetize user data under any circumstances.
* **Third-Party Services:**
  * **Valve Corporation (Steam):** Public review queries are made directly from your browser to `store.steampowered.com` under Valve's Public API terms.
  * **Google Cloud (Google AI Studio):** If you use the optional Gemini mode, requests are sent directly to Google AI endpoints governed by [Google's Privacy Policy](https://policies.google.com/privacy).
  * **CheapShark API:** Used strictly to fetch public digital storefront pricing for the currently viewed Steam App ID (`cheapshark.com`) without transmitting any personal identifier.
* No data is shared with any other third party, advertiser, or analytics provider.

---

## 5. Affiliate Disclosure & External Store Links
SteamLens AI includes a smart price-comparison buyer's guide feature that assists users in discovering legitimate discounts from authorized Steam key distributors (such as Humble Store):
* **User-Initiated Navigation:** All store links are opened only when explicitly clicked by the user in a new tab. The Extension does not execute background redirects, hidden iframes, or cookie stuffing.
* **Affiliate Partnerships:** When you click on an authorized store deal link and make a purchase, SteamLens AI may earn a small referral commission at no additional cost to you. This directly supports the ongoing maintenance and development of the extension.
* **Strictly Authorized Resellers:** SteamLens AI only references official, publisher-authorized digital retailers that supply legitimate Steam activation keys.

---

## 6. Security
All communication with external APIs (Steam Store, CheapShark, and Google Generative Language) occurs exclusively over secure, encrypted HTTPS connections. Your optional Gemini API key is never transmitted to us or any party other than Google AI Studio.

---

## 7. Children's Privacy
SteamLens AI does not knowingly collect or solicit any personal information from children under the age of 13.

---

## 8. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date.

---

## 9. Contact Us
If you have any questions or concerns about this Privacy Policy or SteamLens AI, please open an issue on our GitHub repository or contact the developer:
* **GitHub Repository:** [https://github.com/HarunUYGUC/steamlens-ai](https://github.com/HarunUYGUC/steamlens-ai)
* **Support / Developer Email:** Available on our Chrome Web Store listing page.
