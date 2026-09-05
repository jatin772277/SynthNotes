import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function DeckDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [flashcards, setFlashcards] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  const [formData, setFormData] = useState({
    question: "",
    answer: "",
  });

  const fetchDeckData = async () => {
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
    } catch (error) {
      console.error("Deck details error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load deck."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeckData();
  }, [id]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData({
      question: "",
      answer: "",
    });

    setEditingCard(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (editingCard) {
        await api.put(
          `/flashcards/${editingCard._id}`,
          formData
        );
      } else {
        await api.post(
          `/flashcards/decks/${id}`,
          formData
        );
      }

      resetForm();
      await fetchDeckData();
    } catch (error) {
      console.error("Save flashcard error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to save flashcard."
      );
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);

    setFormData({
      question: card.question,
      answer: card.answer,
    });

    setShowForm(true);
  };

  const handleDelete = async (card) => {
    const confirmed = window.confirm(
      "Delete this flashcard?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/flashcards/${card._id}`);

      await fetchDeckData();
    } catch (error) {
      console.error("Delete flashcard error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to delete flashcard."
      );
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <h1>Loading deck...</h1>
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
            <h1>Unable to load deck</h1>

            <p>{error}</p>

            <button
              className="primary-button"
              onClick={() => navigate("/decks")}
            >
              Back to My Decks
            </button>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Back */}
          <button
            className="back-button"
            onClick={() => navigate("/decks")}
          >
            ← My Decks
          </button>

          {/* Header */}
          <div className="deck-details-header">
            <div>
              <span className="deck-topic">
                {deck?.topic || "General"}
              </span>

              <h1>{deck?.title}</h1>

              <p>
                {deck?.description ||
                  "No description added."}
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                setEditingCard(null);

                setFormData({
                  question: "",
                  answer: "",
                });

                setShowForm(true);
              }}
            >
              + Add Flashcard
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Flashcard Form */}
          {showForm && (
            <div className="deck-form-card">
              <div className="form-header">
                <h2>
                  {editingCard
                    ? "Edit Flashcard"
                    : "Add Flashcard"}
                </h2>

                <button
                  className="close-button"
                  onClick={resetForm}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="question">
                    Question
                  </label>

                  <textarea
                    id="question"
                    name="question"
                    placeholder="Enter the question..."
                    value={formData.question}
                    onChange={handleChange}
                    rows="4"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="answer">
                    Answer
                  </label>

                  <textarea
                    id="answer"
                    name="answer"
                    placeholder="Enter the answer..."
                    value={formData.answer}
                    onChange={handleChange}
                    rows="5"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                  >
                    {editingCard
                      ? "Save Changes"
                      : "Add Flashcard"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Flashcards */}
          <div className="flashcards-header">
            <div>
              <h2>Flashcards</h2>

              <p>
                {flashcards.length} flashcard
                {flashcards.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            {flashcards.length > 0 && (
              <button
                className="primary-button"
                onClick={() =>
                  navigate(`/study/${id}`)
                }
              >
                🧠 Study Deck
              </button>
            )}
          </div>

          {flashcards.length === 0 ? (
            <div className="empty-state">
              <h2>No flashcards yet</h2>

              <p>
                Add your first flashcard to this deck.
              </p>

              <button
                className="primary-button"
                onClick={() => setShowForm(true)}
              >
                + Add Flashcard
              </button>
            </div>
          ) : (
            <div className="flashcards-list">
              {flashcards.map((card, index) => (
                <div
                  className="flashcard-item"
                  key={card._id}
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

                  <div className="flashcard-actions">
                    <button
                      className="secondary-button"
                      onClick={() =>
                        handleEdit(card)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="danger-button"
                      onClick={() =>
                        handleDelete(card)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default DeckDetails;