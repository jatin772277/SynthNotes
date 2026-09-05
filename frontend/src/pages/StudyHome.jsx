import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function StudyHome() {
  const navigate = useNavigate();

  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/decks");

        if (response.data.success) {
          setDecks(response.data.decks || []);
        }
      } catch (err) {
        console.error("Study decks error:", err);

        setError(
          err.response?.data?.message ||
            "Unable to load your decks."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDecks();
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="study-page">
              <div className="dashboard-card">
                <p>Loading your study decks...</p>
              </div>
            </div>
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
          <div className="study-page">
            <div className="page-header">
              <div>
                <h1>Study</h1>
                <p>
                  Choose a deck and start reviewing
                  your flashcards.
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() => navigate("/decks")}
              >
                My Decks
              </button>
            </div>

            {error && (
              <div className="study-inline-error">
                {error}
              </div>
            )}

            {decks.length === 0 ? (
              <div className="dashboard-card study-empty">
                <div className="study-empty-icon">
                  📚
                </div>

                <h1>No Decks Yet</h1>

                <p>
                  Create a deck and add some flashcards
                  before starting a study session.
                </p>

                <button
                  className="primary-button"
                  onClick={() => navigate("/decks")}
                >
                  Go to My Decks
                </button>
              </div>
            ) : (
              <div className="decks-grid">
                {decks.map((deck) => (
                  <div
                    className="dashboard-card"
                    key={deck._id}
                  >
                    <span className="deck-topic">
                      {deck.topic || "General"}
                    </span>

                    <h2>{deck.title}</h2>

                    <p>
                      {deck.description ||
                        "No description added."}
                    </p>

                    <p className="card-description">
                      📚 {deck.flashcardCount || 0} flashcard
                      {deck.flashcardCount !== 1 ? "s" : ""}
                    </p>

                    <button
                      className="primary-button"
                      onClick={() =>
                        navigate(`/study/${deck._id}`)
                      }
                    >
                      Start Study
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default StudyHome;