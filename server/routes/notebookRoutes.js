const express = require("express");
const router = express.Router();
const {
  addWordToNotebook,
  addCustomWordToNotebook,
  getNotebooks,
  getNotebookById,
  createNotebook,
  deleteNotebook,
  renameNotebook,
  updateWordInNotebook,
  removeWordFromNotebook,
  toggleMastered,
} = require("../controllers/notebookController");
const authMiddleware = require("../middlewares/authMiddleware");

// All notebook routes require authentication
router.use(authMiddleware);

// POST /api/notebooks/add-word
router.post("/add-word", addWordToNotebook);

// POST /api/notebooks/create
router.post("/create", createNotebook);

// GET /api/notebooks
router.get("/", getNotebooks);

// GET /api/notebooks/:id
router.get("/:id", getNotebookById);

// DELETE /api/notebooks/:id
router.delete("/:id", deleteNotebook);

// PATCH /api/notebooks/:id/rename
router.patch("/:id/rename", renameNotebook);

// POST /api/notebooks/:id/custom-word
router.post("/:id/custom-word", addCustomWordToNotebook);

// PUT /api/notebooks/:id/words/:entryId
router.put("/:id/words/:entryId", updateWordInNotebook);

// PATCH /api/notebooks/:id/words/:entryId/mastered
router.patch("/:id/words/:entryId/mastered", toggleMastered);

// DELETE /api/notebooks/:id/words/:wordId
router.delete("/:id/words/:wordId", removeWordFromNotebook);

module.exports = router;
