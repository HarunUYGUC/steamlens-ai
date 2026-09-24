# SteamLens AI — Mimari Notlar ve Mühendislik Kararları (Engineering Deep Dive)

Bu doküman; **SteamLens AI** Chrome uzantısının geliştirme sürecinde alınan kritik yazılım mimarisi kararlarını, DOM manipülasyonu tekniklerini, Tek Sayfa Uygulaması (SPA) uyumluluk stratejilerini, Çift Motorlu (Dual-Engine) analiz boru hattını, siber güvenlik tedbirlerini ve durum yönetimi modellerini detaylandıran kapsamlı teknik referanstır.

---

## İçindekiler
1. [Chrome Uzantısı ve Manifest V3 Mimarisi](#1-chrome-uzantısı-ve-manifest-v3-mimarisi)
   - [1.1 İzole Dünya (Isolated World) ve Yürütme Sıralaması](#11-izole-dünya-isolated-world-ve-yürütme-sıralaması)
   - [1.2 Neden ES Modules (`import/export`) Yerine Saf Vanilla JS ve `window` Köprüsü?](#12-neden-es-modules-importexport-yerine-saf-vanilla-js-ve-window-köprüsü)
   - [1.3 İki Kademeli Çalışma Modeli: Service Worker vs. Content Script vs. Popup](#13-iki-kademeli-çalışma-modeli-service-worker-vs-content-script-vs-popup)
   - [1.4 İzin Modeli ve Sıfır Telemetri Güvenlik Prensibi](#14-izin-modeli-ve-sıfır-telemetri-güvenlik-prensibi)
2. [DOM Enjeksiyonu ve SPA (Tek Sayfa Uygulaması) Mühendisliği](#2-dom-enjeksiyonu-ve-spa-tek-sayfa-uygulaması-mühendisliği)
   - [2.1 Karar Noktası UX'i ve Aşamalı Hedef Arama (`findInjectionTarget`)](#21-karar-noktası-uxi-ve-aşamalı-hedef-arama-findinjectiontarget)
   - [2.2 DOM Yerleşim Hileleri: `insertBefore` ve `nextSibling` (`insertAfter` Eşleniği)](#22-dom-yerleşim-hileleri-insertbefore-ve-nextsibling-insertafter-eşleniği)
   - [2.3 Sayfa Nöbetçisi (`MutationObserver`) ve `Debounce` (350ms) Optimizasyonu](#23-sayfa-nöbetçisi-mutationobserver-ve-debounce-350ms-optimizasyonu)
   - [2.4 Dinamik Temizlik ve Bellek Sızıntısı Koruması (`removeInjectedElements`)](#24-dinamik-temizlik-ve-bellek-sızıntısı-koruması-removeinjectedelements)
3. [Çift Motorlu (Dual-Engine) Analiz Mimarisi](#3-çift-motorlu-dual-engine-analiz-mimarisi)
   - [3.1 0.01s Yerel İstatistiksel NLP vs. Google Cloud Gemini AI](#31-001s-yerel-istatistiksel-nlp-vs-google-cloud-gemini-ai)
   - [3.2 3 Kademeli Spam, Meme ve ASCII Sanatı Temizleme Boru Hattı](#32-3-kademeli-spam-meme-ve-ascii-sanatı-temizleme-boru-hattı)
   - [3.3 BYOK (Bring Your Own Key) Modeli ve Hızlı Ping Testi (<1s Erken Çıkış)](#33-byok-bring-your-own-key-modeli-ve-hızlı-ping-testi-1s-erken-çıkış)
   - [3.4 Hata Toleransı ve Sessiz Düşüş (Graceful Degradation / Fallback)](#34-hata-toleransı-ve-sessiz-düşüş-graceful-degradation--fallback)
4. [Siber Güvenlik, Veri ve Durum Yönetimi](#4-siber-güvenlik-veri-ve-durum-yönetimi)
   - [4.1 XSS (Cross-Site Scripting) Savunması: `escapeHtml` Fonksiyonu](#41-xss-cross-site-scripting-savunması-escapehtml-fonksiyonu)
   - [4.2 Nesne Parçalama (Object Destructuring) ile Temiz Veri Ayrıştırma](#42-nesne-parçalama-object-destructuring-ile-temiz-veri-ayrıştırma)
   - [4.3 `chrome.storage.onChanged` ile Canlı ve Reaktif Durum Senkronizasyonu](#43-chromestorageonchanged-ile-canlı-ve-reaktif-durum-senkronizasyonu)
   - [4.4 `static` Sınıf Metotları vs. Örnekleme (`new`) Ayrımı](#44-static-sınıf-metotları-vs-örnekleme-new-ayrımı)
5. [Uluslararasılaştırma (i18n) Stratejisi](#5-uluslararasılaştırma-i18n-stratejisi)
   - [5.1 Çift Katmanlı Yerelleştirme Modeli: `_locales` vs. `src/shared/i18n.js`](#51-çift-katmanlı-yerelleştirme-modeli-_locales-vs-srcsharedi18njs)
   - [5.2 Otomatik Dil Çözümleme (`resolveLanguage`) ve Dinamik Parametre Doldurma](#52-otomatik-dil-çözümleme-resolvelanguage-ve-dinamik-parametre-doldurma)
6. [Stil Sistemi ve Algılanan Performans](#6-stil-sistemi-ve-algılanan-performans)
   - [6.1 Steam Natif Dark Theme ve CSS Değişkenleri (`var(--sl-*)`)](#61-steam-natif-dark-theme-ve-css-değişkenleri-varsl-)
   - [6.2 Skeleton Loading ile Sıfır Düzen Kayması (CLS Önleme)](#62-skeleton-loading-ile-sıfır-düzen-kayması-cls-önleme)

---

## 1. Chrome Uzantısı ve Manifest V3 Mimarisi

### 1.1 İzole Dünya (Isolated World) ve Yürütme Sıralaması
Chrome eklentilerinde `content_scripts`, güvenlik nedeniyle web sayfasından izole edilmiş bir yürütme ortamında (**Isolated World**) çalışır:
* **Ortak Alan:** Content script ile Steam sayfası aynı DOM ağacını paylaşır (Steam elementlerini okuyabilir ve yeni HTML enjekte edebilir).
* **Ayrık Alan:** Sayfanın JavaScript nesneleri (`window`) ile eklentinin `window` nesnesi birbirinden tamamen yalıtılmıştır. Steam sayfasına sızabilecek kötü niyetli bir betik, eklentinin iç değişkenlerine veya hafızadaki API anahtarına erişemez.

`manifest.json` dosyasında tanımlanan betikler belirli bir sırayla yüklenir:
```json
"content_scripts": [
  {
    "matches": ["https://store.steampowered.com/app/*"],
    "js": [
      "src/shared/i18n.js",
      "src/content/steam-api.js",
      "src/content/ai-engine.js",
      "src/content/content.js"
    ],
    "css": ["src/content/content.css"],
    "run_at": "document_idle"
  }
]
```
`document_idle` değeri, Steam'in ana HTML ve CSS ağacı tamamen kurulduktan sonra eklentiyi çalıştırarak sayfa açılış hızına (LCP - Largest Contentful Paint) olumsuz etki etmesini engeller.

---

### 1.2 Neden ES Modules (`import/export`) Yerine Saf Vanilla JS ve `window` Köprüsü?

* **Manifest V3 Kısıtlaması:** Chrome Manifest V3'te arka plan Service Worker'ı ES modüllerini (`"type": "module"`) desteklerken, sayfa içine enjekte edilen `content_scripts` bölümünde doğrudan `import / export` deklarasyonları desteklenmez.
* **Mühendislik Kararı (Sıfır Bağımlılık):** Webpack, Vite veya Rollup gibi derleyici/paketleyici (bundler) katmanlarını projeye dahil etmek yerine, saf Vanilla JS yaklaşımı benimsenmiştir.
* **Küresel Köprü Deseni:** `steam-api.js` ve `ai-engine.js` dosyaları sınıflarını doğrudan uzantının izole `window` nesnesine iliştirir:
  ```javascript
  // steam-api.js
  if (typeof window !== 'undefined') {
    window.SteamApiClient = SteamApiClient;
  }
  ```
  `manifest.json` sıralamasında 4. sırada çalışan `content.js`, herhangi bir derleyiciye ihtiyaç duymadan `window.SteamApiClient` nesnesine anında ve güvenle erişir. Bu sayede tüm proje **sıfır harici kütüphane** ile inşa edilmiş ve paket boyutu **<40 KB** seviyesinde tutulmuştur.

---

### 1.3 İki Kademeli Çalışma Modeli: Service Worker vs. Content Script vs. Popup

```
┌────────────────────────────────────────────────────────┐
│                   POPUP (Kullanıcı Paneli)             │
│  - Dil seçimi (TR/EN/Auto)                             │
│  - Motor seçimi (Kural Tabanlı / Gemini AI)            │
│  - BYOK API Anahtarı testi ve saklanması               │
└───────────────────────────┬────────────────────────────┘
                            │ chrome.storage.local
                            ▼
┌────────────────────────────────────────────────────────┐
│             BACKGROUND (Service Worker)                │
│  - Uzantı kurulum/güncelleme dinleyicisi               │
│  - Varsayılan ayarların (defaults) başlatılması        │
└───────────────────────────┬────────────────────────────┘
                            │ chrome.storage.onChanged
                            ▼
┌────────────────────────────────────────────────────────┐
│              CONTENT SCRIPT (Steam Sayfası)            │
│  - DOM Enjeksiyonu & SPA Takibi (MutationObserver)     │
│  - Steam API İstemcisi & Spam Temizleme               │
│  - Kural Tabanlı NLP & Gemini AI Motoru               │
└────────────────────────────────────────────────────────┘
```

1. **Popup (`src/popup/`):** Yalnızca kullanıcı eklenti simgesine tıkladığında açılan, ayarları ve API testini yöneten arayüz.
2. **Background (`src/background/service-worker.js`):** `chrome.runtime.onInstalled` ile ilk kurulum anında devreye giren ve tarayıcı belleğindeki varsayılan tercihleri (`engineMode: 'rule'`, `reviewLimit: 60`) oluşturan hafif arka plan işçisi.
3. **Content Script (`src/content/`):** Steam sayfasına doğrudan nüfuz eden, veriyi çeken, filtreleyen, analiz eden ve arayüzü inşa eden operasyonel çekirdek.

---

### 1.4 İzin Modeli ve Sıfır Telemetri Güvenlik Prensibi

Uzantı `manifest.json` içinde minimum ayrıcalık prensibiyle (Principle of Least Privilege) sınırlandırılmıştır:
* **`permissions: ["storage"]`:** Tercihleri yalnızca yerel cihazda (`chrome.storage.local`) tutmak için kullanılır; çerezlere, geçmişe veya sekmelere erişim izni istenmez.
* **`host_permissions`:**
  - `https://store.steampowered.com/*`: Yorumları Steam'in halka açık API'sinden çekmek için.
  - `https://generativelanguage.googleapis.com/*`: İsteğe bağlı Gemini modunda yapay zeka analizini doğrudan istemciden Google'a göndermek için.
* **Sıfır Sunucu & Sıfır İzleme:** Eklentinin kendine ait harici bir sunucusu veya veritabanı yoktur. Kullanıcı verisi, IP adresi veya gezinme geçmişi asla kaydedilmez ya da üçüncü taraflarla paylaşılmaz.

---

## 2. DOM Enjeksiyonu ve SPA (Tek Sayfa Uygulaması) Mühendisliği

### 2.1 Karar Noktası UX'i ve Aşamalı Hedef Arama (`findInjectionTarget`)

Bir oyuncunun incelemelere en çok ihtiyaç duyduğu an, oyunun fiyatını görüp **"Satın Al" (Buy)** butonuna tıklamayı düşündüğü andır. Butonun sayfanın en dibindeki yorumların yanına değil, satın alma alanının hemen üstüne konması bu UX kararına dayanır.

Steam sayfaları standart oyunlar, oynaması ücretsiz oyunlar (Free-to-Play), demolar ve henüz çıkmamış oyunlar arasında şablon farklılıkları gösterir. Eklentinin hiçbir sayfada çökmemesi için **kademeli arama (fallback chain)** uygulanmıştır:

```javascript
// src/content/content.js
function findInjectionTarget() {
  return (
    document.querySelector('.game_area_purchase') || // 1. Öncelik: Standart satın alma kutusu
    document.getElementById('game_area_purchase') ||  // 2. Öncelik: ID bazlı satın alma alanı
    document.getElementById('game_highlights') ||     // 3. Öncelik: Çıkmamış oyunlarda fragman galerisinin altı
    document.getElementById('userReviews') ||         // 4. Öncelik: Kullanıcı incelemeleri alanı
    document.querySelector('.user_reviews')           // 5. Öncelik: Alternatif inceleme sınıfı
  );
}
```
JavaScript'in kısa devre (short-circuit) değerlendirme mantığı sayesinde ilk eşleşen elemanda döngü durur; sayfada satın alma kutusu yoksa buton otomatik olarak fragman alanının altına güvenle yerleşir.

---

### 2.2 DOM Yerleşim Hileleri: `insertBefore` ve `nextSibling` (`insertAfter` Eşleniği)

#### A. Butonun Satın Alma Alanının Üstüne Eklenmesi:
```javascript
targetContainer.parentNode.insertBefore(wrapper, targetContainer);
```
* **Neden `appendChild` Değil?** `targetContainer.appendChild(wrapper)` yapılsaydı, buton satın alma kutusunun içine girer ve Steam'in yeşil sepet butonlarının tasarımını bozardı.
* **`parentNode.insertBefore`:** Hedef kutunun ebeveynine gidilerek, buton kutusu satın alma alanının hemen dışına ve bir üst satırına bağımsız bir blok olarak enjekte edilir.

#### B. Analiz Karnesinin Butonun Altına Eklenmesi (`insertAfter` Hilesi):
JavaScript DOM standardında `insertBefore` varken yerel bir `insertAfter` metodu bulunmaz. Bir elementi X elementinin **arkasına** eklemek için yazılım dünyasındaki evrensel kalıp kullanılır:
```javascript
triggerWrapper.parentNode.insertBefore(container, triggerWrapper.nextSibling);
```
*"Kutuyu, butonun bir sonraki kardeşinin (`nextSibling`) önüne koy."* Bu mantık, analiz kartının tam butonun altında ve satın alma alanının üstünde açılmasını garanti eder. `nextSibling` değeri `null` olsa bile (buton son çocuksa) `insertBefore(..., null)` yerel olarak `appendChild` gibi davranarak en sona ekler ve kodun patlamasını engeller.

---

### 2.3 Sayfa Nöbetçisi (`MutationObserver`) ve `Debounce` (350ms) Optimizasyonu

#### Problem (SPA Sayfa Geçişleri):
Steam modern bir Tek Sayfa Uygulamasıdır (SPA). Kullanıcı oyunlar arasında gezinirken sayfa baştan yüklenmez (`window.onload` tetiklenmez). Yalnızca URL ve DOM içeriği dinamik olarak güncellenir; bu durum eklenti butonunun kaybolmasına yol açar.

#### Çözüm ve Debounce Kalkanı:
```javascript
function observeNavigation() {
  let lastUrl = window.location.href;
  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        checkAndInject(); // URL değiştiyse yeni oyuna butonu koy
      } else if (!document.getElementById('steamlens-trigger-wrapper')) {
        checkAndInject(); // Steam DOM'u güncelleyip butonu sildiyse tekrar koy
      }
    }, 350);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
```
* **Neden Debounce (350ms)?** Steam'de bir sayfa yüklenirken veya sepet güncellenirken tek bir saniyede yüzlerce DOM mutasyonu gerçekleşebilir. Eğer `MutationObserver` her mutasyonda çalışsaydı, saniyede 300-500 kez enjeksiyon fonksiyonu tetiklenir ve tarayıcıda **Layout Thrashing (Arayüz Kilitlenmesi)** yaşanırdı.
* **Asansör Kapısı Mantığı:** 350 milisaniyelik zamanlayıcı, DOM hareketleri tamamen durulana kadar bekler ve sakinleştiğinde tüm sayfayı tek bir hamlede kontrol eder.

---

### 2.4 Dinamik Temizlik ve Bellek Sızıntısı Koruması (`removeInjectedElements`)

Kullanıcı bir oyun sayfasından Steam topluluk sayfasına veya ana sayfaya geçtiğinde:
```javascript
function removeInjectedElements() {
  const btn = document.getElementById('steamlens-trigger-wrapper');
  if (btn) btn.remove();
  const container = document.getElementById('steamlens-container');
  if (container) container.remove();
}
```
Artık ihtiyaç duyulmayan DOM ağaçları hafızadan tamamen silinir. Ayrıca `state.cache` haritası oturum bazlı çalışarak gereksiz bellek tüketiminin önüne geçer.

---

## 3. Çift Motorlu (Dual-Engine) Analiz Mimarisi

### 3.1 0.01s Yerel İstatistiksel NLP vs. Google Cloud Gemini AI

SteamLens AI, iki farklı analiz motorunu tek bir çatı altında birleştirir:

| Karşılaştırma Kriteri | 🚀 Kural Tabanlı Hızlı NLP (Varsayılan) | ⚡ Cloud Google Gemini AI (Opsiyonel / BYOK) |
| :--- | :--- | :--- |
| **Yürütme Yeri** | %100 İstemci Tarayıcısı (Local JS) | Google AI Studio Sunucuları (Cloud REST API) |
| **Gecikme (Latency)** | **~0.01 saniye (10 ms)** | ~1.5 – 3.0 saniye |
| **Ağ İsteği (API Call)** | Sıfır (Tamamen yerel) | 1 HTTPS POST isteği |
| **Donanım / GPU Yükü** | %0 GPU, fan çalıştırmaz | %0 GPU (İşlem bulutta yapılır) |
| **API Anahtarı Gereksinimi** | Gerekmez (Kutudan çıktığı gibi çalışır) | Ücretsiz Google AI Studio API anahtarı gerekir |
| **Analiz Kabiliyeti** | Anahtar kelime frekansı, duygu puanı, regex filtreleri | İroni/sarkazm anlama, derin sentez, yama etkisi yorumlama |

---

### 3.2 3 Kademeli Spam, Meme ve ASCII Sanatı Temizleme Boru Hattı

Steam inceleme bölümleri genellikle *"10/10 köpeğim oynadı"*, ASCII kedi çizimleri ve Steam puanı toplamak için yazılmış anlamsız şakalarla doludur. `SteamApiClient.processReviews()` fonksiyonu bu gürültüyü temizlemek için 3 kademeli bir filtre uygular:

```
[Ham Steam İncelemeleri] (Örn: 60 Adet)
        │
        ▼ (Kademe 1: Biçimlendirme Temizliği)
[BBCode / HTML / URL Ayıklama]
        │
        ▼ (Kademe 2: Kalıp Filtresi)
[ASCII Sanatı, Braille Desenleri, Kutu Çizim Karakterleri]
        │
        ▼ (Kademe 3: Meme & İfade Filtresi)
[1-2 Kelimelik Espriler, "10/10", Noktalama Duvarları]
        │
        ▼
[Yapıcı Yorum Havuzu] (Örn: 42 Adet) ➔ Analiz Motoruna Giriş
```

1. **BBCode & HTML Temizliği:** `[h1]`, `[b]`, `[list]` ve linkler regex ile arındırılır.
2. **ASCII & Sanat Filtresi:** `[\u2580-\u259F]` (kutu karakterleri) ve `[\u2800-\u28FF]` (Braille desenleri) içeren spam blokları elenir.
3. **Meme & Düşük Efor Filtresi:** 15 karakterden kısa olan veya yalnızca `"10/10"`, `"yes"`, `"good"` gibi puan çiftliği yapan kalıplar ayıklanır.
4. **Şeffaflık Metriği:** Kullanıcı arayüzünde çekilen toplam inceleme ile analize giren yapıcı inceleme sayısı şeffafça gösterilir (Örn: `🔍 42 / 60 Yapıcı İnceleme`).

---

### 3.3 BYOK (Bring Your Own Key) Modeli ve Hızlı Ping Testi (<1s Erken Çıkış)

Kullanıcıların kendi ücretsiz Google AI Studio anahtarlarını kullanabilmesi için ayarlar panelinde (`popup.js`) akıllı bir test mekanizması geliştirilmiştir:

```javascript
// src/popup/popup.js
async function testGeminiApiKey(apiKey) {
  // 1. Kullanıcının erişebildiği modelleri listele
  const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
  ...
  // 2. generateContent destekleyen Gemini modellerini filtrele ve hız/yeni önceliğine göre sırala
  geminiModels.sort((a, b) => score(b.name) - score(a.name));

  // 3. Erken Çıkış (Early Termination): Sadece ilk 2 adayı ping'le, ilki başarılı olursa <1s içinde dön!
  for (const modelObj of geminiModels.slice(0, 2)) {
    const testGenUrl = `.../${modelObj.name}:generateContent?key=...`;
    const genRes = await fetch(testGenUrl, { method: 'POST', body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] }) });
    if (genRes.ok) {
      return { success: true, model: shortName };
    }
  }
}
```
Tüm modelleri tek tek deneyip kullanıcıyı 10 saniye bekletmek yerine; en hızlı Flash modelleri öne alınır, tek kelimelik `"Ping"` isteği atılır ve ilk çalışan modelde döngü sonlandırılarak test **1 saniyenin altında** tamamlanır.

---

### 3.4 Hata Toleransı ve Sessiz Düşüş (Graceful Degradation / Fallback)

Yazılım mühendisliğinde kullanıcıya asla boş veya kırık bir ekran gösterilmemelidir. Gemini modunda bir sorun oluştuğunda (ağ kopması, geçici Google 503 aşırı yükleme hatası veya kota aşımı):

```javascript
// src/content/ai-engine.js
if (engineMode === 'gemini' && geminiApiKey) {
  try {
    const cloudResult = await this.runCloudGeminiAnalysis(...);
    if (cloudResult) return cloudResult;
  } catch (cloudError) {
    console.warn('[SteamLens AI] Cloud Gemini failed, falling back to rule-based:', cloudError);
  }
}

// Bulut motoru başarısız olursa veya kullanıcı kural modundaysa otomatik yerel NLP çalışır:
const ruleResult = this.runRuleBasedAnalysis(validReviews, stats, lang);
return ruleResult;
```
Bu mimari sayesinde bulut tabanlı yapay zeka çökse bile kullanıcı farkında olmadan milisaniyeler içinde yerel NLP motoruna düşer ve karne eksiksiz olarak ekrana basılır.

---

## 4. Siber Güvenlik, Veri ve Durum Yönetimi

### 4.1 XSS (Cross-Site Scripting) Savunması: `escapeHtml` Fonksiyonu

SteamLens AI, harici kaynaktan (Steam kullanıcı yorumları ve yapay zeka yanıtları) gelen verileri `innerHTML` aracılığıyla sayfaya basar. Eğer bir oyuncu yorumuna kasıtlı olarak `<script>kod()</script>` veya `<img src="x" onerror="saldiri()">` yazmışsa, bu kodun sayfada çalıştırılması büyük bir güvenlik açığı (**Stored XSS**) oluşturur.

Bu tehdit `escapeHtml` fonksiyonu ile tamamen bertaraf edilmiştir:

```javascript
// src/content/content.js
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')   // & sembolünü etkisizleştirir
    .replace(/</g, '&lt;')    // < etiket başlangıcını zararsız metne çevirir
    .replace(/>/g, '&gt;')    // > etiket kapanışını zararsız metne çevirir
    .replace(/"/g, '&quot;')  // HTML öznitelik çift tırnaklarını kırar
    .replace(/'/g, '&#039;'); // Tek tırnakları kırar
}
```
Arayüze basılan her dinamik değer (`${escapeHtml(verdict)}`, `${escapeHtml(p)}`) bu filtreden geçirilir. Böylece tarayıcı gelen metni asla çalıştırılabilir bir HTML/JS komutu olarak algılamaz.

---

### 4.2 Nesne Parçalama (Object Destructuring) ile Temiz Veri Ayrıştırma

Analiz sonucu dönen `data` nesnesinin içindeki veriler, modern JavaScript'in **Object Destructuring** özelliğiyle tek bir hamlede açılır:

```javascript
const {
  stats,
  tier,
  tierCode,
  verdict,
  optimizationScore,
  optimizationSummary,
  pros,
  cons,
  patchImpact,
  valueAnalysis,
  totalFetched,
  validCount
} = data;
```
Bu pratik kullanım:
1. Kod tabanında 12 satırlık `const verdict = data.verdict;` tekrarını önler.
2. Bellekte gereksiz referans zincirlerini engeller.
3. Değişken isimlerini doğrudan görünür kılarak fonksiyonun okunabilirliğini maksimize eder.

---

### 4.3 `chrome.storage.onChanged` ile Canlı ve Reaktif Durum Senkronizasyonu

Kullanıcı popup panelinde motoru (Kural Tabanlı $\leftrightarrow$ Gemini) veya dili (TR $\leftrightarrow$ EN) değiştirdiğinde, açık olan Steam sekmelerinin sayfayı yenilemeden (F5 atmadan) anında güncellenmesi gerekir:

```javascript
// src/content/content.js
function listenToStorageChanges() {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.engineMode) state.settings.engineMode = changes.engineMode.newValue;
      if (changes.uiLanguage) {
        state.settings.uiLanguage = changes.uiLanguage.newValue;
        state.cache.delete(state.currentAppId); // Dil değiştiğinde önbelleği temizle
      }
      updateTriggerButton(); // Buton üzerindeki rozet ve dili anında yenile
    }
  });
}
```
Bu reaktif dinleyici, `popup.js` ile `content.js` arasında doğrudan mesajlaşma köprüsüne ihtiyaç duymadan, `chrome.storage.local` üzerinden gevşek bağlı (loosely coupled) mükemmel bir durum senkronizasyonu sağlar.

---

### 4.4 `static` Sınıf Metotları vs. Örnekleme (`new`) Ayrımı

`SteamApiClient` ve `SteamLensAIEngine` sınıflarında tüm fonksiyonlar `static` olarak tanımlanmıştır:
```javascript
class SteamApiClient {
  static async fetchReviews(appId, options) { ... }
}
```

* **Neden `new SteamApiClient()` Yapmadık?** Bir sınıf içerisinde `this.kullaniciAdi` gibi nesneye özel durumlar (state) tutuluyorsa `new` ile örnek oluşturulur (Örn: Araba sınıfından `araba1`, `araba2` üretmek).
* **Alet Kutusu (Utility) Mantığı:** `SteamApiClient` içinde hiçbir durum saklanmaz; sadece girdi alır, işler ve çıktı verir (tıpkı `Math.round()` gibi). Fonksiyonları `static` yaparak gereksiz nesne örneklemelerinin önüne geçilmiş, RAM tüketimi azaltılmış ve Garbage Collector (Çöp Toplayıcı) yükü sıfırlanmıştır.

---

## 5. Uluslararasılaştırma (i18n) Stratejisi

### 5.1 Çift Katmanlı Yerelleştirme Modeli: `_locales` vs. `src/shared/i18n.js`

Uzantının küresel başarısı için çift katmanlı bir yerelleştirme mimarisi kurulmuştur:

```
┌────────────────────────────────────────────────────────┐
│            1. KATMAN: Chrome Web Mağazası              │
│       `_locales/en/messages.json` & `_locales/tr/`     │
│  - Eklenti adı, mağaza açıklaması, arama indeksleri    │
└────────────────────────────────────────────────────────┘
                            ▲
                            │ Bağımsız, çift katmanlı mimari
                            ▼
┌────────────────────────────────────────────────────────┐
│             2. KATMAN: Çalışma Zamanı (Runtime)        │
│                `src/shared/i18n.js`                    │
│  - Butonlar, dinamik karneler, analiz promptları       │
│  - Canlı dil değiştirme (Sayfa yenilemesiz)            │
└────────────────────────────────────────────────────────┘
```

1. **Mağaza Katmanı (`_locales`):** Chrome Web Store indekslemesi ve tarayıcı araç çubuğundaki yerel metinler için standart Chrome i18n altyapısı kullanılır.
2. **Çalışma Zamanı Katmanı (`i18n.js`):** Sayfa içindeki dinamik arayüz, buton rozetleri, karne başlıkları ve Gemini API sistem promptları için özel sözlük mekanizması kullanılır.

---

### 5.2 Otomatik Dil Çözümleme (`resolveLanguage`) ve Dinamik Parametre Doldurma

Kullanıcı dili *"🌐 Otomatik / Auto"* seçtiğinde tarayıcının sistem dili çözümlenir:
```javascript
// src/shared/i18n.js
resolveLanguage(preference) {
  if (preference === 'tr') return 'tr';
  if (preference === 'en') return 'en';
  const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
  return nav.startsWith('tr') ? 'tr' : 'en';
}
```

Metinler şablon parametreleriyle dinamik olarak doldurulabilir:
```javascript
// Kullanım: t('tierGeminiAI', 'tr', { model: '2.0-flash' })
// Çıktı: "⚡ Gemini AI (2.0-flash)"
t(key, lang, params = {}) {
  let text = DICTIONARY[lang]?.[key] || DICTIONARY['en']?.[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return text;
}
```

---

## 6. Stil Sistemi ve Algılanan Performans

### 6.1 Steam Natif Dark Theme ve CSS Değişkenleri (`var(--sl-*)`)

SteamLens AI, Steam mağazasının koyu temasıyla kusursuz bir görsel uyum yakalamak için izole CSS değişkenleri (`CSS Custom Properties`) kullanır:

```css
/* src/content/content.css */
:root {
  --sl-bg-main: #121a24;
  --sl-bg-card: rgba(23, 33, 46, 0.85);
  --sl-border: rgba(102, 192, 244, 0.25);
  --sl-accent-steam: #66c0f4;
  --sl-accent-green: #a4d007;
  --sl-accent-red: #ff5252;
  --sl-radius-md: 8px;
}
```
* **Steam Uyumu:** `#66c0f4` (Steam açık mavisi) ve `#17212e` (Steam kart mavisi) tonları birebir korunmuştur.
* **İzole Prefix:** Tüm CSS sınıfları ve değişkenleri `.sl-` ve `--sl-` ön ekleriyle tanımlanmıştır; böylece Steam'in kendi stilleriyle veya başka eklentilerle çakışma yaşanmaz.

---

### 6.2 Skeleton Loading ile Sıfır Düzen Kayması (CLS Önleme)

Butona tıklandığı anda `renderLoading()` fonksiyonu devreye girer:
* **Algılanan Hız (Perceived Performance):** Kullanıcıya boş bir ekran veya sadece dönen bir çark göstermek yerine, analiz kartının tam iskeletini gri parıldayan kutularla (`.sl-skeleton`) anında çizer.
* **Kümülatif Düzen Kaymasını (CLS) Engelleme:** Kartın boyutları önceden sabitlendiği için, analiz sonuçları geldiğinde sayfa aniden aşağıya doğru zıplamaz (Layout Shift yaşanmaz); içerik pürüzsüzce iskeletin yerini alır.

---

*Bu doküman, SteamLens AI projesinin modern yazılım mühendisliği prensiplerine (Clean Architecture, Defensive Programming, Zero Dependencies, Least Privilege Security) tam uyumlu olarak inşa edildiğini gösteren teknik referans kılavuzudur.*
