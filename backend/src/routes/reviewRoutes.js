import express from "express";

import {
  createReview,
  getReviews,
  getAnalytics,
} from "../controllers/reviewController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All review routes require authentication
router.use(authMiddleware);

router.post("/", createReview);
router.get("/", getReviews);
router.get("/analytics", getAnalytics);

export default router;