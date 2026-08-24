# Chrome Web Store Yayınlama Paketi & Meta Verileri

## 1. Temel Bilgiler

- **Uzantı Adı (Extension Name):** `SteamLens AI — Steam İnceleme Özeti`
- **Kısa Açıklama (Summary / Short Description - Max 132 chars):**
  `Steam mağazasındaki incelemeleri akıllı NLP ve Google Gemini AI ile anında özetleyen yapay zeka asistanı.`
- **Kategori:** Üretkenlik / Alışveriş & Eğlence (Productivity / Shopping)
- **Sürüm (Version):** `1.2.0`
- **Varsayılan Dil:** Türkçe (tr) — İngilizce desteği dahil.

---

## 2. Detaylı Mağaza Açıklaması (Store Listing Description)

```markdown
🎮 SteamLens AI — Steam İnceleme Özeti

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
- 🟢 Güçlü Yönler (Artılar)
- 🔴 Kritik Sorunlar & Şikayetler (Eksiler)
- ⚡ Son Güncellemeler & Yama Durumu
- ⏱️ Fiyat / Süre / Değer Analizi
- 📊 Topluluk Onayı & Ortalama Oynanış Süresi

✅ Gizlilik ve Güvenlik Odaklı:
- Verileriniz asla üçüncü taraflarla paylaşılmaz.
- API anahtarlarınız yalnızca kendi tarayıcınızda (yerel olarak) güvenle saklanır.
- Sıfır GPU ve sıfır arka plan yükü.

Nasıl Kullanılır?
1. Eklentiyi yükleyin.
2. Herhangi bir Steam oyun sayfasına gidin.
3. "SteamLens AI ile İncelemeleri Özetle" butonuna tıklayın ve anında net bir özet alın!
```

---

## 3. İzinler ve Gerekçeleri (Permissions Justification)

Chrome Web Store inceleme ekibi için hazırlanmış resmi izin gerekçeleri:

1. **`storage` İzni:**
   - *Gerekçe:* Kullanıcının seçtiği dil tercihini (Tüm Diller / Türkçe / İngilizce), taranacak yorum adedini, aktif motor modunu ve isteğe bağlı Google Gemini API anahtarını tarayıcıda yerel olarak saklamak için kullanılır.

2. **`host_permissions` (`https://store.steampowered.com/*`):**
   - *Gerekçe:* Steam mağazasındaki oyun sayfalarına analiz butonunu yerleştirmek ve Steam'in resmi açık Web API'sinden (`appreviews`) oyun incelemelerini çekmek için gereklidir.

3. **`host_permissions` (`https://generativelanguage.googleapis.com/*`):**
   - *Gerekçe:* Kullanıcı kendi Google Gemini API anahtarını girmeyi tercih ettiğinde, incelemelerin Google AI Studio üzerinden güvenle özetlenmesini sağlamak için kullanılır.

---

## 4. Gizlilik Beyanı (Privacy Policy)

- SteamLens AI, kullanıcıların kişisel verilerini, tarama geçmişini veya kimlik bilgilerini **asla toplamaz, saklamaz veya üçüncü şahıslara satmaz**.
- Tüm analizler doğrudan kullanıcının tarayıcısında veya kullanıcının kendi API anahtarıyla Google AI Studio üzerinde gerçekleştirilir.
