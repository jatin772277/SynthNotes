import Flashcard from "../models/Flashcard.js";
import Deck from "../models/Deck.js";

// Create a flashcard
export const createFlashcard = async (req, res) => {
  try {
    const { question, answer } = req.body;
    const { deckId } = req.params;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required",
      });
    }

    // Make sure the deck belongs to the logged-in user
    const deck = await Deck.findOne({
      _id: deckId,
      user: req.user.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Deck not found",
      });
    }

    const flashcard = await Flashcard.create({
      deck: deckId,
      question,
      answer,
    });

    res.status(201).json({
      success: true,
      message: "Flashcard created successfully",
      flashcard,
    });
  } catch (error) {
    console.error("Create flashcard error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get all flashcards in a deck
export const getFlashcards = async (req, res) => {
  try {
    const { deckId } = req.params;

    // Verify deck ownership
    const deck = await Deck.findOne({
      _id: deckId,
      user: req.user.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Deck not found",
      });
    }

    const flashcards = await Flashcard.find({
      deck: deckId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      flashcards,
    });
  } catch (error) {
    console.error("Get flashcards error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get one flashcard
export const getFlashcard = async (req, res) => {
  try {
    const flashcard = await Flashcard.findById(req.params.id).populate(
      "deck"
    );

    if (
      !flashcard ||
      flashcard.deck.user.toString() !== req.user.userId
    ) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    res.status(200).json({
      success: true,
      flashcard,
    });
  } catch (error) {
    console.error("Get flashcard error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Update a flashcard
export const updateFlashcard = async (req, res) => {
  try {
    const { question, answer } = req.body;

    const flashcard = await Flashcard.findById(req.params.id).populate(
      "deck"
    );

    if (
      !flashcard ||
      flashcard.deck.user.toString() !== req.user.userId
    ) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    if (question !== undefined) {
      flashcard.question = question;
    }

    if (answer !== undefined) {
      flashcard.answer = answer;
    }

    await flashcard.save();

    res.status(200).json({
      success: true,
      message: "Flashcard updated successfully",
      flashcard,
    });
  } catch (error) {
    console.error("Update flashcard error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Delete a flashcard
export const deleteFlashcard = async (req, res) => {
  try {
    const flashcard = await Flashcard.findById(req.params.id).populate(
      "deck"
    );

    if (
      !flashcard ||
      flashcard.deck.user.toString() !== req.user.userId
    ) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    await flashcard.deleteOne();

    res.status(200).json({
      success: true,
      message: "Flashcard deleted successfully",
    });
  } catch (error) {
    console.error("Delete flashcard error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};