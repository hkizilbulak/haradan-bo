# Haradan Backoffice (BO)

Haradan BO, Next.js ile statik olarak üretilen yönetim arayüzünü sunan ve tarayıcı ile Haradan Backend arasında oturum/API proxy görevi gören Go uygulamasıdır.

## Yerel mimari

```text
Tarayıcı
  │
  ▼
BO Go sunucusu :8080
  │
  ▼
BE API :3001

BE worker: TJK, medya ve diğer arka plan işlerini ayrı süreçte yürütür.
```

## Gereksinimler

- Go
- Node.js ve npm
- `haradan-be` deposu
- BE deposunda yerel ve Git tarafından yok sayılan `.env`
- BO deposunda yerel ve Git tarafından yok sayılan `.env.local`
- BO bağımlılıkları için `npm install`

Varsayılan klasör yapısı şöyledir:

```text
parent/
├── haradan-be/
└── haradan-bo/
```

BE farklı bir konumdaysa tam veya BO'ya göre göreli yol verilebilir:

```bash
HARADAN_BE_DIR=/path/to/haradan-be npm run start:all
```

## BO ortam ayarları

Yerel `.env.local` örneği:

```dotenv
PORT=8080
BACKEND_API_URL=http://localhost:3001
```

- `.env.local` Git tarafından yok sayılır ve commit edilmemelidir.
- `PORT` verilmezse `8080` kullanılır.
- `BACKEND_API_URL` verilmezse `http://localhost:3001` kullanılır.
- `NEXT_PUBLIC_API_URL` yalnızca geriye dönük uyumluluk fallback'idir.
- `NEXT_PUBLIC_DEV_PROXY_URL` yalnızca Next.js geliştirme modu için anlamlıdır.
- `CORS_ALLOWED_ORIGINS` isteğe bağlı, virgülle ayrılmış ek origin listesidir.
- `NEXTAUTH_URL` artık kullanılmaz.
- `NEXTAUTH_SECRET` mevcut runtime tarafından kullanılmaz.

Gerçek erişim anahtarlarını, parolaları veya token'ları dokümana ya da Git'e eklemeyin.

## Normal tam-stack başlangıç

BO deposunda:

```bash
npm run start:all
```

Bu komut:

- `make api` ile BE API'yi `:3001` üzerinde,
- `make worker` ile BE worker'ı,
- `npm run local:start` ile BO'yu `:8080` üzerinde başlatır.

Hazır olduğunda `http://localhost:8080` adresini açın. `Ctrl+C` üç süreci de durdurur.

`start:all`, Git'te takip edilen `out/` içeriğini beklenmedik şekilde yeniden üretmemek için otomatik build çalıştırmaz. `out/` yoksa önce şunu çalıştırın:

```bash
npm run build
```

## Servisleri ayrı başlatma

BE deposunda, ayrı terminallerde:

```bash
make api
make worker
```

BO deposunda:

```bash
npm run local
npm run local:start
```

- `npm run local`: önce Next.js statik çıktısını oluşturur, sonra BO Go sunucusunu başlatır.
- `npm run local:start`: mevcut `out/` çıktısını build etmeden başlatır.

## Arayüz geliştirme ve hot reload

UI üzerinde aktif geliştirme yaparken:

```bash
npm run dev
```

- Next.js geliştirme sunucusu ve hot reload: `http://localhost:3000`
- BO Go proxy: `http://localhost:8080`
- BE API: `http://localhost:3001`

Hot reload için tarayıcıda `http://localhost:3000` açılmalıdır; `:8080` mevcut statik `out/` içeriğini sunar. API ve worker için BE komutlarını, Go proxy için `npm run local:start` komutunu ayrı terminallerde çalıştırın.

Worker; TJK senkronizasyonu, medya işleme ve diğer kuyruklanmış arka plan işlerinin tamamlanması için gereklidir.

## Kısa sorun giderme

- **Port kullanımda:** `3000`, `3001` veya `8080` üzerindeki eski yerel süreçleri durdurun.
- **BE `.env` bulunamadı:** `haradan-be/.env` dosyasını güvenli yerel değerlerle oluşturun; commit etmeyin.
- **BO `.env.local` bulunamadı:** yukarıdaki secretsız örneği kullanarak dosyayı oluşturun.
- **`out/` yok veya eski:** `npm run build` çalıştırın; yalnızca beklenen üretilmiş değişiklikleri koruyun.
- **API health yanıt vermiyor:** `http://localhost:3001/api/health` adresini ve BE terminal çıktısını kontrol edin.

## Docker

Docker imajı statik BO çıktısını Go binary içine gömer:

```bash
docker build -t haradan-bo .
docker run -p 8080:8080 haradan-bo
```
