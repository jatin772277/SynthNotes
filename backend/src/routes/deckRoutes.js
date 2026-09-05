import express from "express";

import {
  createDeck,
  getDecks,
  getDeck,
  updateDeck,
  deleteDeck,
} from "../controllers/deckController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createDeck);
router.get("/", getDecks);
router.get("/:id", getDeck);
router.put("/:id", updateDeck);
router.delete("/:id", deleteDeck);

export default router;