# Haradan Backoffice (BO)

Haradan BO; Next.js yönetim arayüzünü sunan ve tarayıcı ile Haradan Backend arasında HttpOnly oturum/API proxy'si olan Go runtime'dır. Admin erişimi `ADMIN_BO` audience ile yalnız BO üzerinden yapılır.

## Mimari ve API sınırı

- BO browser trafiği Go session proxy üzerinden BE'ye gider; admin token'ları tarayıcı JavaScript'ine açılmaz.
- API'nin kaynak sözleşmesi BE deposundaki `api/openapi.yaml` dosyasıdır. BO değişiklikleri bu public/admin ayrımını korumalı; FE geliştiricisi BE veya BO source kodunu değiştirmeden sözleşme üzerinden ilerleyebilmelidir.
- Gelecekteki React Native Web/Android/iOS uygulamaları BO proxy'sini kullanmamalı; BE public API'ye bearer token ile `PUBLIC_WEB` veya `MOBILE` audience üzerinden doğrudan bağlanmalıdır.
- BE API ve worker ayrıdır. Worker HTTP portu açmadan TJK, medya ve bildirim işlerini yürütür.
- TJK, Resend, S3 uyumlu/Backblaze B2 ve Tinify sağlayıcıları BE tarafında environment ile yapılandırılır; BO'ya provider secret'ı verilmez.

## İlk kurulum

Gereksinimler: Go, Node.js/npm, PostgreSQL'e erişebilen `haradan-be` deposu, BE'de Git tarafından yok sayılan `.env` ve BO'da Git tarafından yok sayılan `.env.local`.

Varsayılan klasör yapısı:

```text
parent/
├── haradan-be/
└── haradan-bo/
```

BE farklı konumdaysa tam veya BO'ya göre göreli yol verin:

```bash
HARADAN_BE_DIR=/path/to/haradan-be npm run start:all
```

BO'nun temel yerel ayarları `PORT`, `BACKEND_API_URL`, `NEXT_PUBLIC_DEV_PROXY_URL` ve kesin `CORS_ALLOWED_ORIGINS` allowlist'idir. Varsayılanlar sırasıyla `3000`, `http://localhost:8080`, `http://localhost:3000` ve dev origin olarak `http://localhost:3001` ile uyumludur. `NEXT_PUBLIC_API_URL` yalnız eski uyumluluk fallback'idir; `NEXTAUTH_URL` ve `NEXTAUTH_SECRET` mevcut runtime tarafından kullanılmaz. Secret, parola veya token'ları README'ye/Git'e yazmayın.

## Yerel portlar

| Bileşen | Yerel port | Amaç |
| --- | ---: | --- |
| BO runtime | 3000 | Normal UI + Go session/API proxy |
| Next.js dev | 3001 | Hot reload |
| BE API | 8080 | REST API |
| Worker | yok | Arka plan işleri |

`3000` mevcut BO runtime'a aittir; gelecekteki public son kullanıcı FE portu değildir.

## Normal çalışma ve hot reload

İlk kurulum ve normal tam stack:

```bash
npm install
npm run start:all
```

Komut BE API'yi `:8080`, worker'ı ve BO Go runtime'ını `:3000` üzerinde başlatır. `http://localhost:3000` adresini açın. `start:all` takip edilen `out/` içeriğini kendiliğinden üretmez; çıktı yoksa veya bilinçli olarak yenilenecekse önce `npm run build` çalıştırın.

Hot reload kullanan tam geliştirme stack'i:

```bash
npm run dev:all
```

Bu modda BO proxy `:3000`, Next.js `:3001`, BE API `:8080` ve worker birlikte çalışır; tarayıcıda `http://localhost:3001` açılır. Credential kullanan `/api` istekleri kesin CORS allowlist'iyle BO proxy'ye gider. Her iki launcher da platformlar arasıdır, gerekli bir süreç kapanınca stack'i durdurur ve `Ctrl+C` ile child process'leri temizler.

