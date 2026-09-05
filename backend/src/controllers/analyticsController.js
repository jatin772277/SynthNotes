import Review from "../models/Review.js";
import Flashcard from "../models/Flashcard.js";
import Deck from "../models/Deck.js";

export const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all reviews for the logged-in user
    const reviews = await Review.find({
      user: userId,
    })
      .populate({
        path: "flashcard",
        select: "deck question",
        populate: {
          path: "deck",
          select: "title topic",
        },
      })
      .sort({ reviewedAt: 1 });

    // --------------------------------------------------
    // BASIC SUMMARY
    // --------------------------------------------------

    const totalReviews = reviews.length;

    const reviewedFlashcardIds = new Set(
      reviews.map((review) => review.flashcard?._id?.toString())
    );

    const totalReviewedFlashcards = reviewedFlashcardIds.size;

    let ratingSum = 0;

    const ratingDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    for (const review of reviews) {
      const rating = review.recallRating;

      ratingSum += rating;

      if (ratingDistribution[rating] !== undefined) {
        ratingDistribution[rating]++;
      }
    }

    const averageRecall =
      totalReviews > 0
        ? Number((ratingSum / totalReviews).toFixed(2))
        : 0;

    // --------------------------------------------------
    // DAILY ACTIVITY
    // --------------------------------------------------

    const dailyActivityMap = new Map();

    for (const review of reviews) {
      const date = new Date(review.reviewedAt)
        .toISOString()
        .split("T")[0];

      if (!dailyActivityMap.has(date)) {
        dailyActivityMap.set(date, {
          date,
          reviews: 0,
        });
      }

      dailyActivityMap.get(date).reviews++;
    }

    const heatmap = Array.from(dailyActivityMap.values());

    // --------------------------------------------------
    // ACTIVE DAYS
    // --------------------------------------------------

    const activeDates = Array.from(
      dailyActivityMap.keys()
    ).sort();

    const activeDays = activeDates.length;

    // --------------------------------------------------
    // STREAK CALCULATION
    // --------------------------------------------------

    const activeDateSet = new Set(activeDates);

    const dateToKey = (date) => {
      return date.toISOString().split("T")[0];
    };

    const getPreviousDate = (dateString) => {
      const date = new Date(`${dateString}T00:00:00Z`);

      date.setUTCDate(date.getUTCDate() - 1);

      return dateToKey(date);
    };

    let longestStreak = 0;
    let currentStreak = 0;

    // Calculate longest streak
    for (const dateString of activeDates) {
      const previousDate = getPreviousDate(dateString);

      if (!activeDateSet.has(previousDate)) {
        let streak = 1;
        let nextDate = dateString;

        while (true) {
          const date = new Date(`${nextDate}T00:00:00Z`);

          date.setUTCDate(date.getUTCDate() + 1);

          const nextDateString = dateToKey(date);

          if (!activeDateSet.has(nextDateString)) {
            break;
          }

          streak++;
          nextDate = nextDateString;
        }

        longestStreak = Math.max(
          longestStreak,
          streak
        );
      }
    }

    // Current streak
    if (activeDates.length > 0) {
      const today = dateToKey(new Date());

      const yesterday = getPreviousDate(today);

      let streakStart;

      if (activeDateSet.has(today)) {
        streakStart = today;
      } else if (activeDateSet.has(yesterday)) {
        streakStart = yesterday;
      }

      if (streakStart) {
        currentStreak = 1;

        let currentDate = streakStart;

        while (true) {
          const previousDate =
            getPreviousDate(currentDate);

          if (!activeDateSet.has(previousDate)) {
            break;
          }

          currentStreak++;
          currentDate = previousDate;
        }
      }
    }

    // --------------------------------------------------
    // TOPICS STUDIED
    // --------------------------------------------------

    const topicMap = new Map();

    for (const review of reviews) {
      const topic =
        review.flashcard?.deck?.topic || "General";

      if (!topicMap.has(topic)) {
        topicMap.set(topic, {
          topic,
          reviews: 0,
          lastStudied: null,
        });
      }

      const topicData = topicMap.get(topic);

      topicData.reviews++;

      if (
        !topicData.lastStudied ||
        new Date(review.reviewedAt) >
          new Date(topicData.lastStudied)
      ) {
        topicData.lastStudied = review.reviewedAt;
      }
    }

    const topics = Array.from(topicMap.values()).sort(
      (a, b) => b.reviews - a.reviews
    );

    // --------------------------------------------------
    // RECENTLY STUDIED TOPICS
    // --------------------------------------------------

    const recentTopics = [...topics]
      .sort(
        (a, b) =>
          new Date(b.lastStudied) -
          new Date(a.lastStudied)
      )
      .slice(0, 5);

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    res.status(200).json({
      success: true,

      analytics: {
        summary: {
          totalReviews,
          totalReviewedFlashcards,
          averageRecall,
          activeDays,
        },

        streak: {
          current: currentStreak,
          longest: longestStreak,
        },

        ratings: ratingDistribution,

        heatmap,

        topics,

        recentTopics,
      },
    });
  } catch (error) {
    console.error(
      "Dashboard analytics error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};