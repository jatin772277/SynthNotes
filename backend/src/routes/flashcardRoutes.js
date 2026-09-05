import express from "express";

import {
  createFlashcard,
  getFlashcards,
  getFlashcard,
  updateFlashcard,
  deleteFlashcard,
} from "../controllers/flashcardController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All flashcard routes require authentication
router.use(authMiddleware);

// Deck flashcards
router.post("/decks/:deckId", createFlashcard);
router.get("/decks/:deckId", getFlashcards);

// Individual flashcard
router.get("/:id", getFlashcard);
router.put("/:id", updateFlashcard);
router.delete("/:id", deleteFlashcard);

export default router;