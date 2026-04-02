const express = require("express");
const router = express.Router();
const { addWordToNotebook, getNotebooks } = require("../controllers/notebookController");
const authMiddleware = require("../middlewares/authMiddleware");

// All notebook routes require authentication
router.use(authMiddleware);

// POST /api/notebooks/add-word
router.post("/add-word", addWordToNotebook);

// GET /api/notebooks
router.get("/", getNotebooks);

module.exports = router;
