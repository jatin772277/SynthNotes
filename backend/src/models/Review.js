import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    flashcard: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flashcard",
      required: true,
    },

    recallRating: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },

    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;