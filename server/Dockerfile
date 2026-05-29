# =============================================================
# server/Dockerfile
# Node.js backend cho MERN stack
# =============================================================

# Dùng Node 20 LTS phiên bản Alpine để giảm kích thước image
FROM node:20-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Copy file khai báo dependencies trước để tận dụng Docker layer cache:
# Nếu package.json không đổi, bước `npm ci` sẽ dùng cache → build nhanh hơn
COPY package.json package-lock.json* ./

# Cài dependencies production-only (bỏ devDependencies để image nhỏ hơn)
RUN npm ci --omit=dev

# Copy toàn bộ source code còn lại
COPY . .

# Expose port mà Express đang lắng nghe (khớp với process.env.PORT || 5000)
EXPOSE 5000

# Lệnh khởi động ứng dụng
CMD ["node", "server.js"]
