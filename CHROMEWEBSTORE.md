# Chrome Web Store Yayınlama Paketi & Meta Verileri / Store Metadata

---

## 🇬🇧 English Store Listing (Global Default)

### 1. Basic Metadata
- **Extension Name:** `SteamLens AI — Steam Review Summarizer`
- **Short Description (Max 132 chars):**
  `AI assistant that instantly filters and summarizes Steam reviews using smart NLP and Google Gemini AI.`
- **Category:** Productivity / Shopping & Entertainment
- **Default Locale:** `en` (with Turkish `tr` locale included)
- **Version:** `1.3.0`

### 2. Store Listing Description (English)

```markdown
🎮 SteamLens AI — Steam Review Summarizer & Analysis Assistant

Tired of scrolling through hundreds of joke reviews, ASCII cats, and meme copypastas just to see if a game is worth buying?
SteamLens AI scans Steam community reviews in seconds, cleans out spam and unhelpful noise, and delivers a clear, objective game scorecard.

🚀 KEY FEATURES:

✅ Dual-Engine Architecture:
- 🚀 Fast Rule-Based NLP (Default): Zero latency, zero GPU/network load, runs in 0.01s with instant statistical sentiment analysis.
- ⚡ Cloud Gemini AI: Synthesizes complex player sentiment, nuanced complaints, and constructive gameplay feedback using Google Gemini.

✅ Smart Spam & Meme Filter:
- Automatically filters out "10/10", ASCII art, one-word spam, and point-farming copypastas to evaluate only constructive reviews.

✅ Comprehensive Game Scorecard:
- 💡 Clear Verdict & Purchase Recommendation
- ⚡ Optimization & Performance Score (0-100%)
- 🟢 Key Strengths (Pros)
- 🔴 Critical Issues & Complaints (Cons)
- ⚡ Recent Updates & Patch Status
- ⏱️ Price / Time / Value Analysis
- 📊 Community Approval & Average Playtime

✅ 100% Privacy-Focused:
- Zero user data collection or telemetry.
- Optional API keys are stored locally on your device (`chrome.storage.local`).
- Zero background idle resource usage.

How to Use:
1. Install SteamLens AI.
2. Navigate to any Steam game store page.
3. Click "Summarize Reviews with SteamLens AI" to get an instant report!
```

---

## 🇹🇷 Türkçe Mağaza Bilgileri (Turkish Locale)

### 1. Temel Bilgiler
- **Uzantı Adı:** `SteamLens AI — Steam İnceleme Özeti`
- **Kısa Açıklama (Maks. 132 karakter):**
  `Steam mağazasındaki incelemeleri akıllı NLP ve Google Gemini AI ile anında özetleyen yapay zeka asistanı.`
- **Kategori:** Üretkenlik / Alışveriş & Eğlence

### 2. Detaylı Mağaza Açıklaması (Türkçe)

```markdown
🎮 SteamLens AI — Steam İnceleme Özeti ve Analiz Asistanı

Steam'de bir oyunu satın almadan önce yüzlerce incelemeyi tek tek okumaktan yoruldunuz mu?
SteamLens AI, oyun sayfalarındaki topluluk incelemelerini tarar, spam ve meme yorumları filtreler ve saniyeler içinde tarafsız, kapsamlı bir özet çıkarır.

🚀 ÖNE ÇIKAN ÖZELLİKLER:

✅ Çift Motor Teknolojisi (Hızlı NLP & Google Gemini AI):
- 🚀 Kural Tabanlı NLP (Varsayılan): 0 ms gecikme, sıfır donanım yükü ile anında istatistiksel özet çıkarır.
- ⚡ Bulut Gemini AI: Google Gemini'nin güçlü dil modeliyle derinlemesine satın alma tavsiyesi ve detaylı inceleme sentezi sunar.

✅ Spam ve Meme Filtreleme:
- "10/10", ASCII kedi çizimleri, tek kelimelik incelemeler ve copypasta metinleri otomatik elenir; yalnızca oyunu gerçekten anlatan yapıcı yorumlar dikkate alınır.

✅ Kapsamlı Oyun Karnesi:
- 💡 Genel Değerlendirme & Satın Alma Tavsiyesi
- ⚡ Optimizasyon Sağlık Skoru (%0 - %100)
- 🟢 Güçlü Yönler (Artılar)
- 🔴 Kritik Sorunlar & Şikayetler (Eksiler)
- ⚡ Son Güncellemeler & Yama Durumu
- ⏱️ Fiyat / Süre / Değer Analizi
- 📊 Topluluk Onayı & Ortalama Oynanış Süresi

✅ Gizlilik ve Güvenlik Odaklı:
- Verileriniz asla üçüncü taraflarla paylaşılmaz.
- API anahtarlarınız yalnızca kendi tarayıcınızda (yerel olarak) saklanır.
- Sıfır GPU ve sıfır arka plan yükü.

Nasıl Kullanılır?
1. Eklentiyi yükleyin.
2. Herhangi bir Steam oyun sayfasına gidin.
3. "SteamLens AI ile İncelemeleri Özetle" butonuna tıklayın ve anında net bir özet alın!
```

---

## 3. İzinler ve Gerekçeleri (Permissions Justification)

1. **`storage` İzni:**
   - *Justification / Gerekçe:* Stores user preferences (UI language, review limit, engine mode, and optional local Gemini API key) safely in browser local storage.

2. **`host_permissions` (`https://store.steampowered.com/*`):**
   - *Justification / Gerekçe:* Required to inject the review summary button on Steam store pages and fetch review data via Steam's public Web API (`appreviews`).

3. **`host_permissions` (`https://generativelanguage.googleapis.com/*`):**
   - *Justification / Gerekçe:* Required for optional Bring-Your-Own-Key Google Gemini AI cloud analysis when the user opts into Gemini mode.

---

## 4. Gizlilik Beyanı (Privacy Policy)

- SteamLens AI does not collect, track, or share any user personal data, browsing history, or identities.
- All analyses are processed directly in the user's browser or via the user's personal Google AI Studio API key.
