# =============================================================
# client/Dockerfile — Multi-stage build
#
# Stage 1 (builder): Dùng Node để build Vite → tạo ra thư mục dist/
# Stage 2 (runner):  Dùng Nginx để serve các file static từ dist/
# Kết quả: image production chỉ ~25MB, không chứa Node hay source code
# =============================================================

# ── Stage 1: BUILD ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies manifest trước để cache layer
COPY package.json package-lock.json* ./

# Cài đầy đủ dependencies (cần devDependencies để chạy vite build)
# Dùng `npm install` thay vì `npm ci` vì package-lock.json đang bị gitignore
# nên lock file có thể không đồng bộ với package.json
RUN npm install

# Copy toàn bộ source code
COPY . .

# Build production bundle → output ra thư mục /app/dist
# Vite sẽ đọc VITE_* env vars ở build time nếu cần
RUN npm run build

# ── Stage 2: SERVE ────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Xóa config mặc định của Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copy config tùy chỉnh (hỗ trợ SPA fallback + proxy API)
COPY nginx.conf /etc/nginx/conf.d/app.conf

# Copy output từ Stage 1 vào thư mục Nginx serve
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx lắng nghe cổng 80
EXPOSE 80

# Nginx khởi động ở foreground (bắt buộc với Docker)
CMD ["nginx", "-g", "daemon off;"]
