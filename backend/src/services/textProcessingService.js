import path from "path";
import { spawn } from "child_process";

const SAFE_TOKEN_LIMIT = 450;
const MIN_CHUNK_TOKENS = 50;

/*
 * Remove artifacts produced by PDF extraction
 * and normalize whitespace without destroying
 * paragraph boundaries.
 */
const cleanExtractedText = (text) => {
  if (!text || typeof text !== "string") {
    return "";
  }

  let cleaned = text;

  // Remove common PDF parser page markers.
  cleaned = cleaned.replace(
    /^--\s*\d+\s+of\s+\d+\s*--$/gim,
    ""
  );

  // Normalize Windows line endings.
  cleaned = cleaned.replace(/\r\n/g, "\n");

  // Normalize non-breaking spaces.
  cleaned = cleaned.replace(/\u00a0/g, " ");

  // Remove trailing spaces.
  cleaned = cleaned.replace(/[ \t]+$/gm, "");

  // Collapse excessive spaces inside lines.
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

  // Join lines that are clearly continuations
  // of the same sentence.
  cleaned = cleaned.replace(
    /([a-z0-9,;:)])\n(?=[a-z0-9(])/g,
    "$1 "
  );

  // Preserve paragraph separation.
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
};

/*
 * Ask the same T5 tokenizer used by the ML pipeline
 * to count tokens.
 */
const countTokens = (text) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(
      process.cwd(),
      "token_count.py"
    );

    const pythonProcess = spawn(
      "python",
      [scriptPath, text],
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
      reject
    );

    pythonProcess.on(
      "close",
      (code) => {
        if (code !== 0) {
          reject(
            new Error(
              stderr.trim() ||
                `Token counter exited with code ${code}.`
            )
          );

          return;
        }

        const count = Number(
          stdout.trim()
        );

        if (!Number.isFinite(count)) {
          reject(
            new Error(
              "Invalid token count returned by Python."
            )
          );

          return;
        }

        resolve(count);
      }
    );
  });
};

/*
 * Split text into paragraph-based pieces first.
 */
const splitIntoParagraphs = (text) => {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph.trim()
    )
    .filter(Boolean);
};

/*
 * Split an oversized paragraph into sentences.
 */
const splitIntoSentences = (paragraph) => {
  return paragraph
    .split(
      /(?<=[.!?])\s+(?=[A-Z0-9])/g
    )
    .map((sentence) =>
      sentence.trim()
    )
    .filter(Boolean);
};

/*
 * Build chunks while respecting the safe token limit.
 *
 * This function uses the actual T5 tokenizer,
 * rather than estimating token length by characters.
 */
const createChunks = async (text) => {
  const paragraphs =
    splitIntoParagraphs(text);

  const chunks = [];
  let currentChunk = "";
  let currentTokens = 0;

  const addPiece = async (piece) => {
    const cleanPiece =
      piece.trim();

    if (!cleanPiece) {
      return;
    }

    const pieceTokens =
      await countTokens(cleanPiece);

    /*
     * A single sentence/paragraph can itself be
     * larger than the safe limit.
     */
    if (
      pieceTokens >
      SAFE_TOKEN_LIMIT
    ) {
      const words =
        cleanPiece.split(/\s+/);

      let wordChunk = "";
      let wordTokens = 0;

      for (const word of words) {
        const candidate = wordChunk
          ? `${wordChunk} ${word}`
          : word;

        const candidateTokens =
          await countTokens(candidate);

        if (
          candidateTokens >
            SAFE_TOKEN_LIMIT &&
          wordChunk
        ) {
          if (
            currentChunk
          ) {
            chunks.push({
              text: currentChunk.trim(),
              tokens: currentTokens,
            });

            currentChunk = "";
            currentTokens = 0;
          }

          chunks.push({
            text: wordChunk.trim(),
            tokens: wordTokens,
          });

          wordChunk = word;
          wordTokens =
            await countTokens(word);
        } else {
          wordChunk = candidate;
          wordTokens =
            candidateTokens;
        }
      }

      if (wordChunk) {
        if (
          currentChunk &&
          currentTokens + wordTokens <=
            SAFE_TOKEN_LIMIT
        ) {
          currentChunk +=
            ` ${wordChunk}`;

          currentTokens =
            await countTokens(
              currentChunk
            );
        } else {
          if (currentChunk) {
            chunks.push({
              text:
                currentChunk.trim(),
              tokens:
                currentTokens,
            });
          }

          currentChunk =
            wordChunk;
          currentTokens =
            wordTokens;
        }
      }

      return;
    }

    const separator =
      currentChunk ? "\n\n" : "";

    const candidate =
      `${currentChunk}${separator}${cleanPiece}`;

    const candidateTokens =
      await countTokens(candidate);

    if (
      candidateTokens <=
      SAFE_TOKEN_LIMIT
    ) {
      currentChunk = candidate;
      currentTokens =
        candidateTokens;
    } else {
      if (currentChunk) {
        chunks.push({
          text: currentChunk.trim(),
          tokens: currentTokens,
        });
      }

      currentChunk =
        cleanPiece;
      currentTokens =
        pieceTokens;
    }
  };

  for (const paragraph of paragraphs) {
    const paragraphTokens =
      await countTokens(paragraph);

    if (
      paragraphTokens <=
      SAFE_TOKEN_LIMIT
    ) {
      await addPiece(paragraph);
      continue;
    }

    const sentences =
      splitIntoSentences(
        paragraph
      );

    for (const sentence of sentences) {
      await addPiece(sentence);
    }
  }

  if (currentChunk) {
    chunks.push({
      text: currentChunk.trim(),
      tokens: currentTokens,
    });
  }

  /*
   * Avoid tiny trailing chunks when possible.
   */
  if (chunks.length > 1) {
    const lastChunk =
      chunks[chunks.length - 1];

    if (
      lastChunk.tokens <
      MIN_CHUNK_TOKENS
    ) {
      const previousChunk =
        chunks[chunks.length - 2];

      const merged =
        `${previousChunk.text}\n\n${lastChunk.text}`;

      const mergedTokens =
        await countTokens(merged);

      if (
        mergedTokens <=
        SAFE_TOKEN_LIMIT
      ) {
        previousChunk.text =
          merged;

        previousChunk.tokens =
          mergedTokens;

        chunks.pop();
      }
    }
  }

  return chunks.map(
    (chunk, index) => ({
      index: index + 1,
      text: chunk.text,
      tokens: chunk.tokens,
    })
  );
};

const processText = async (
  extractedText
) => {
  const cleanedText =
    cleanExtractedText(
      extractedText
    );

  if (!cleanedText) {
    return {
      cleanedText: "",
      chunks: [],
      totalTokens: 0,
    };
  }

  const totalTokens =
    await countTokens(
      cleanedText
    );

  const chunks =
    await createChunks(
      cleanedText
    );

  return {
    cleanedText,
    chunks,
    totalTokens,
  };
};

export {
  cleanExtractedText,
  countTokens,
  createChunks,
  processText,
};