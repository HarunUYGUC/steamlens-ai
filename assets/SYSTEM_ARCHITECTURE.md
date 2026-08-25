# 🤖 SteamLens AI — Sistem Mimarisi, Yaşam Döngüsü ve Veri Akış Rehberi

Bu belge, **SteamLens AI** Chrome eklentisinin ilk kurulum anından kullanıcının Steam mağazasında yapay zeka destekli oyun karnesini gördüğü ana kadar çalışan tüm dosyaların **çalışma sırasını, mimari sorumluluklarını, gerçekleşen veri akışını ve fonksiyonlar arası parametre aktarımlarını** detaylı olarak açıklamaktadır.

---

## 📑 İçindekiler
1. [🗺️ Büyük Resim: Sistem Mimari Şeması](#1-🗺️-büyük-resim-sistem-mimari-şeması)
2. [📂 Dosya Rolleri ve Sorumluluk Dağılımı](#2-📂-dosya-rolleri-ve-sorumluluk-dağılımı)
3. [⏱️ Uçtan Uca Yaşam Döngüsü (8 Aşamalı Çalışma Sırası)](#3-⏱️-uçtan-uca-yaşam-döngüsü-8-aşamalı-çalışma-sırası)
4. [📦 Parametre ve Veri Yapıları Sözlüğü (Data Models)](#4-📦-parametre-ve-veri-yapıları-sözlüğü-data-models)

---

## 1. 🗺️ Büyük Resim: Sistem Mimari Şeması

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CHROME EXTENSION RUNTIME                               │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│ 1. BACKGROUND (Service Worker)          │ 2. POPUP UI (Kullanıcı Paneli)               │
│ • src/background/service-worker.js      │ • src/popup/popup.html & popup.js            │
│   - Varsayılan ayarları yükler.          │ • src/shared/i18n.js                         │
│   - chrome.storage.local yönetir.       │   - Dil (TR/EN) & Motor (NLP/Gemini) seçimi  │
│                                         │   - Canlı storage senkronizasyonu            │
└─────────────────────────────────────────┴──────────────────────────────────────────────┘
                                      │ (chrome.storage.onChanged)
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. CONTENT SCRIPTS (Steam Mağaza Sayfasına Enjekte Edilen Katman)                      │
│                                                                                        │
│  [A] src/shared/i18n.js ────────► Çoklu dil sözlüğü ve formatlayıcı                   │
│  [B] src/content/steam-api.js ──► Steam API istemcisi & 3 Katmanlı Spam/Meme Filtresi  │
│  [C] src/content/ai-engine.js ──► Çift Motor: Gemini 3.6 Flash & Kural Tabanlı NLP     │
│  [D] src/content/content.js ────► Ana Orkestratör: DOM Enjeksiyonu, SPA Takibi & Kart  │
│  [E] src/content/content.css ───► Steam Koyu Neon Tema Stilleri                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. HARİCİ SERVİSLER & VERİ KAYNAKLARI                                                 │
│ • store.steampowered.com/appreviews/<appid> ──► Ham İncelemeler (Anahtarsız Public API) │
│ • generativelanguage.googleapis.com ──────────► Google AI Studio (BYOK Gemini API)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 📂 Dosya Rolleri ve Sorumluluk Dağılımı

| Dosya Yolu | Katman | Temel Sorumluluğu |
| :--- | :--- | :--- |
| **`manifest.json`** | Yapılandırma | Eklenti kimliği, izinler (`storage`, `host_permissions`), ikonlar ve dosya eşleme kuralları. |
| **`src/background/service-worker.js`** | Arka Plan | Yaşam döngüsü dinleyicisi (`onInstalled`), varsayılan ayar atamaları ve mesajlaşma köprüsü. |
| **`src/shared/i18n.js`** | Ortak Modül | Türkçe ve İngilizce çeviri sözlükleri, otomatik tarayıcı dili çözümleyici (`resolveLanguage`) ve metin formatlayıcı (`t`). |
| **`src/content/steam-api.js`** | Veri Katmanı | URL'den App ID çıkarma, Steam API'den ham inceleme çekme, BBCode/ASCII temizleme ve spam eleme. |
| **`src/content/ai-engine.js`** | Analiz Katmanı | Kural Tabanlı İstatiksel NLP Motoru (0.01 sn) ve Google Gemini 3.6 Flash Bulut AI Motoru. |
| **`src/content/content.js`** | UI & Orkestrasyon | Steam sayfasına buton yerleştirme, SPA sayfa geçiş takibi, yükleme durumları, karne kartı render etme ve panoya kopyalama. |
| **`src/content/content.css`** | Tasarım | Steam natif koyu temalı arayüz, skeleton yükleme animasyonları, buton ve metrik stilleri. |
| **`src/popup/popup.html & js`** | Kontrol Paneli | Kullanıcının motor seçimi (NLP ⇄ Gemini), dil seçimi (TR ⇄ EN), inceleme limiti, API anahtarı testi ve önbellek sıfırlama. |

---

## 3. ⏱️ Uçtan Uca Yaşam Döngüsü (8 Aşamalı Çalışma Sırası)

### 🟢 1. Aşama: Eklenti Kurulumu ve Başlatma
1. Kullanıcı eklentiyi yükler.
2. `manifest.json` okunur ve `service-worker.js` arka planda ayağa kalkar.
3. `chrome.runtime.onInstalled` olayı tetiklenir.
4. `chrome.storage.local` kontrol edilir; kullanıcı henüz ayar yapmadıysa varsayılanlar atanır:
   `{ uiLanguage: 'auto', preferredLanguage: 'all', reviewLimit: 60, geminiApiKey: '', engineMode: 'rule' }`

---

### 🔵 2. Aşama: Steam Oyun Sayfasının Açılması ve Enjeksiyon
1. Kullanıcı Steam'de bir oyuna girer (Örn: `https://store.steampowered.com/app/1091500/Cyberpunk_2077/`).
2. Chrome, `manifest.json`'daki kural gereği sayfaya sırasıyla şu dosyaları enjekte eder:
   * 1. `src/shared/i18n.js`
   * 2. `src/content/steam-api.js`
   * 3. `src/content/ai-engine.js`
   * 4. `src/content/content.js`
   * 5. `src/content/content.css`

---

### 🟡 3. Aşama: Sayfa İçi Butonun Yerleştirilmesi (`content.js`)
1. `content.js` içindeki `init()` fonksiyonu çalışır:
   * `chrome.storage.local.get` ile kullanıcının ayarlarını alır (`state.settings`).
   * `SteamApiClient.getAppIdFromUrl()` ile URL'den oyun kimliğini çıkarır (`appId = "1091500"`).
   * `findInjectionTarget()` ile Steam sayfasındaki satın alma alanı (`.game_area_purchase`) bulunur.
   * `injectTriggerButton()` ile **"🤖 SteamLens AI ile İncelemeleri Özetle"** butonu sayfaya yerleştirilir.
2. `observeNavigation()` başlatılır:
   * Steam bir Tek Sayfa Uygulaması (SPA) olduğu için, kullanıcı sayfayı yenilemeden başka bir oyuna geçerse `MutationObserver` 350 ms debouncing ile bunu anında yakalar ve butonu yeni oyuna taşır.

---

### 🟠 4. Aşama: Kullanıcı Butona Tıklar & Veri Çekme Başlar
1. Kullanıcı butona tıklar ➔ `startAnalysis(false)` tetiklenir.
2. `renderLoading()` çalışır ➔ Sayfaya yanıp sönen skeleton (iskelet) yükleme kutusu enjekte edilir.
3. **Steam API Çağrısı:** `SteamApiClient.fetchReviews(appId, options)` çalışır:
   * **Giden Parametreler:**
     * `appId: "1091500"`
     * `options: { language: "all", numPerPage: 60, filter: "recent" }`
   * **Ağ İsteği:** `GET https://store.steampowered.com/appreviews/1091500?json=1&language=all&num_per_page=60...`
   * **Dönen Yanıt:** 60 adet ham inceleme metnini içeren JSON nesnesi (`rawData`).

---

### 🔴 5. Aşama: 3 Katmanlı Spam ve Meme Temizleme Filtresi
`SteamApiClient.processReviews(rawData)` fonksiyonu ham veriyi temizler:
1. `cleanReviewText()`: BBCode etiketleri (`[b]`, `[quote]`, `[url]`), HTML varlıkları ve ASCII/Braille çizimleri (`░`, `█`, `⣿`) temizlenir.
2. `isMemeOrSpam()`: *"10/10"*, *"amogus"*, *"award please"*, *"hanımım beni terk etti"* gibi işe yaramaz şaka yorumları elenir.
3. İncelemeler faydalılık puanına (`weightedVoteScore`) göre sıralanır.
4. Çıktı olarak **`processedData`** paketi hazırlanır.

---

### 🟣 6. Aşama: Çift Analiz Motorunun Çalışması (`ai-engine.js`)
`processedData` paketi `SteamLensAIEngine.analyze(processedData, options)` fonksiyonuna aktarılır. Kullanıcının aktif moduna göre iki yoldan biri seçilir:

#### A Yolu: Kural Tabanlı Hızlı NLP Motoru (Varsayılan - 0.01 sn)
* `runRuleBasedAnalysis(validReviews, stats, lang)` çalışır.
* 5 ms içinde optimizasyon, hikaye, oynanış, fiyat ve yama frekansları hesaplanır.
* `SteamLensI18n.t(...)` sözlüğüyle dinamik cümleler hedef dilde (TR veya EN) üretilir.

#### B Yolu: Google Gemini AI Modu (Bulut)
* `runCloudGeminiAnalysis(validReviews, stats, apiKey, lang)` çalışır.
* En yapıcı 10 olumlu ve 10 olumsuz yorum filtrelenir.
* `systemInstruction` ve inceleme bağlamı seçilen dilde Google AI Studio API'sine (`gemini-3.6-flash`) gönderilir.
* Dönen yapılandırılmış JSON nesnesi parse edilir.

---

### 🏁 7. Aşama: Karnenin Ekrana Basılması (`content.js` ➔ DOM)
1. `renderResult(analysisResult)` çağrılır.
2. İskelet yükleme kutusu kaldırılır ve yerine tam karne kartı yerleştirilir:
   * **Metrik Barı:** Topluluk Onayı (%74), Optimizasyon Skoru (%82), Ortalama Oynanış (21 saat), Filtrelenmiş İnceleme (38 / 60).
   * **Detay Kartları:** Güçlü Yönler (Pros), Kritik Sorunlar (Cons), Yama Durumu, Fiyat Değerlendirmesi.
3. `copySummaryToClipboard()` ile tek tıkla şık biçimlendirilmiş markdown çıktısı panoya kopyalanabilir.
4. Sonuç `state.cache.set(appId, analysisResult)` ile oturum boyunca önbelleklenir.

---

### 🎛️ 8. Aşama: Popup Kontrol Paneli & Canlı Senkronizasyon
1. Kullanıcı sağ üstteki eklenti simgesine tıklar (`popup.html` ve `popup.js` açılır).
2. Kullanıcı dili (`🇹🇷 Türkçe` ➔ `🇬🇧 English`) veya motoru (`🚀 NLP` ➔ `⚡ Gemini`) değiştirdiğinde `chrome.storage.local.set` çağrılır.
3. `content.js` içindeki `chrome.storage.onChanged` dinleyicisi bu değişikliği anında yakalar ve **sayfayı yenilemeye gerek kalmadan** butonu ve açık karne kartını yeni ayarlara göre günceller.

---

## 4. 📦 Parametre ve Veri Yapıları Sözlüğü (Data Models)

### A. Temizlenmiş İnceleme Verisi (`processedData`)
```javascript
{
  totalFetched: 60,
  validCount: 38,
  validReviews: [
    {
      id: "12345678",
      votedUp: true,
      text: "Oynanış akıcı, optimizasyon son yamayla düzelmiş...",
      playtimeHours: 24.5,
      weightedVoteScore: 0.92
    }
  ],
  stats: {
    positiveCount: 28,
    negativeCount: 10,
    positivePercentage: 74,
    avgPlaytimeHours: 21
  }
}
```

### B. Nihai Analiz Çıktısı (`analysisResult`)
```javascript
{
  tier: "Kural Tabanlı NLP & İstatistik", // veya "Gemini AI (Flash)"
  tierCode: "rule", // veya "cloud"
  isAI: false,
  verdict: "Topluluğun %74'ü tarafından tavsiye edilen stabil bir yapım.",
  optimizationScore: 82,
  optimizationSummary: "Optimizasyon Sağlık Skoru %82/100. Performans oldukça akıcı ve stabil.",
  pros: [
    "Akıcı ve tatmin edici oynanış dinamikleri oyuncuların %74'ü tarafından övülüyor.",
    "Donanım uyumluluğu ve genel performans stabil bir seviyede."
  ],
  cons: [
    "İncelenen yorumların %26'sında FPS düşüşü veya takılma şikayeti var."
  ],
  patchImpact: "İncelemelerde son güncellemelere değinilmiş (3 yorum); geliştirici aktif destekliyor.",
  valueAnalysis: "Ortalama 21 saatlik oynanışla fiyatını hak ediyor.",
  stats: { ... }
}
```
