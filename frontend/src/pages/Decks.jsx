import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Decks() {
  const navigate = useNavigate();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    topic: "",
  });

  const fetchDecks = async () => {
    try {
      setError("");

      const response = await api.get("/decks");

      if (response.data.success) {
        const decksWithCounts = await Promise.all(
          response.data.decks.map(async (deck) => {
            try {
              const cardsResponse = await api.get(
                `/flashcards/decks/${deck._id}`
              );

              return {
                ...deck,
                cardCount:
                  cardsResponse.data.flashcards?.length || 0,
              };
            } catch {
              return {
                ...deck,
                cardCount: 0,
              };
            }
          })
        );

        setDecks(decksWithCounts);
      }
    } catch (error) {
      console.error("Fetch decks error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load decks."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      topic: "",
    });

    setEditingDeck(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      if (editingDeck) {
        await api.put(
          `/decks/${editingDeck._id}`,
          formData
        );
      } else {
        await api.post("/decks", formData);
      }

      resetForm();
      await fetchDecks();
    } catch (error) {
      console.error("Save deck error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to save deck."
      );
    }
  };

  const handleEdit = (deck) => {
    setEditingDeck(deck);

    setFormData({
      title: deck.title,
      description: deck.description || "",
      topic: deck.topic || "General",
    });

    setShowForm(true);
  };

  const handleDelete = async (deck) => {
    const confirmed = window.confirm(
      `Delete "${deck.title}"?\n\nThis will also delete all flashcards and reviews inside this deck.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/decks/${deck._id}`);

      await fetchDecks();
    } catch (error) {
      console.error("Delete deck error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to delete deck."
      );
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
              <h1>My Decks</h1>

              <p>
                Organize your flashcards by topic and
                subject.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => {
                setEditingDeck(null);

                setFormData({
                  title: "",
                  description: "",
                  topic: "",
                });

                setShowForm(true);
              }}
            >
              + Create Deck
            </button>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {showForm && (
            <div className="deck-form-card">
              <div className="form-header">
                <h2>
                  {editingDeck
                    ? "Edit Deck"
                    : "Create New Deck"}
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
                  <label htmlFor="title">
                    Deck Title
                  </label>

                  <input
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g. Operating Systems"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="topic">
                    Topic
                  </label>

                  <input
                    id="topic"
                    name="topic"
                    type="text"
                    placeholder="e.g. Computer Science"
                    value={formData.topic}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">
                    Description
                  </label>

                  <textarea
                    id="description"
                    name="description"
                    placeholder="What will you study in this deck?"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
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
                    {editingDeck
                      ? "Save Changes"
                      : "Create Deck"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="empty-state">
              Loading decks...
            </div>
          ) : decks.length === 0 ? (
            <div className="empty-state">
              <h2>No decks yet</h2>

              <p>
                Create your first deck to start
                studying.
              </p>

              <button
                className="primary-button"
                onClick={() => setShowForm(true)}
              >
                Create Your First Deck
              </button>
            </div>
          ) : (
            <div className="decks-grid">
              {decks.map((deck) => (
                <div
                  className="deck-card"
                  key={deck._id}
                >
                  <div className="deck-card-top">
                    <div>
                      <span className="deck-topic">
                        {deck.topic || "General"}
                      </span>

                      <h2>{deck.title}</h2>
                    </div>
                  </div>

                  <p className="deck-description">
                    {deck.description ||
                      "No description added."}
                  </p>

                  <div className="deck-meta">
                    <span>
                      🧠 {deck.cardCount} card
                      {deck.cardCount !== 1
                        ? "s"
                        : ""}
                    </span>

                    <span>
                      Created{" "}
                      {new Date(
                        deck.createdAt
                      ).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="deck-actions">
                    <button
                      className="primary-button"
                      onClick={() =>
                        navigate(
                          `/decks/${deck._id}`
                        )
                      }
                    >
                      Open Deck
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() =>
                        handleEdit(deck)
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="danger-button"
                      onClick={() =>
                        handleDelete(deck)
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

export default Decks;