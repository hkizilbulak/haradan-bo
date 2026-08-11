# Haradan Backoffice

## Proje hakkında

Haradan BO; Next.js, React ve TypeScript ile geliştirilen admin yönetim uygulamasıdır. Statik arayüzü sunan Go runtime aynı zamanda HttpOnly session/API proxy görevi görür. Admin işlemleri yalnız BO'da kalır.

Gelecekteki React Native Web, Android ve iOS uygulamaları son kullanıcılara hizmet edecek, doğrudan Haradan BE public API'ye bağlanacak ve BO session proxy'sini kullanmayacaktır.

## Kullanılan teknolojiler

| Teknoloji | Kullanım amacı |
| --- | --- |
| Next.js | Admin arayüzü ve statik export |
| React | UI bileşenleri |
| TypeScript | Tip güvenli frontend geliştirme |
| Go | Statik UI runtime, session ve API proxy |
| OpenAPI client/model katmanı | BE sözleşmesiyle uyumlu istek ve veri modelleri |
| Playwright | Geliştirme sırasında uçtan uca test otomasyonu |

## Gereksinimler

- Git
- Node.js ve npm; minimum local sürüm repository'de sabitlenmemiştir, Docker frontend build'i Node.js 20 kullanır
- Go `1.25` (`go.mod`)
- PostgreSQL'e erişebilen Haradan BE; BE için Go `1.26.5` gerekir

## Local klasör yapısı

Varsayılan yerleşim:

```text
parent/
├── haradan-be/
└── haradan-bo/
```

BE farklı bir konumdaysa tam veya BO'ya göre göreli yol verilebilir:

```bash
HARADAN_BE_DIR=/path/to/haradan-be npm run start:all
```

## Environment dosyası

Local BO yapılandırması repository kökündeki `.env.local` dosyasındadır. BE kendi `.env` dosyasını kullanır. İki dosya da Git'e commit edilmez; provider ve altyapı secret'ları yalnız BE/worker deployment environment'ında tutulur.

| Değişken | Amaç |
| --- | --- |
| `PORT` | BO Go runtime portu; local standart `3000` |
| `BACKEND_API_URL` | BO proxy'nin bağlandığı BE API adresi |
| `CORS_ALLOWED_ORIGINS` | Credential kullanan browser origin allowlist'i |
| `NEXT_PUBLIC_DEV_PROXY_URL` | Next.js dev isteklerinin BO proxy adresi |
| `NEXT_PUBLIC_API_URL` | Mevcut geriye uyumluluk fallback'i |
| `HARADAN_BE_DIR` | Full-stack launcher için BE repository yolu |

## İlk kurulum

BE `.env` ve BO `.env.local` dosyalarını hazırlayın, ardından:

```bash
cd haradan-bo
npm install
npm run build
npm run start:all
```

`npm run build`, `out/` yoksa veya bilinçli olarak yenilenecekse gereklidir. Normal full local stack hazır olduğunda `http://localhost:3000` adresini açın. BE health adresi `http://localhost:8080/api/health`'tir.

`npm run start:all` BO `:3000`, BE API `:8080` ve portsuz worker'ı başlatan local developer kolaylığıdır; production deployment buna bağlı değildir.

## Admin girişi

- E-posta: `admin@kartezya.com`
- Parola: `haraa`

## Development ve local portlar

Hot reload kullanan full stack:

```bash
npm run dev:all
```

Tarayıcıdan `http://localhost:3001` açılır. Bu modda Next.js `:3001`, BO Go proxy `:3000`, BE API `:8080` üzerinde; worker ise HTTP portu olmadan çalışır.

| Servis | Port |
| --- | ---: |
| BO runtime / Go proxy | 3000 |
| Next.js development | 3001 |
| Backend API | 8080 |
| Worker | HTTP portu yok |

## Servisleri ayrı çalıştırma

| BO komutu | Sonuç |
| --- | --- |
| `npm run local` | Statik build + BO runtime `:3000` |
| `npm run local:start` | Mevcut `out/` + BO runtime `:3000` |
| `npm run dev` | Next.js hot reload `:3001` |

BE ayrı terminallerde çalıştırılabilir:

```bash
go run ./cmd/dev api
go run ./cmd/dev worker
```

API `http://localhost:8080` üzerinde çalışır; worker HTTP portu açmaz. BE'deki `make api` ve `make worker` yalnız opsiyonel developer kolaylıklarıdır; birincil başlangıç yolu Make veya Bash gerektirmez.

## Backend, veritabanı ve OpenAPI

BO veritabanına doğrudan bağlanmaz. PostgreSQL, `hrd_` tabloları ve ileri yönlü Goose migrasyonları BE'ye aittir; güncel migrasyon seviyesi `00016_campaign_email_provider_template.sql`'dir. Shared/test veya production veritabanında destructive reset/drop uygulanmamalıdır.

BE repository'sindeki `api/openapi.yaml` API sözleşmesinin source of truth dosyasıdır. BO client/model katmanı public/admin ayrımını korur. Gelecekteki React Native Web, Android ve iOS istemcileri `PUBLIC_WEB` veya `MOBILE` audience ile bearer-token public auth akışını kullanacak; BO cookie/session mekanizmasına bağımlı olmayacaktır.

## Production deployment

BO, BE API, worker, PostgreSQL ve gelecekteki React Native FE bağımsız deploy edilebilir birimlerdir. Production; `npm run start:all`, sibling klasör yapısı, localhost, Make/Bash veya `.env.local` dosyasına bağlı değildir. Port, backend URL, cookie/CORS, database, JWT ve provider ayarları deployment environment/secret yönetimi üzerinden sağlanır; deployment secret'ları repository'de tutulmaz.

## Kısa troubleshooting

- Port kullanımdaysa `3000`, `3001` veya `8080` üzerindeki eski local process'i durdurun.
- BE health çalışmıyorsa `http://localhost:8080/api/health`, BE `.env` ve API loglarını kontrol edin.
- Launcher başlamıyorsa BE `.env`, BO `.env.local`, `HARADAN_BE_DIR` ve `out/` varlığını kontrol edin.
- `out/` yok veya eskiyse bilinçli olarak `npm run build` çalıştırın.
- Next dev proxy/CORS sorunu varsa tarayıcıyı `http://localhost:3001` üzerinden açtığınızı, BO proxy'nin `:3000` üzerinde olduğunu ve allowlist'i doğrulayın.
