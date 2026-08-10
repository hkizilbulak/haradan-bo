# 🏇 Haradan Backoffice (BO)

Next.js (SSG) ve Go (BFF Proxy) mimarisine sahip **Haradan.com Yönetim Paneli** tekil binary sunucu uygulaması.

---

## 📐 Sistem Mimarisi

```mermaid
flowchart LR
    subgraph Browser ["Tarayıcı (Client)"]
        UI["Haradan BO Arayüzü"]
    end

    subgraph BO ["Haradan BO (Port 8080)"]
        GoServer["Go Server (main.go)"]
        StaticHTML["Statik HTML/JS (out/)"]
        SessionManager["HttpOnly Cookie & Auth Proxy"]
    end

    subgraph Backend ["Haradan BE (Port 3001)"]
        BEApi["Go REST API (cmd/api)"]
        TJKWorker["TJK Sync Worker"]
    end

    UI -->|"Sayfa İstekleri"| StaticHTML
    UI -->|"/api/session/*"| SessionManager
    SessionManager -->|"/v1/* Proxy"| BEApi
    BEApi --> TJKWorker
```

---

## 🚀 Adım Adım Çalıştırma Rehberi

### ⚡ Tek Komut İle Her Şeyi Başlatma (Tavsiye Edilen)

`haradan-bo` dizinindeyken tek bir komutla hem Backend'i (`3001`) hem de BO Proxy'yi (`8080`) aynı anda başlatabilirsiniz:

```bash
cd haradan-bo
npm run start:all
```

---

### 🟢 Ayrı Ayrı Başlatmak İsterseniz:

### 1️⃣ Adım: Backend'i (`haradan-be`) Başlatma (Port 3001)

Terminalde (`haradan-be` dizininde):

```bash
cd haradan-be
go run ./cmd/api
```

*(Ortam değişkenleri `.env` dosyasından otomatik yüklenir. Port varsayılan `:3001`'dir.)*

---

### 2️⃣ Adım: BO Proxy Sunucusunu (`haradan-bo`) Başlatma (Port 8080)

Terminalde (`haradan-bo` dizininde):

```bash
cd haradan-bo
go run main.go
```

> 🌐 **Erişim Adresi:** Tarayıcınızdan **`http://localhost:8080`** adresine gidin.

---

### 🛠️ Geliştirme (Development) Modu (Opsiyonel)

Arayüz kodlarında canlı (hot-reload) değişiklik yapmak istiyorsanız Next.js dev sunucusunu da başlatabilirsiniz:

```powershell
cd haradan-bo
npm run dev
```

> ⚡ **Not:** `npm run dev` kullanıldığında da `go run main.go` (`8080`) ve `haradan-be` (`3001`) arkada çalışıyor olmalıdır. Uygulama ana erişim adresi **`http://localhost:8080`** üzerindendir.

---

## 🔑 Varsayılan Giriş Bilgileri

| Parametre | Değer |
| :--- | :--- |
| **E-posta** | `admin@kartezya.com` |
| **Şifre** | `haraa` |
| **Erişim Adresi** | `http://localhost:8080/login` |

---

## ⚙️ Yapılandırma & Detaylar

- **HttpOnly Cookie Yönetimi:** Access ve Refresh token'lar güvenli bir şekilde `main.go` tarafından cookie olarak tutulur.
- **TJK Senkronizasyon Adaptörü:** TJK senkronizasyonu başlatırken Kaynak Adaptörü olarak **`TJK_HTTP`** kullanılır.
- **Docker İle Çalıştırma:**
  ```bash
  docker build -t haradan-bo .
  docker run -p 8080:8080 haradan-bo
  ```
