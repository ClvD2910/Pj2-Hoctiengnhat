const express = require("express");
const router = express.Router();
const { getComments, addComment, deleteComment, voteComment } = require("../controllers/commentController");
const authMiddleware = require("../middlewares/authMiddleware");

// GET /api/comments — public
router.get("/", getComments);

// POST /api/comments — auth required
router.post("/", authMiddleware, addComment);

// DELETE /api/comments/:id — auth required
router.delete("/:id", authMiddleware, deleteComment);

// POST /api/comments/:id/vote — auth required
router.post("/:id/vote", authMiddleware, voteComment);

module.exports = router;
