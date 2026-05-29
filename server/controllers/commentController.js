const Comment = require("../models/Comment");

const PAGE_SIZE = 10;

// @desc  Get comments for a target (paginated, sorted by score then newest)
// @route GET /api/comments?targetType=word&targetId=xxx&page=1
const getComments = async (req, res) => {
  try {
    const { targetType, targetId, page = 1 } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({ message: "Thiếu tham số targetType hoặc targetId" });
    }
    const skip = (Number(page) - 1) * PAGE_SIZE;
    const [comments, total] = await Promise.all([
      Comment.find({ targetType, targetId })
        .populate("user_id", "username avatar")
        .sort({ score: -1, createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean(),
      Comment.countDocuments({ targetType, targetId }),
    ]);
    res.json({
      comments,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// @desc  Add a comment (rate-limited: 1 per minute per section per user)
// @route POST /api/comments  (auth required)
const addComment = async (req, res) => {
  try {
    const { targetType, targetId, content } = req.body;
    if (!targetType || !targetId || !content?.trim()) {
      return res.status(400).json({ message: "Thiếu thông tin bình luận" });
    }
    // Rate limit check
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recent = await Comment.findOne({
      targetType,
      targetId,
      user_id: req.user._id,
      createdAt: { $gte: oneMinuteAgo },
    });
    if (recent) {
      const waitSecs = Math.ceil(
        (new Date(recent.createdAt).getTime() + 60000 - Date.now()) / 1000
      );
      return res.status(429).json({
        message: `Vui lòng chờ ${waitSecs} giây trước khi bình luận tiếp`,
        waitSeconds: waitSecs,
      });
    }
    const comment = await Comment.create({
      targetType,
      targetId,
      user_id: req.user._id,
      content: content.trim(),
    });
    const populated = await comment.populate("user_id", "username avatar");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// @desc  Delete own comment
// @route DELETE /api/comments/:id  (auth required)
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }
    if (comment.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
    }
    await comment.deleteOne();
    res.json({ message: "Đã xóa bình luận" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// @desc  Upvote / downvote a comment
// @route POST /api/comments/:id/vote  (auth required)
const voteComment = async (req, res) => {
  try {
    const { vote } = req.body; // "up" or "down"
    if (!["up", "down"].includes(vote)) {
      return res.status(400).json({ message: "Vote không hợp lệ (up hoặc down)" });
    }
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }
    const userId = req.user._id.toString();
    const isUpvoted   = comment.upvotes.some((id) => id.toString() === userId);
    const isDownvoted = comment.downvotes.some((id) => id.toString() === userId);

    if (vote === "up") {
      if (isUpvoted) {
        comment.upvotes = comment.upvotes.filter((id) => id.toString() !== userId);
      } else {
        comment.upvotes.push(req.user._id);
        comment.downvotes = comment.downvotes.filter((id) => id.toString() !== userId);
      }
    } else {
      if (isDownvoted) {
        comment.downvotes = comment.downvotes.filter((id) => id.toString() !== userId);
      } else {
        comment.downvotes.push(req.user._id);
        comment.upvotes = comment.upvotes.filter((id) => id.toString() !== userId);
      }
    }
    comment.score = comment.upvotes.length - comment.downvotes.length;
    await comment.save();
    res.json({
      _id: comment._id,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      score: comment.score,
    });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

module.exports = { getComments, addComment, deleteComment, voteComment };
