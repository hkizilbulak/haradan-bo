# Haradan Backoffice (BO)

Haradan BO, Next.js ile statik olarak üretilen yönetim arayüzünü sunan ve tarayıcı ile Haradan Backend arasında oturum/API proxy görevi gören Go uygulamasıdır.

## Yerel port standardı

| Component | Local port | Purpose |
| --- | ---: | --- |
| BO runtime | 3000 | Normal BO UI + Go session/API proxy |
| Next dev | 3001 | BO frontend hot reload/development |
| BE API | 8080 | Haradan backend REST API |
| Worker | none | Background jobs |

`3000` mevcut BO runtime'a aittir. Gelecekte eklenecek son kullanıcı Haradan FE için portlar ayrı ele alınmalı ve bu portlar sessizce yeniden kullanılmamalıdır.

## Gereksinimler

- `PATH` üzerinden erişilebilen Go
- `PATH` üzerinden erişilebilen Node.js ve npm
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
PORT=3000
BACKEND_API_URL=http://localhost:8080
NEXT_PUBLIC_DEV_PROXY_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3001
```

- `.env.local` Git tarafından yok sayılır ve commit edilmemelidir.
- `PORT` verilmezse yerel BO launcher'ı ve Go sunucusu `3000` kullanır.
- `BACKEND_API_URL` verilmezse `http://localhost:8080` kullanılır.
- `NEXT_PUBLIC_DEV_PROXY_URL`, yalnızca Next.js geliştirme modundaki tarayıcı isteklerini BO Go session/API proxy'sine yönlendirir.
- Yerel launcher'lar `http://localhost:3001` origin'ini credential kullanan geliştirme istekleri için kesin CORS allowlist'e ekler. Wildcard kullanılmaz; production CORS davranışı gevşetilmez.
- `NEXT_PUBLIC_API_URL` yalnızca geriye dönük uyumluluk fallback'idir.
- `NEXTAUTH_URL` ve `NEXTAUTH_SECRET` mevcut runtime tarafından kullanılmaz.

Gerçek erişim anahtarlarını, parolaları veya token'ları dokümana ya da Git'e eklemeyin.

## Normal çalışma

BO deposunda:

```bash
npm run start:all
```

Bu platformlar arası komut BE API'yi `:8080`, worker'ı ve BO Go runtime'ını `:3000` üzerinde başlatır. Hazır olduğunda `http://localhost:3000` adresini açın.

Komut doğrudan Node.js ve `go run` kullanır; Bash, Make, `.sh`, Git Bash veya WSL gerektirmez. Bir servis beklenmedik şekilde kapanırsa tüm stack durdurulur. `Ctrl+C` tüm child process ağaçlarını temizler.

`start:all`, Git'te takip edilen `out/` içeriğini beklenmedik şekilde yeniden üretmemek için otomatik build çalıştırmaz. `out/` yoksa önce `npm run build` çalıştırın.

## Geliştirme ve hot reload

Tam geliştirme stack'i için:

```bash
npm run dev:all
```

Bu komut şunları birlikte başlatır:

- BE API: `http://localhost:8080`
- worker: HTTP portu yok
- BO Go session/API proxy: `http://localhost:3000`
- Next.js hot reload: `http://localhost:3001`

Geliştirme sırasında tarayıcıda `http://localhost:3001` adresini açın. Next.js sayfasının credential kullanan `/api` istekleri BO Go proxy'sine gider; session cookie'leri ve API çağrıları buradan BE'ye taşınır.

`dev:all` de Bash/Make kullanmaz, required-process fail-fast davranışına sahiptir ve `Ctrl+C` ile tüm child process ağaçlarını durdurur.

## Bireysel komutlar

| Command | Result |
| --- | --- |
| `npm run local` | Next static build + BO runtime on `http://localhost:3000` |
| `npm run local:start` | Existing `out/` + BO runtime on `http://localhost:3000` |
| `npm run dev` | Next.js hot reload on `http://localhost:3001` |
| `npm run start:all` | BO `:3000` + BE API `:8080` + worker |
| `npm run dev:all` | Next `:3001` + BO proxy `:3000` + BE API `:8080` + worker |

BE ayrı terminallerde platformlar arası şu komutlarla çalıştırılabilir:

```bash
go run ./cmd/dev api
go run ./cmd/dev worker
```

İlk komut API'yi `:8080` üzerinde başlatır; worker HTTP portu açmaz.

## Kısa sorun giderme

- **Port kullanımda:** `3000`, `3001` veya `8080` üzerindeki eski yerel süreçleri durdurun.
- **BE `.env` bulunamadı:** `haradan-be/.env` dosyasını güvenli yerel değerlerle oluşturun; commit etmeyin.
- **BO `.env.local` bulunamadı:** yukarıdaki secretsız örneği kullanarak dosyayı oluşturun.
- **`out/` yok veya eski:** `npm run build` çalıştırın; yalnızca beklenen üretilmiş değişiklikleri koruyun.
- **API health yanıt vermiyor:** `http://localhost:8080/api/health` adresini ve BE terminal çıktısını kontrol edin.
- **Next dev session isteği başarısız:** tarayıcıyı `http://localhost:3001` ile açtığınızı ve BO proxy'nin `http://localhost:3000` üzerinde çalıştığını doğrulayın.

## Docker

Docker imajı statik BO çıktısını Go binary içine gömer:

```bash
docker build -t haradan-bo .
docker run -p 3000:3000 haradan-bo
```
