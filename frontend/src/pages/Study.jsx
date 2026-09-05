import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Study() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [flashcards, setFlashcards] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudyData = async () => {
      try {
        setLoading(true);
        setError("");

        const [deckResponse, cardsResponse] =
          await Promise.all([
            api.get(`/decks/${id}`),
            api.get(`/flashcards/decks/${id}`),
          ]);

        if (deckResponse.data.success) {
          setDeck(deckResponse.data.deck);
        }

        if (cardsResponse.data.success) {
          setFlashcards(cardsResponse.data.flashcards);
        }
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.message ||
            "Unable to load study session."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudyData();
  }, [id]);

  const currentCard = flashcards[currentIndex];

  const handleRevealAnswer = () => {
    setShowAnswer(true);
  };

  const handleRating = async (rating) => {
    if (!currentCard || saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post("/reviews", {
        flashcardId: currentCard._id,
        recallRating: rating,
      });

      if (currentIndex === flashcards.length - 1) {
        setCompleted(true);
        return;
      }

      setCurrentIndex((previous) => previous + 1);
      setShowAnswer(false);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Unable to save your review."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStudyAgain = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setCompleted(false);
    setError("");
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="study-page">
              <div className="dashboard-card">
                <p>Loading study session...</p>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (error && !deck) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="study-page">
              <div className="dashboard-card study-error">
                <h2>Unable to start study session</h2>

                <p>{error}</p>

                <button
                  className="secondary-button"
                  onClick={() => navigate(`/decks/${id}`)}
                >
                  Back to Deck
                </button>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (flashcards.length === 0) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="study-page">
              <div className="dashboard-card study-empty">
                <div className="study-empty-icon">
                  📚
                </div>

                <h1>No Flashcards Yet</h1>

                <p>
                  Add some flashcards to this deck before
                  starting a study session.
                </p>

                <button
                  className="primary-button"
                  onClick={() =>
                    navigate(`/decks/${id}`)
                  }
                >
                  Add Flashcards
                </button>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (completed) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="study-page">
              <div className="study-complete-card">
                <div className="completion-icon">
                  🎉
                </div>

                <h1>Study Session Complete!</h1>

                <p>
                  You reviewed{" "}
                  <strong>{flashcards.length}</strong>{" "}
                  {flashcards.length === 1
                    ? "flashcard"
                    : "flashcards"}{" "}
                  from{" "}
                  <strong>
                    {deck?.title || "this deck"}
                  </strong>
                  .
                </p>

                <div className="completion-actions">
                  <button
                    className="primary-button"
                    onClick={handleStudyAgain}
                  >
                    Study Again
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      navigate(`/decks/${id}`)
                    }
                  >
                    Back to Deck
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      navigate("/dashboard")
                    }
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  const progress =
    ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <>
      <Navbar />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          <div className="study-page">
            {/* Header */}
            <div className="study-header">
              <div>
                <button
                  className="back-link"
                  onClick={() =>
                    navigate(`/decks/${id}`)
                  }
                >
                  ← Back to Deck
                </button>

                <h1>
                  {deck?.title || "Study Session"}
                </h1>

                {deck?.topic && (
                  <span className="study-topic">
                    {deck.topic}
                  </span>
                )}
              </div>

              <div className="study-progress-text">
                Card {currentIndex + 1} of{" "}
                {flashcards.length}
              </div>
            </div>

            {/* Progress */}
            <div className="study-progress-container">
              <div
                className="study-progress-bar"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="study-inline-error">
                {error}
              </div>
            )}

            {/* Card */}
            <div className="study-card">
              <div className="study-card-label">
                QUESTION
              </div>

              <div className="study-question">
                {currentCard.question}
              </div>

              {!showAnswer ? (
                <div className="study-reveal-section">
                  <p>
                    Try to recall the answer before
                    revealing it.
                  </p>

                  <button
                    className="primary-button reveal-button"
                    onClick={handleRevealAnswer}
                  >
                    Show Answer
                  </button>
                </div>
              ) : (
                <>
                  <div className="study-divider" />

                  <div className="study-card-label">
                    ANSWER
                  </div>

                  <div className="study-answer">
                    {currentCard.answer}
                  </div>

                  <div className="study-rating-section">
                    <h3>
                      How well did you remember this?
                    </h3>

                    <p>
                      Choose a rating from 1 to 4.
                    </p>

                    <div className="recall-buttons">
                      <button
                        className="recall-button recall-1"
                        disabled={saving}
                        onClick={() =>
                          handleRating(1)
                        }
                      >
                        <strong>1</strong>
                        <span>Forgot</span>
                      </button>

                      <button
                        className="recall-button recall-2"
                        disabled={saving}
                        onClick={() =>
                          handleRating(2)
                        }
                      >
                        <strong>2</strong>
                        <span>Hard</span>
                      </button>

                      <button
                        className="recall-button recall-3"
                        disabled={saving}
                        onClick={() =>
                          handleRating(3)
                        }
                      >
                        <strong>3</strong>
                        <span>Good</span>
                      </button>

                      <button
                        className="recall-button recall-4"
                        disabled={saving}
                        onClick={() =>
                          handleRating(4)
                        }
                      >
                        <strong>4</strong>
                        <span>Easy</span>
                      </button>
                    </div>

                    {saving && (
                      <p className="saving-text">
                        Saving your review...
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default Study;