## Servisleri ayrı çalıştırma

| Komut | Sonuç |
| --- | --- |
| `npm run build` | Next.js statik BO çıktısını üretir |
| `npm run local` | Build + BO runtime `:3000` |
| `npm run local:start` | Mevcut `out/` + BO runtime `:3000` |
| `npm run dev` | Yalnız Next.js hot reload `:3001` |
| `npm run start:all` | BO `:3000` + BE API `:8080` + worker |
| `npm run dev:all` | Next.js `:3001` + BO proxy `:3000` + BE API `:8080` + worker |

BE ayrı terminallerde `go run ./cmd/dev api` ve `go run ./cmd/dev worker` ile çalıştırılabilir. Make kurulu ortamlarda BE'deki `make api`/`make worker` yalnız isteğe bağlı kolaylıklardır; Bash, Make, `.sh`, Git Bash veya WSL zorunlu değildir.

## Veritabanı ve TJK işletim notları

BO veritabanına doğrudan bağlanmaz. PostgreSQL şeması ve ileri yönlü Goose migrasyonları BE'ye aittir; Haradan tabloları `hrd_` öneklidir ve güncel seviye `00016_campaign_email_provider_template.sql`'dir. Release'te migrasyonları kontrollü olarak API/worker rollout'undan önce uygulayın; production veya ortak test veritabanında yıkıcı down işlemi yapmayın.

TJK ekranları FULL senkronizasyonun gerçek durumunu göstermelidir: sayfalı/checkpoint'li ve idempotent akış; retry/lease kaybında terminal hata; doğrulanmış `Toplam 0` ile EOF; malformed 200 yanıtında retry; doğru sayaçlar; enrichment eksiklerinde `PARTIAL_SUCCESS`. `INCREMENTAL` ve `RECONCILIATION` halen FULL'e yönlenen uyumluluk modlarıdır. Seed zamanlama varsayılan olarak pasiftir; etkinleştirilirse `Europe/Istanbul` saat diliminde Salı/Perşembe/Cumartesi 00:10 çalışır.

11 Ağustos 2026 tarihli sınırlı gerçek kabulde ilk sayfa 50/50 benzersiz kayıtla geçti, detay/pedigree/sibling ayrıştırmaları doğrulandı ve kaynak yaklaşık 72.674 kayıt bildirdi. Yaklaşık 1.454 sayfa ve 218 binin üzerinde enrichment isteği gerektirebilecek tam gerçek koşu yapılmadı; tüm verinin bugün veritabanında olduğu gösterilmemelidir. Tam koşu kontrollü, uzun ömürlü ve izlenen bir operasyon ortamında ayrıca yürütülmelidir.

## Production dağıtımı

BO, BE API, worker, PostgreSQL ve gelecekteki public React Native/Web istemcileri bağımsız deploy birimleridir. Production'da `start:all`, kardeş repo yolu, localhost, `.env.local`, Make veya Bash'e bağımlı olunmamalıdır. BO'ya build-time public URL'leri ve runtime `PORT`, backend URL/cookie/CORS ayarları verilir; veritabanı, JWT ve provider secret'ları BE/worker tarafında kalır. Docker imajı statik `out/` çıktısını Go binary içine gömer; deploy sonrasında BO oturum akışını ve BE `/api/health` erişimini doğrulayın.

## Kısa sorun giderme

- `3000`, `3001` veya `8080` doluysa eski yerel süreci durdurun.
- BE bulunamıyorsa `HARADAN_BE_DIR` yolunu; API yanıt vermiyorsa `http://localhost:8080/api/health` ve BE loglarını kontrol edin.
- `out/` yok/eskiyse bilinçli olarak `npm run build` çalıştırın.
- Next dev oturumu başarısızsa tarayıcı origin'inin `http://localhost:3001`, proxy'nin `http://localhost:3000` ve CORS allowlist'inin kesin olduğunu doğrulayın.
