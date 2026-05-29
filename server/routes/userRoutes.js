const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const upload         = require("../middlewares/upload");
const { updateProfile, uploadAvatar } = require("../controllers/userController");

// PATCH /api/user/profile  — change username / jlptGoal
router.patch("/profile", authMiddleware, updateProfile);

// POST  /api/user/avatar   — upload avatar (auth guard + multer + sharp)
router.post(
  "/avatar",
  authMiddleware,
  upload.single("avatar"),
  // Multer error handler (file type / size rejection)
  (err, _req, res, next) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  },
  uploadAvatar
);

module.exports = router;
