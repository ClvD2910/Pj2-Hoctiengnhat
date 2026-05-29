const multer = require("multer");

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB  = 5;

const upload = multer({
  // Keep file in memory so sharp can process the buffer before writing
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF"), false);
    }
  },
});

module.exports = upload;
