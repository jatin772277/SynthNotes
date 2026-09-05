import Review from "../models/Review.js";
import Flashcard from "../models/Flashcard.js";
import Deck from "../models/Deck.js";

// Create a review
export const createReview = async (req, res) => {
  try {
    const { flashcardId, recallRating } = req.body;

    if (!flashcardId || recallRating === undefined) {
      return res.status(400).json({
        success: false,
        message: "Flashcard ID and recall rating are required",
      });
    }

    if (![1, 2, 3, 4].includes(Number(recallRating))) {
      return res.status(400).json({
        success: false,
        message: "Recall rating must be between 1 and 4",
      });
    }

    // Find the flashcard
    const flashcard = await Flashcard.findById(flashcardId);

    if (!flashcard) {
      return res.status(404).json({
        success: false,
        message: "Flashcard not found",
      });
    }

    // Verify that the flashcard belongs to a deck owned by the user
    const deck = await Deck.findOne({
      _id: flashcard.deck,
      user: req.user.userId,
    });

    if (!deck) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this flashcard",
      });
    }

    const review = await Review.create({
      user: req.user.userId,
      flashcard: flashcardId,
      recallRating: Number(recallRating),
    });

    res.status(201).json({
      success: true,
      message: "Review recorded successfully",
      review,
    });
  } catch (error) {
    console.error("Create review error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get reviews for logged-in user
export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      user: req.user.userId,
    })
      .populate("flashcard", "question answer deck")
      .sort({ reviewedAt: -1 });

    res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// Get review analytics
export const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reviews = await Review.find({
      user: userId,
    });

    const totalReviews = reviews.length;

    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    let ratingSum = 0;

    for (const review of reviews) {
      const rating = review.recallRating;

      ratingDistribution[rating]++;
      ratingSum += rating;
    }

    const averageRecall =
      totalReviews > 0
        ? Number((ratingSum / totalReviews).toFixed(2))
        : 0;

    const flashcardIds = [
      ...new Set(
        reviews.map((review) => review.flashcard.toString())
      ),
    ];

    res.status(200).json({
      success: true,
      analytics: {
        totalReviews,
        totalReviewedFlashcards: flashcardIds.length,
        averageRecall,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};