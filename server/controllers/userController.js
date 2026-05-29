const path = require("path");
const fs   = require("fs");
const sharp = require("sharp");
const User  = require("../models/User");

const AVATARS_DIR = path.join(__dirname, "../uploads/avatars");

// Ensure upload directory exists on first load
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// PATCH /api/user/profile
// Updates username and/or jlptGoal for the authenticated user.
const updateProfile = async (req, res) => {
  try {
    const { username, jlptGoal } = req.body;
    const updates = {};

    if (username !== undefined) {
      const trimmed = username.trim();
      if (!trimmed) {
        return res.status(400).json({ message: "Tên hiển thị không được để trống" });
      }
      updates.username = trimmed;
    }

    if (jlptGoal !== undefined) {
      const VALID_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
      if (!VALID_LEVELS.includes(jlptGoal)) {
        return res.status(400).json({ message: "Cấp độ JLPT không hợp lệ" });
      }
      updates.jlptGoal = jlptGoal;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu cần cập nhật" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, select: "-password" }
    );

    res.json({ message: "Cập nhật hồ sơ thành công", user });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// POST /api/user/avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Không có file ảnh" });
    }

    const filename    = `avatar_${req.user.id}_${Date.now()}.webp`;
    const outputPath  = path.join(AVATARS_DIR, filename);

    // Resize to 200×200 (cover crop), convert to WebP quality 80
    await sharp(req.file.buffer)
      .resize(200, 200, { fit: "cover", position: "center" })
      .webp({ quality: 80 })
      .toFile(outputPath);

    const newAvatarPath = `/uploads/avatars/${filename}`;

    // Delete previous local avatar to reclaim disk space
    const currentUser = await User.findById(req.user.id).select("avatar");
    if (currentUser?.avatar?.startsWith("/uploads/")) {
      const oldFilePath = path.join(__dirname, "..", currentUser.avatar);
      fs.unlink(oldFilePath, () => {}); // non-blocking; ignore missing-file errors
    }

    await User.findByIdAndUpdate(req.user.id, { avatar: newAvatarPath });

    res.json({ message: "Cập nhật avatar thành công", avatar: newAvatarPath });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = { updateProfile, uploadAvatar };
