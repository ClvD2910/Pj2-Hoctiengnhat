# =============================================================
# server/Dockerfile  — PRODUCTION ONLY
# Node.js / Express backend cho MERN stack
#
# Lint được chạy tách biệt trong CI (ci.yml), KHÔNG chạy ở đây.
# Image này chỉ cài production dependencies để tối ưu kích thước.
# =============================================================

# Dùng Node 20 LTS phiên bản Alpine để giảm kích thước image
FROM node:20-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Copy file khai báo dependencies trước để tận dụng Docker layer cache:
# Nếu package.json không đổi, bước `npm install` sẽ dùng cache → build nhanh hơn
COPY package.json package-lock.json* ./

# Cài production dependencies only — bỏ devDependencies (nodemon, v.v.) để image nhỏ hơn
RUN npm install --omit=dev

# Copy toàn bộ source code còn lại
COPY . .

# Expose port mà Express đang lắng nghe (khớp với process.env.PORT || 5000)
EXPOSE 5000

# Lệnh khởi động ứng dụng
CMD ["node", "server.js"]
