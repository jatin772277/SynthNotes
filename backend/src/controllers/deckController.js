import Deck from "../models/Deck.js";
import Flashcard from "../models/Flashcard.js";
import Review from "../models/Review.js";

// ============================================================
// CREATE A DECK
// ============================================================

export const createDeck = async (req, res) => {
  try {
    const {
      title,
      description,
      topic,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Deck title is required",
      });
    }

    const deck = await Deck.create({
      user: req.user.userId,
      title,
      description,
      topic: topic || "General",
    });

    res.status(201).json({
      success: true,
      message: "Deck created successfully",
      deck,
    });
  } catch (error) {
    console.error(
      "Create deck error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// GET ALL DECKS BELONGING TO LOGGED-IN USER
// ============================================================

export const getDecks = async (req, res) => {
  try {
    const decks = await Deck.find({
      user: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    // Get flashcard counts for all decks
    const decksWithCounts = await Promise.all(
      decks.map(async (deck) => {
        const flashcardCount =
          await Flashcard.countDocuments({
            deck: deck._id,
          });

        return {
          ...deck.toObject(),
          flashcardCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      decks: decksWithCounts,
    });
  } catch (error) {
    console.error(
      "Get decks error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// GET ONE DECK
// ============================================================

export const getDeck = async (req, res) => {
  try {
    const deck = await Deck.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Deck not found",
      });
    }

    const flashcardCount =
      await Flashcard.countDocuments({
        deck: deck._id,
      });

    res.status(200).json({
      success: true,
      deck: {
        ...deck.toObject(),
        flashcardCount,
      },
    });
  } catch (error) {
    console.error(
      "Get deck error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// UPDATE A DECK
// ============================================================

export const updateDeck = async (req, res) => {
  try {
    const {
      title,
      description,
      topic,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Deck title is required",
      });
    }

    const deck =
      await Deck.findOneAndUpdate(
        {
          _id: req.params.id,
          user: req.user.userId,
        },
        {
          title,
          description,
          topic: topic || "General",
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Deck not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Deck updated successfully",
      deck,
    });
  } catch (error) {
    console.error(
      "Update deck error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// DELETE A DECK AND ITS ASSOCIATED FLASHCARDS/REVIEWS
// ============================================================

export const deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Deck not found",
      });
    }

    // Find all flashcards belonging to this deck
    const flashcards = await Flashcard.find({
      deck: deck._id,
    }).select("_id");

    const flashcardIds = flashcards.map(
      (flashcard) => flashcard._id
    );

    // Delete reviews associated with those flashcards
    if (flashcardIds.length > 0) {
      await Review.deleteMany({
        flashcard: {
          $in: flashcardIds,
        },
        user: req.user.userId,
      });
    }

    // Delete all flashcards in the deck
    await Flashcard.deleteMany({
      deck: deck._id,
    });

    // Delete the deck
    await deck.deleteOne();

    res.status(200).json({
      success: true,
      message:
        "Deck and associated data deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete deck error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};