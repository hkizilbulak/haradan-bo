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

macOS, Windows veya Linux üzerinde BO deposunda:

```bash
npm run start:all
```

Bu platformlar arası komut:

- BE `.env` dosyasını okuyup API'yi `:3001` üzerinde,
- aynı BE ortamıyla worker'ı,
- BO `.env.local` dosyasını okuyup BO'yu `:8080` üzerinde başlatır.

`start:all` doğrudan Node.js ve `go run` kullanır; Bash, Make, Git Bash, WSL veya Windows için ek `set` komutları gerektirmez.

Hazır olduğunda `http://localhost:8080` adresini açın. `Ctrl+C` üç süreci de durdurur.

`start:all`, Git'te takip edilen `out/` içeriğini beklenmedik şekilde yeniden üretmemek için otomatik build çalıştırmaz. `out/` yoksa önce şunu çalıştırın:

```bash
npm run build
```

## Bireysel başlangıç komutları

BO komutları Windows, macOS ve Linux üzerinde çalışır:

```bash
npm run local
npm run local:start
```

- `npm run local`: önce Next.js statik çıktısını oluşturur, sonra BO Go sunucusunu başlatır.
- `npm run local:start`: mevcut `out/` çıktısını build etmeden başlatır.

BE için mevcut isteğe bağlı macOS/Linux Make kolaylık komutları ayrı terminallerde kullanılabilir:

```bash
make api
make worker
```

Windows veya normal tam-stack başlangıç için Make gerekli değildir; `npm run start:all` kullanın.

## Arayüz geliştirme ve hot reload

UI üzerinde aktif geliştirme yaparken:

```bash
npm run dev
```

- Next.js geliştirme sunucusu ve hot reload: `http://localhost:3000`
- BO Go proxy: `http://localhost:8080`
- BE API: `http://localhost:3001`

Hot reload için tarayıcıda `http://localhost:3000` açılmalıdır; `:8080` mevcut statik `out/` içeriğini sunar. Platformlar arası API, worker ve Go proxy başlangıcı için `npm run start:all` komutunu, Next.js için `npm run dev` komutunu ayrı terminallerde çalıştırın.

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
