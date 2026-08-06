Haradan Backend Operations - Next.js + Go Single Binary Server

## Getting Started

### Prerequisites
- Node.js 20+
- Go 1.25+

### Production Build & Run

```powershell
cd C:\Users\Pc\Documents\GitHub\TestGame\kartezya\haradan-bo

# Node dependencies kur
npm install

# Next.js build et
npm run build

# Go server'ı build et ve çalıştır
go run main.go
```

Server `http://localhost:8080` üzerinde başlar.

**Login Credentials:**
- Email: `admin@kartezya.com`
- Password: `haraa`

### Development (Local API)

Backend adresini environment variable olarak vermen önerilir:

```powershell
$env:BACKEND_API_URL = "http://localhost:3001"
```

`BACKEND_API_URL` veya `NEXT_PUBLIC_API_URL` verilmezse Go sunucusu local geliştirme için varsayılan olarak `http://localhost:3001` kullanır.

Frontend aynı origin altında `/api/...` çağrıları yapar. Go sunucusu bu istekleri backend'e proxy eder, login sonrası access/refresh token'ları HttpOnly cookie olarak yönetir.

Sonra `npm run build && go run main.go` çalıştır.

### Docker

```bash
docker build -t haradan-bo .
docker run -p 8080:8080 haradan-bo
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
