import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Generate() {
  const navigate = useNavigate();

  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("");
  const [file, setFile] = useState(null);

  const [loadingDecks, setLoadingDecks] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [generatedCards, setGeneratedCards] = useState([]);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        setLoadingDecks(true);
        setError("");

        const response = await api.get("/decks");

        if (response.data.success) {
          setDecks(response.data.decks);
        }
      } catch (err) {
        console.error("Fetch decks error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load your decks."
        );
      } finally {
        setLoadingDecks(false);
      }
    };

    fetchDecks();
  }, []);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    setError("");
    setMessage("");
    setGeneratedCards([]);
    setStatistics(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setError("Only PDF files are allowed.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("PDF must be smaller than 10 MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!selectedDeck) {
      setError("Please select a deck.");
      return;
    }

    if (!file) {
      setError("Please select a PDF file.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setMessage("");
      setGeneratedCards([]);
      setStatistics(null);

      // --------------------------------------------------------
      // STEP 1: Upload PDF
      // --------------------------------------------------------

      setStage("Uploading PDF...");

      const formData = new FormData();
      formData.append("pdf", file);

      const uploadResponse = await api.post(
        "/generation/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (!uploadResponse.data.success) {
        throw new Error(
          uploadResponse.data.message ||
            "PDF upload failed."
        );
      }

      const filename =
        uploadResponse.data.file?.filename;

      if (!filename) {
        throw new Error(
          "Upload succeeded but no filename was returned."
        );
      }

      // --------------------------------------------------------
      // STEP 2: Extract PDF text
      // --------------------------------------------------------

      setStage("Extracting text from PDF...");

      const extractResponse = await api.post(
        "/generation/extract",
        {
          filename,
        }
      );

      if (!extractResponse.data.success) {
        throw new Error(
          extractResponse.data.message ||
            "PDF text extraction failed."
        );
      }

      const extractedText =
        extractResponse.data.document?.text;

      if (!extractedText?.trim()) {
        throw new Error(
          "No readable text was extracted from the PDF."
        );
      }

      // --------------------------------------------------------
      // STEP 3: Generate and save flashcards
      // --------------------------------------------------------

      setStage("Generating and validating flashcards...");

      const generateResponse = await api.post(
        "/generation/generate",
        {
          deckId: selectedDeck,
          text: extractedText,
        }
      );

      if (!generateResponse.data.success) {
        throw new Error(
          generateResponse.data.message ||
            "Flashcard generation failed."
        );
      }

      // --------------------------------------------------------
      // STEP 4: Show result
      // --------------------------------------------------------

      const resultCards =
        generateResponse.data.flashcards || [];

      const resultStatistics =
        generateResponse.data.statistics || null;

      setGeneratedCards(resultCards);
      setStatistics(resultStatistics);

      setMessage(
        generateResponse.data.message ||
          "Flashcards generated successfully."
      );

      setFile(null);

      const fileInput =
        document.getElementById("pdf-upload");

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      console.error("Generation error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to generate flashcards."
      );
    } finally {
      setProcessing(false);
      setStage("");
    }
  };

  const handleOpenDeck = () => {
    if (selectedDeck) {
      navigate(`/decks/${selectedDeck}`);
    }
  };

  return (
    <>
      <Navbar />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <div className="page-header">
            <div>
              <h1>Generate Flashcards</h1>

              <p>
                Upload your notes and turn them into
                study-ready flashcards.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={() => navigate("/decks")}
              disabled={processing}
            >
              My Decks
            </button>
          </div>

          <div className="generate-container">
            <form
              className="generate-card"
              onSubmit={handleGenerate}
            >
              {/* ==================================================
                  STEP 1 — SELECT DECK
              ================================================== */}

              <div className="generate-step">
                <div className="generate-step-number">
                  1
                </div>

                <div className="generate-step-content">
                  <h2>Choose a Deck</h2>

                  <p>
                    Generated flashcards will belong to
                    this deck.
                  </p>

                  {loadingDecks ? (
                    <div className="generate-loading">
                      Loading decks...
                    </div>
                  ) : decks.length === 0 ? (
                    <div className="generate-empty">
                      <p>
                        You don't have any decks yet.
                      </p>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          navigate("/decks")
                        }
                      >
                        Create a Deck
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedDeck}
                      onChange={(event) =>
                        setSelectedDeck(
                          event.target.value
                        )
                      }
                      className="generate-select"
                      disabled={processing}
                    >
                      <option value="">
                        Select a deck
                      </option>

                      {decks.map((deck) => (
                        <option
                          key={deck._id}
                          value={deck._id}
                        >
                          {deck.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="generate-divider" />

              {/* ==================================================
                  STEP 2 — SELECT PDF
              ================================================== */}

              <div className="generate-step">
                <div className="generate-step-number">
                  2
                </div>

                <div className="generate-step-content">
                  <h2>Upload PDF</h2>

                  <p>
                    Upload your study material as a PDF.
                    Maximum size is 10 MB.
                  </p>

                  <label
                    htmlFor="pdf-upload"
                    className="pdf-upload-area"
                  >
                    <div className="pdf-upload-icon">
                      📄
                    </div>

                    <strong>
                      {file
                        ? file.name
                        : "Choose a PDF file"}
                    </strong>

                    <span>
                      {file
                        ? `${(
                            file.size /
                            (1024 * 1024)
                          ).toFixed(2)} MB`
                        : "Click here to browse"}
                    </span>
                  </label>

                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="pdf-file-input"
                    disabled={processing}
                  />
                </div>
              </div>

              <div className="generate-divider" />

              {/* ==================================================
                  STEP 3 — PROCESS
              ================================================== */}

              <div className="generate-step">
                <div className="generate-step-number">
                  3
                </div>

                <div className="generate-step-content">
                  <h2>Generate Flashcards</h2>

                  <p>
                    The PDF will be extracted, processed
                    by the ML service, validated, and saved
                    to your selected deck.
                  </p>
                </div>
              </div>

              {/* ==================================================
                  STATUS
              ================================================== */}

              {processing && (
                <div className="generate-loading">
                  <strong>{stage}</strong>
                  <p>
                    Please wait. This may take some time
                    depending on the size of your PDF.
                  </p>
                </div>
              )}

              {error && (
                <div className="generate-error">
                  {error}
                </div>
              )}

              {message && (
                <div className="generate-success">
                  {message}
                </div>
              )}

              {/* ==================================================
                  STATISTICS
              ================================================== */}

              {statistics && (
                <div className="generate-info-card">
                  <h2>Generation Results</h2>

                  <div className="generate-flow">
                    <div className="generate-flow-item">
                      <span>
                        {statistics.candidates ?? 0}
                      </span>

                      <div>
                        <strong>Candidates</strong>
                        <p>
                          Potential answers considered.
                        </p>
                      </div>
                    </div>

                    <div className="generate-flow-item">
                      <span>
                        {statistics.questions ?? 0}
                      </span>

                      <div>
                        <strong>Questions</strong>
                        <p>
                          Questions generated by the ML
                          pipeline.
                        </p>
                      </div>
                    </div>

                    <div className="generate-flow-item">
                      <span>
                        {statistics.validated ?? 0}
                      </span>

                      <div>
                        <strong>Validated</strong>
                        <p>
                          Questions that passed QA
                          validation.
                        </p>
                      </div>
                    </div>

                    <div className="generate-flow-item">
                      <span>
                        {statistics.rejected ?? 0}
                      </span>

                      <div>
                        <strong>Rejected</strong>
                        <p>
                          Generated items that failed
                          validation.
                        </p>
                      </div>
                    </div>

                    <div className="generate-flow-item">
                      <span>
                        {statistics.saved ?? 0}
                      </span>

                      <div>
                        <strong>Saved</strong>
                        <p>
                          Flashcards stored in your deck.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  GENERATE BUTTON
              ================================================== */}

              <button
                type="submit"
                className="primary-button generate-button"
                disabled={
                  processing ||
                  loadingDecks ||
                  decks.length === 0 ||
                  !selectedDeck ||
                  !file
                }
              >
                {processing
                  ? stage || "Processing..."
                  : "Generate Flashcards"}
              </button>
            </form>

            {/* ====================================================
                GENERATED CARDS PREVIEW
            ==================================================== */}

            {generatedCards.length > 0 && (
              <div className="generate-info-card">
                <div className="page-header">
                  <div>
                    <h2>Generated Flashcards</h2>

                    <p>
                      {generatedCards.length} flashcard
                      {generatedCards.length !== 1
                        ? "s"
                        : ""}{" "}
                      saved to your deck.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleOpenDeck}
                  >
                    Open Deck
                  </button>
                </div>

                <div className="flashcards-list">
                  {generatedCards.map((card, index) => (
                    <div
                      className="flashcard-item"
                      key={card._id || index}
                    >
                      <div className="flashcard-number">
                        #{index + 1}
                      </div>

                      <div className="flashcard-content">
                        <div className="flashcard-section">
                          <span>QUESTION</span>
                          <p>{card.question}</p>
                        </div>

                        <div className="flashcard-section">
                          <span>ANSWER</span>
                          <p>{card.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ====================================================
                HOW IT WORKS
            ==================================================== */}

            {!generatedCards.length && !processing && (
              <div className="generate-info-card">
                <h2>How it works</h2>

                <div className="generate-flow">
                  <div className="generate-flow-item">
                    <span>1</span>

                    <div>
                      <strong>Upload Notes</strong>
                      <p>
                        Provide a PDF containing your
                        study material.
                      </p>
                    </div>
                  </div>

                  <div className="generate-flow-item">
                    <span>2</span>

                    <div>
                      <strong>Extract Content</strong>
                      <p>
                        Text is extracted from the PDF.
                        OCR is used when necessary.
                      </p>
                    </div>
                  </div>

                  <div className="generate-flow-item">
                    <span>3</span>

                    <div>
                      <strong>Generate & Validate</strong>
                      <p>
                        The ML pipeline creates questions
                        and validates their answers.
                      </p>
                    </div>
                  </div>

                  <div className="generate-flow-item">
                    <span>4</span>

                    <div>
                      <strong>Save to Deck</strong>
                      <p>
                        Validated flashcards are saved
                        automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default Generate;