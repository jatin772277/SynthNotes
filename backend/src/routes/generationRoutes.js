import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  uploadPdf,
  extractPdfText,
  processExtractedText,
  generateFlashcards,
} from "../controllers/generationController.js";

const router = express.Router();

const uploadDirectory = path.join(
  process.cwd(),
  "uploads"
);

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}


// ============================================================
// MULTER CONFIGURATION
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension =
      path.extname(file.originalname);

    const baseName = path
      .basename(
        file.originalname,
        extension
      )
      .replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );

    const uniqueName =
      `${baseName}-${Date.now()}${extension}`;

    cb(
      null,
      uniqueName
    );
  },
});


const fileFilter = (
  req,
  file,
  cb
) => {
  if (
    file.mimetype ===
    "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only PDF files are allowed."
      ),
      false
    );
  }
};


const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize:
      10 * 1024 * 1024,
  },
});


// ============================================================
// ROUTES
// ============================================================

// Upload PDF
router.post(
  "/upload",
  authMiddleware,
  upload.single("pdf"),
  uploadPdf
);


// Extract PDF text
router.post(
  "/extract",
  authMiddleware,
  (req, res, next) => {
    req.uploadDirectory =
      uploadDirectory;

    next();
  },
  extractPdfText
);


// Process raw text with ML
router.post(
  "/process",
  authMiddleware,
  processExtractedText
);


// Generate + save flashcards
router.post(
  "/generate",
  authMiddleware,
  generateFlashcards
);


export default router;
