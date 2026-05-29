# Pj2 — Học Tiếng Nhật

Ứng dụng web tra cứu từ vựng và kanji tiếng Nhật, xây dựng trên **React + Vite** (frontend) và **Node.js / Express** (backend), lưu dữ liệu trên **MongoDB Atlas**.

---

## Mục lục

- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt & chạy local (development)](#cài-đặt--chạy-local-development)
- [Nạp dữ liệu vào database](#nạp-dữ-liệu-vào-database)
- [Chạy bằng Docker](#chạy-bằng-docker)
- [Biến môi trường](#biến-môi-trường)

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---------|---------------------|
| Node.js | 18+ |
| npm     | 9+  |
| Docker  | 24+ (nếu dùng Docker) |

> Database dùng **MongoDB Atlas** (cloud) — không cần cài MongoDB cục bộ.

---

## Cấu trúc dự án

```
Pj2/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express backend
│   ├── data/
│   │   └── mock/    # Dữ liệu mẫu (được commit lên git)
│   │       ├── term_bank_1.json   # ~30 từ vựng mẫu (format Yomichan)
│   │       └── kanji.json         # ~15 kanji mẫu
│   ├── scripts/
│   │   ├── importData.js   # Import từ vựng
│   │   └── importKanji.js  # Import kanji
│   └── .env         # Biến môi trường (KHÔNG commit)
├── .env             # Biến môi trường cho Docker (KHÔNG commit)
└── docker-compose.yml
```
---

## Cài đặt & chạy local (development)

### 1. Clone repository

```bash
git clone <repo-url>
cd Pj2
```

### 2. Cấu hình biến môi trường

Tạo file `server/.env` (xem mẫu tại [`.env.example`](.env.example)):

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.73klsux.mongodb.net/web-data?appName=Cluster0
JWT_SECRET=<chuỗi_bí_mật_dài_và_ngẫu_nhiên>
JWT_EXPIRES_IN=7d
```

### 3. Cài dependencies

```bash
# Backend
cd server
npm install

# Frontend (mở terminal mới)
cd client
npm install
```

### 4. Nạp dữ liệu mẫu (bắt buộc lần đầu)

```bash
cd server
npm run import:mock
```

Lệnh này nạp **30 từ vựng** và **15 kanji** từ `data/mock/` vào MongoDB Atlas, đủ để chạy thử ứng dụng.

### 5. Khởi động servers

```bash
# Backend (cổng 5000)
cd server
npm run dev

# Frontend (cổng 5173) — mở terminal mới
cd client
npm run dev
```

Truy cập: **http://localhost:5173**

---

## Nạp dữ liệu vào database

### Dùng dữ liệu mẫu (mock) — nhanh, không cần file ngoài

```bash
cd server

# Nạp cả từ vựng lẫn kanji (xóa dữ liệu cũ trước)
npm run import:mock

# Hoặc riêng lẻ
npm run import:words:mock    # chỉ từ vựng
npm run import:kanji:mock    # chỉ kanji
```

### Dùng bộ dữ liệu thật (Yomichan / JMDict)

Đặt các file `term_bank_*.json` vào `server/data/` (chúng bị gitignore), sau đó:

```bash
cd server

npm run import:all         # nạp toàn bộ từ vựng + kanji (có --drop)

# Hoặc riêng lẻ với tùy chọn chi tiết
node scripts/importData.js ./data --format=yomichan --drop
node scripts/importKanji.js --drop
```

| Script | Mô tả |
|--------|-------|
| `import:mock`        | Nạp mock data (words + kanji), xóa dữ liệu cũ |
| `import:words:mock`  | Chỉ nạp mock words |
| `import:kanji:mock`  | Chỉ nạp mock kanji |
| `import:all`         | Nạp dữ liệu thật từ `server/data/` |
| `import:words`       | Chỉ nạp words thật |
| `import:kanji`       | Chỉ nạp kanji thật |

---

## Chạy bằng Docker

### Development / Staging

```bash
# Tạo file .env ở thư mục gốc (xem .env.example)
cp .env.example .env
# Chỉnh sửa .env với MONGO_URI thực

docker compose up --build
```

Frontend: **http://localhost:80**

### Production (pre-built images)

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Biến môi trường

| Biến | Mô tả | Bắt buộc |
|------|-------|----------|
| `MONGO_URI` | Connection string MongoDB Atlas | ✅ |
| `JWT_SECRET` | Khóa bí mật ký JWT (tối thiểu 32 ký tự) | ✅ |
| `JWT_EXPIRES_IN` | Thời gian hết hạn token (vd: `7d`) | ❌ (mặc định `7d`) |
| `PORT` | Cổng server Express | ❌ (mặc định `5000`) |

