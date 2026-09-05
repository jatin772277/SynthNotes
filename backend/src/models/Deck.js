import mongoose from "mongoose";

const deckSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    topic: {
      type: String,
      trim: true,
      default: "General",
    },
  },
  {
    timestamps: true,
  }
);

const Deck = mongoose.model("Deck", deckSchema);

export default Deck;