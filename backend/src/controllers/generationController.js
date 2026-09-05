import {
  processTextWithML,
} from "../services/mlService.js";

import Flashcard from "../models/Flashcard.js";
import Deck from "../models/Deck.js";

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { PDFParse } from "pdf-parse";

const MIN_TEXT_LENGTH = 50;

// ============================================================
// TEMPORARY PDF CLEANUP
// ============================================================

const deleteUploadedFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      console.log(
        `Temporary PDF deleted: ${filePath}`
      );
    }
  } catch (error) {
    console.error(
      "Failed to delete temporary PDF:",
      error.message
    );
  }
};

// ============================================================
// UPLOAD PDF
// ============================================================

const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "PDF uploaded successfully.",
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error("PDF upload error:", error);

    if (
      req.file?.path &&
      fs.existsSync(req.file.path)
    ) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload PDF.",
    });
  }
};

// ============================================================
// OCR
// ============================================================

const runOcr = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      "python",
      [
        path.join(process.cwd(), "ocr.py"),
        pdfPath,
      ],
      {
        windowsHide: true,
      }
    );

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on(
      "data",
      (data) => {
        stdout += data.toString();
      }
    );

    pythonProcess.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      }
    );

    pythonProcess.on(
      "error",
      (error) => {
        reject(error);
      }
    );

    pythonProcess.on(
      "close",
      (code) => {
        if (code !== 0) {
          reject(
            new Error(
              stderr.trim() ||
                `OCR process exited with code ${code}.`
            )
          );

          return;
        }

        resolve(stdout.trim());
      }
    );
  });
};

// ============================================================
// EXTRACT PDF TEXT
// ============================================================

const extractPdfText = async (req, res) => {
  let parser = null;
  let filePath = null;

  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: "PDF filename is required.",
      });
    }

    const uploadDirectory =
      req.uploadDirectory;

    if (!uploadDirectory) {
      return res.status(500).json({
        success: false,
        message:
          "Upload directory is not configured.",
      });
    }

    const safeFilename =
      path.basename(filename);

    filePath = path.join(
      uploadDirectory,
      safeFilename
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "PDF file not found.",
      });
    }

    const pdfBuffer =
      fs.readFileSync(filePath);

    parser = new PDFParse({
      data: pdfBuffer,
    });

    const result =
      await parser.getText();

    const extractedText =
      result.text?.trim() || "";

    // --------------------------------------------------------
    // Normal PDF text extraction
    // --------------------------------------------------------

    if (
      extractedText.length >=
      MIN_TEXT_LENGTH
    ) {
      return res.status(200).json({
        success: true,
        message:
          "PDF text extracted successfully.",
        extractionMethod: "pdf-text",
        document: {
          filename: safeFilename,
          pages: result.total,
          characters: extractedText.length,
          text: extractedText,
        },
      });
    }

    // --------------------------------------------------------
    // OCR fallback
    // --------------------------------------------------------

    console.log(
      `Insufficient PDF text (${extractedText.length} characters). Starting OCR...`
    );

    const ocrText =
      await runOcr(filePath);

    if (!ocrText) {
      return res.status(422).json({
        success: false,
        message:
          "No readable text could be extracted from this PDF.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Text extracted from PDF using OCR.",
      extractionMethod: "ocr",
      document: {
        filename: safeFilename,
        pages: result.total,
        characters: ocrText.length,
        text: ocrText,
      },
    });
  } catch (error) {
    console.error(
      "PDF extraction error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to extract text from PDF.",
      error: error.message,
    });
  } finally {
    // --------------------------------------------------------
    // Always delete temporary PDF
    // --------------------------------------------------------

    if (parser) {
      try {
        await parser.destroy();
      } catch (error) {
        console.error(
          "PDF parser cleanup error:",
          error.message
        );
      }
    }

    deleteUploadedFile(filePath);
  }
};

// ============================================================
// PROCESS EXTRACTED TEXT
// ============================================================

const processExtractedText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required.",
      });
    }

    const mlResult =
      await processTextWithML(text);

    return res.status(200).json({
      success: true,
      message:
        "Text processed successfully.",
      processing: mlResult.document,
    });
  } catch (error) {
    console.error(
      "ML processing error:",
      error
    );

    return res.status(502).json({
      success: false,
      message:
        "Unable to process text with ML service.",
      error: error.message,
    });
  }
};

// ============================================================
// GENERATE FLASHCARDS
// ============================================================

const generateFlashcards = async (req, res) => {
  try {
    const {
      deckId,
      text,
    } = req.body;

    // --------------------------------------------------------
    // Validate input
    // --------------------------------------------------------

    if (!deckId) {
      return res.status(400).json({
        success: false,
        message: "Deck ID is required.",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required.",
      });
    }

    // --------------------------------------------------------
    // Verify deck ownership
    // --------------------------------------------------------

    const deck = await Deck.findOne({
      _id: deckId,
      user: req.user.userId,
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        message: "Deck not found.",
      });
    }

    // --------------------------------------------------------
    // Send text to ML service
    // --------------------------------------------------------

    console.log(
      `Generating flashcards for deck ${deckId}...`
    );

    const mlResult =
      await processTextWithML(
        text
      );

    const document =
      mlResult.document;

    if (!document) {
      return res.status(502).json({
        success: false,
        message:
          "ML service returned no document.",
      });
    }

    // --------------------------------------------------------
    // Collect validated flashcards
    // --------------------------------------------------------

    const generatedFlashcards = [];

    for (
      const chunk of document.chunks || []
    ) {
      for (
        const item of chunk.items || []
      ) {
        if (
          item.validated !== true
        ) {
          continue;
        }

        const question =
          item.question?.trim();

        const answer =
          item.answer?.trim();

        if (
          !question ||
          !answer
        ) {
          continue;
        }

        generatedFlashcards.push({
          deck: deckId,
          question,
          answer,
        });
      }
    }

    // --------------------------------------------------------
    // Nothing passed validation
    // --------------------------------------------------------

    if (
      generatedFlashcards.length === 0
    ) {
      return res.status(422).json({
        success: false,
        message:
          "No validated flashcards were generated.",
        statistics: {
          candidates:
            document.candidateCount || 0,
          questions:
            document.questionCount || 0,
          validated:
            document.validatedCount || 0,
          rejected:
            document.rejectedCount || 0,
        },
      });
    }

    // --------------------------------------------------------
    // Save to MongoDB
    // --------------------------------------------------------

    const savedFlashcards =
      await Flashcard.insertMany(
        generatedFlashcards
      );

    // --------------------------------------------------------
    // Return result
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Flashcards generated and saved successfully.",
      statistics: {
        candidates:
          document.candidateCount || 0,
        questions:
          document.questionCount || 0,
        validated:
          document.validatedCount || 0,
        rejected:
          document.rejectedCount || 0,
        saved:
          savedFlashcards.length,
      },
      flashcards:
        savedFlashcards,
    });
  } catch (error) {
    console.error(
      "Generate flashcards error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate flashcards.",
      error: error.message,
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

export {
  uploadPdf,
  extractPdfText,
  processExtractedText,
  generateFlashcards,
};