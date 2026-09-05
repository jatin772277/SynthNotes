import express from "express";
import { getDashboardAnalytics } from "../controllers/analyticsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard", getDashboardAnalytics);

export default router;