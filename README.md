# MGULER STOCK V1 FULL PACK

Bu paket, MGULER STOCK V1 PREMIUM için **tek parça full pack** başlangıç sistemidir.

## Paket içeriği

- `backend/` → Node.js + Express + Prisma + PostgreSQL + JWT API
- `frontend/` → temel yönetim paneli (statik HTML/CSS/JS)
- `ecosystem.config.js` → PM2 örnek yapı
- `nginx.conf.example` → Nginx reverse proxy örneği
- `docker-compose.example.yml` → lokal PostgreSQL ayağa kaldırma örneği

## Bu pakette neler hazır

- Auth login / me / logout
- Users CRUD (temel)
- Products CRUD
- Warehouses CRUD
- Stock in / out / transfer
- Current stock görünümü
- Dashboard raporu
- System logs
- Prisma schema
- Seed dosyası

## Önemli not

Bu paket **üretime geçiş için sağlam başlangıç full pack** olarak hazırlandı.
Burada amaç sana dağılmadan ilerleyebileceğin temiz bir çekirdek vermek.

## Hızlı kurulum

### 1) PostgreSQL başlat
İstersen lokal PostgreSQL kullan, istersen VPS üzerinde kur.

Örnek docker ile:

```bash
cd mguler-stock-v1-full-pack
docker compose -f docker-compose.example.yml up -d
```

### 2) Backend env oluştur

```bash
cd backend
cp .env.example .env
```

`.env` içindeki `DATABASE_URL` ve `JWT_SECRET` değerlerini düzenle.

### 3) Paketleri yükle

```bash
npm install
```

### 4) Prisma generate + migrate + seed

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

### 5) Backend çalıştır

```bash
npm run dev
```

Backend varsayılan olarak:

```text
http://localhost:3000
```

Health kontrol:

```text
GET /health
```

### 6) Frontend çalıştır
En basit yöntem:

```bash
cd ../frontend
python3 -m http.server 8080
```

Sonra aç:

```text
http://localhost:8080
```

Frontend içindeki API alanına şunu yaz:

```text
http://localhost:3000
```

## Varsayılan giriş

```text
Kullanıcı adı: UMG
Şifre: UMG2026!
```

## Temel endpoint listesi

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Users
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `PATCH /api/users/:id/status`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `PATCH /api/products/:id/status`

### Warehouses
- `GET /api/warehouses`
- `POST /api/warehouses`
- `PUT /api/warehouses/:id`
- `PATCH /api/warehouses/:id/status`

### Stock
- `GET /api/stock/movements`
- `POST /api/stock/in`
- `POST /api/stock/out`
- `POST /api/stock/transfer`
- `GET /api/stock/current`

### Reports
- `GET /api/reports/dashboard`
- `GET /api/reports/critical`
- `GET /api/reports/movements`
- `GET /api/reports/stock-summary`

### Logs
- `GET /api/logs`

## Smoke test checklist

### Auth
- login çalışıyor mu
- `/api/auth/me` kullanıcıyı dönüyor mu

### Products
- ürün listesi geliyor mu
- yeni ürün eklenebiliyor mu

### Warehouses
- depo listesi geliyor mu
- yeni depo eklenebiliyor mu

### Stock
- stock in ile miktar artıyor mu
- stock out ile miktar düşüyor mu
- yetersiz stokta hata veriyor mu
- transfer sonrası kaynak azalıyor, hedef artıyor mu

### Dashboard
- kartlar veri gösteriyor mu
- son hareketler geliyor mu

### Logs
- giriş ve stok hareketleri loglanıyor mu

## VPS deployment notu

Önerilen yapı:

- Ubuntu
- Node.js LTS
- PostgreSQL
- Nginx
- PM2
- SSL (Let's Encrypt)

Adım sırası:

1. PostgreSQL kur
2. backend `.env` oluştur
3. `npm install`
4. `prisma migrate deploy`
5. `npm run seed`
6. PM2 ile ayağa kaldır
7. Nginx reverse proxy bağla
8. SSL ekle

## Bilinçli olarak sonraya bırakılanlar

Bunlar V2 için daha uygun:

- gelişmiş frontend CRUD formları
- barkod kamera entegrasyonu
- csv import/export
- gelişmiş rol matrisi
- detaylı audit diff kayıtları
- satın alma / tedarikçi modülü

## Not

Bu full pack, mevcut konuşmadaki hedefe uygun olarak **tek ZIP içinde replace edilebilir çekirdek sistem** mantığıyla hazırlanmıştır.
