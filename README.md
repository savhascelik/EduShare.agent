# EduShare Agent (Agents for Humans Hackathon 2026)
### 🤝 Category: Good Neighbor Agents
**Autonomous Inter-School Surplus Equipment Redistribution & Logistics Agent**  
*Powered by Strands Agents SDK, Amazon Bedrock (Nova Pro), PostgreSQL, FastAPI & React + Leaflet.*

---

## 🌟 Proje Özeti (Executive Summary)

Türkiye'de ve dünyada devlet okullarının depolarında milyonlarca liralık eğitim materyali, bilgisayar, laboratuvar kiti ve okul sırası atıl vaziyette beklerken; sadece birkaç kilometre ötedeki komşu bir okul bu malzemelere acil ihtiyaç duymaktadır. Mevcut hantal bürokrasi, okullar arası görünürlük eksikliği ve lojistik koordinasyon yokluğu nedeniyle bu kaynaklar çürümeye terk edilmektedir.

**EduShare Agent**, bu problemi otonom bir "İyi Komşu" (Good Neighbor) ajanı olarak çözer:
1. **Multimodal Görüntü İşleme (Amazon Bedrock Nova Pro Vision):** Okul yöneticisi atıl depodaki eşyanın fotoğrafını çeker. Bedrock modeli eşyayı tanır, kategorisini, miktarını ve kondisyonunu saniyeler içinde tespit eder.
2. **Otonom Eşleştirme & Lojistik Planlama (Strands Agents SDK):** Ajan, komşu okulların açık ihtiyaçlarını, aralarındaki Haversine coğrafi mesafeyi, kamu bütçesi tasarrufunu (₺) ve önlenen karbon ayak izini ($kg\ CO_2$) hesaplar.
3. **İnsan Denetimi (Human-in-the-Loop - HITL):** Ajan asla tek taraflı işlem yapmaz; hazırladığı lojistik ve etki kartını okul müdürünün onay paneline sunar. Müdür `[Onayla ve Başlat]` butonuna bastığında transfer resmiyet kazanır.
4. **Canlı Transfer Haritası & Etki Sayacı:** Leaflet üzerinde okullar arası kavisli yay hatlarıyla anlık transferler ve canlı kamu tasarrufu gösterilir.

---

## 🛠️ Mimari ve Kullanılan Teknolojiler

```
[ Okul Yöneticisi / Web Arayüzü ]
        │  ▲
        │  │ Vite + React 19 + Tailwind CSS + Leaflet (Harita) + SSE Canlı Akış
        ▼  │
[ FastAPI Backend (Python 3.11) ]
        │
        ├──▶ [ PostgreSQL 16 (Docker) ] ── (Gerçek Veri Tabanı: Okullar, Eşyalar, İhtiyaçlar, Transferler)
        │
        ├──▶ [ Amazon Bedrock (us-east-1) ] ── Nova Pro (us.amazon.nova-pro-v1:0)
        │       ├── Multimodal Vision (Eşya Fotoğrafı Otomatik Tanıma)
        │       └── Reasoning & Planning (Akıllı Eşleştirme Gerekçelendirmesi)
        │
        └──▶ [ Strands Agents SDK ] ── (Otonom Ajan & Dinamik Araç Çağrımı / Tool Calling)
                ├── query_nearby_needs (Coğrafi ve Kategori Eşleştirme)
                ├── calculate_impact_metrics (TL Tasarruf & CO2 Hesaplayıcı)
                └── create_hitl_approval_card (Müdür Onay Kartı Üretimi)
```

---

## 🚀 Hızlı Başlangıç (Kurulum ve Çalıştırma)

### 1. PostgreSQL Veritabanını Başlatma (Docker)
Proje kök dizininde:
```bash
docker compose up -d
```
*Veritabanı `127.0.0.1:5432` portunda `edushare` adıyla ayağa kalkar.*

### 2. Backend Sunucusunu Çalıştırma
```bash
cd backend
# Sanal ortamı aktifleştirin
./venv/Scripts/activate   # Windows için
# Bağımlılıkları yükleyin (ilk seferde)
pip install -r requirements.txt
# Sunucuyu başlatın
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
*Backend `http://127.0.0.1:8000` adresinde çalışır. Swagger API dökümantasyonu: `http://127.0.0.1:8000/docs`*

### 3. Frontend Web Arayüzünü Çalıştırma
```bash
cd frontend
npm install
npm run dev
```
*Arayüz `http://127.0.0.1:5173` adresinde yayındadır.*

---

## 🔑 Test Kullanıcıları (Önceden Tohumlanmış Okullar)

Arayüzde **"Okul Girişi"** penceresinde tek tıkla test yapabilmeniz için hazır giriş butonları mevcuttur:

| Okul Adı | E-posta | Şifre | İlçe |
| :--- | :--- | :--- | :--- |
| **Kadıköy Anadolu Lisesi** | `kadikoy@meb.gov.tr` | `Sifre123!` | Kadıköy |
| **Beşiktaş Atatürk Anadolu Lisesi** | `besiktas@meb.gov.tr` | `Sifre123!` | Beşiktaş |
| **Haydarpaşa MTAL** | `haydarpasa@meb.gov.tr` | `Sifre123!` | Üsküdar |
| **Kabataş Erkek Lisesi** | `kabatas@meb.gov.tr` | `Sifre123!` | Beyoğlu |

---

## 📋 Öne Çıkan Özellikler ve Kullanıcı Deneyimi

1. **Fotoğraf ile Eşya Ekleme:**  
   "Fazla Eşya Bildir" butonuna tıklayıp herhangi bir masa, bilgisayar veya cihaz fotoğrafı yükleyin. Amazon Bedrock Nova Pro modeli fotoğrafı inceleyerek başlığı, adedi, kondisyonu ve tahmini birim değerini otomatik doldurur.
2. **Otonom Ajan Tetiklenmesi:**  
   Eşya kaydedildiği an arka planda Strands Agent uyanır; İstanbul genelindeki okul ihtiyaçlarını tarayarak en yakın mesafedeki ve en yüksek aciliyetli okulla eşleştirir.
3. **Müdür Onay Paneli (HITL):**  
   Üst bardaki "Ajan Kararları" menüsünde bekleyen transfer önerisi görünür. Eşleştirmenin mesafesi, parasal tasarrufu, önlenen karbon miktarı ve ajanın Türkçe karar gerekçesi incelenerek tek tıkla onaylanır veya reddedilir.
4. **Canlı Transfer Ağ Haritası:**  
   Onaylanan transfer anında konfeti patlamasıyla kutlanır, haritada okullar arasına kavisli transfer çizgisi çekilir ve kamusal tasarruf sayacı güncellenir.
5. **Kurumsal Okul Profili:**  
   Okul müdürleri kendi öğrenci, öğretmen, derslik kapasitelerini ve harita koordinatlarını istedikleri an profil penceresinden güncelleyebilir.

---

## 🏆 Hackathon İpuçları (Devpost Hakemleri İçin)
- **Sıfır Mock Veri İlkesi:** Projede hiçbir mock veri kütüphanesi kullanılmamıştır. Tüm kayıtlar gerçek PostgreSQL veritabanında saklanır ve tüm yapay zeka analizleri kullanıcının canlı AWS Bedrock Nova Pro modelinden gelir.
- **İnsan-Merkezli Yapay Zeka:** Good Neighbor kategorisinin ruhuna uygun olarak yapay zeka bir karar alıcı değil, okul yöneticilerini güçlendiren otonom bir asistan olarak kurgulanmıştır.
