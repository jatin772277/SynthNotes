import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Analytics() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/analytics/dashboard");

        if (response.data.success) {
          setAnalytics(response.data.analytics);
        } else {
          setError("Unable to load analytics.");
        }
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.message ||
            "Unable to load analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const ratingData = useMemo(() => {
    if (!analytics) {
      return [];
    }

    const ratings = analytics.ratings || {};

    const values = [
      {
        rating: 1,
        label: "Very Weak",
        count: ratings[1] || 0,
      },
      {
        rating: 2,
        label: "Needs Practice",
        count: ratings[2] || 0,
      },
      {
        rating: 3,
        label: "Good",
        count: ratings[3] || 0,
      },
      {
        rating: 4,
        label: "Excellent",
        count: ratings[4] || 0,
      },
    ];

    const max = Math.max(
      ...values.map((item) => item.count),
      1
    );

    return values.map((item) => ({
      ...item,
      percentage: (item.count / max) * 100,
    }));
  }, [analytics]);

  const topicData = useMemo(() => {
    if (!analytics?.topics) {
      return [];
    }

    return [...analytics.topics].sort(
      (a, b) => b.reviews - a.reviews
    );
  }, [analytics]);

  const activityData = useMemo(() => {
    if (!analytics?.heatmap) {
      return [];
    }

    return [...analytics.heatmap]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [analytics]);

  const getRatingText = (rating) => {
    if (rating >= 3.5) {
      return "Excellent";
    }

    if (rating >= 2.5) {
      return "Good";
    }

    if (rating >= 1.5) {
      return "Needs Practice";
    }

    return "Needs Improvement";
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return "—";
    }

    return new Date(dateString).toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="page-header">
              <div>
                <h1>Analytics</h1>
                <p>
                  Understand your learning performance
                  and study habits.
                </p>
              </div>
            </div>

            <div className="dashboard-card">
              <p>Loading analytics...</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="page-header">
              <div>
                <h1>Analytics</h1>
                <p>
                  Understand your learning performance
                  and study habits.
                </p>
              </div>
            </div>

            <div className="dashboard-card">
              <h3>Something went wrong</h3>
              <p>{error}</p>

              <button
                className="primary-button"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <div className="page-header">
              <div>
                <h1>Analytics</h1>
                <p>
                  Understand your learning performance
                  and study habits.
                </p>
              </div>
            </div>

            <div className="dashboard-card">
              <h3>No analytics available</h3>
              <p>
                Start studying to generate learning
                statistics.
              </p>

              <button
                className="primary-button"
                onClick={() => navigate("/decks")}
              >
                Go to My Decks
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  const summary = analytics.summary || {};
  const streak = analytics.streak || {};

  return (
    <>
      <Navbar />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* Header */}
          <div className="page-header">
            <div>
              <h1>Analytics</h1>
              <p>
                Understand your learning performance
                and study habits.
              </p>
            </div>

            <button
              className="secondary-button"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>
          </div>

          {/* Summary */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">
                Total Reviews
              </span>

              <strong className="stat-value">
                {summary.totalReviews || 0}
              </strong>

              <span className="stat-description">
                Reviews completed
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">
                Cards Reviewed
              </span>

              <strong className="stat-value">
                {summary.totalReviewedFlashcards || 0}
              </strong>

              <span className="stat-description">
                Unique cards studied
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">
                Average Recall
              </span>

              <strong className="stat-value">
                {summary.averageRecall
                  ? `${Number(
                      summary.averageRecall
                    ).toFixed(1)}/4`
                  : "0/4"}
              </strong>

              <span className="stat-description">
                {getRatingText(
                  Number(summary.averageRecall || 0)
                )}
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">
                Active Days
              </span>

              <strong className="stat-value">
                {summary.activeDays || 0}
              </strong>

              <span className="stat-description">
                Days you studied
              </span>
            </div>
          </div>

          {/* Main Analytics */}
          <div className="dashboard-grid">
            {/* Recall Distribution */}
            <section className="dashboard-card">
              <div className="card-header">
                <div>
                  <h2>Recall Distribution</h2>
                  <p>
                    How well you remembered your
                    flashcards.
                  </p>
                </div>
              </div>

              <div className="rating-list">
                {ratingData.map((item) => (
                  <div
                    className="rating-row"
                    key={item.rating}
                  >
                    <div className="rating-info">
                      <span className="rating-number">
                        {item.rating}
                      </span>

                      <span>
                        {item.label}
                      </span>
                    </div>

                    <div className="rating-bar-container">
                      <div
                        className={`rating-bar rating-${item.rating}`}
                        style={{
                          width: `${item.percentage}%`,
                        }}
                      />
                    </div>

                    <strong className="rating-count">
                      {item.count}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            {/* Streak */}
            <section className="dashboard-card">
              <div className="card-header">
                <div>
                  <h2>Streak Analysis</h2>
                  <p>
                    Keep your learning habit
                    consistent.
                  </p>
                </div>
              </div>

              <div className="streak-analytics">
                <div className="streak-box">
                  <span className="streak-icon">
                    🔥
                  </span>

                  <span className="streak-label">
                    Current Streak
                  </span>

                  <strong>
                    {streak.current || 0}
                  </strong>

                  <small>days</small>
                </div>

                <div className="streak-box">
                  <span className="streak-icon">
                    🏆
                  </span>

                  <span className="streak-label">
                    Longest Streak
                  </span>

                  <strong>
                    {streak.longest || 0}
                  </strong>

                  <small>days</small>
                </div>
              </div>
            </section>
          </div>

          {/* Activity */}
          <section className="dashboard-card analytics-activity-card">
            <div className="card-header">
              <div>
                <h2>Recent Study Activity</h2>
                <p>
                  Your review activity over the most
                  recent days with recorded activity.
                </p>
              </div>
            </div>

            {activityData.length === 0 ? (
              <div className="empty-state">
                <p>
                  No study activity recorded yet.
                </p>
              </div>
            ) : (
              <div className="activity-list">
                {activityData.map((day) => (
                  <div
                    className="activity-row"
                    key={day.date}
                  >
                    <span>
                      {formatDate(day.date)}
                    </span>

                    <div className="activity-bar-container">
                      <div
                        className="activity-bar"
                        style={{
                          width: `${
                            Math.min(
                              day.reviews * 20,
                              100
                            )
                          }%`,
                        }}
                      />
                    </div>

                    <strong>
                      {day.reviews}{" "}
                      {day.reviews === 1
                        ? "review"
                        : "reviews"}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Topics */}
          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h2>Topic Performance</h2>
                <p>
                  See which topics you have been
                  studying most.
                </p>
              </div>
            </div>

            {topicData.length === 0 ? (
              <div className="empty-state">
                <p>
                  No topic activity available yet.
                </p>

                <button
                  className="primary-button"
                  onClick={() => navigate("/decks")}
                >
                  Start Studying
                </button>
              </div>
            ) : (
              <div className="topic-table">
                <div className="topic-table-header">
                  <span>Topic</span>
                  <span>Reviews</span>
                  <span>Last Studied</span>
                </div>

                {topicData.map((topic) => (
                  <div
                    className="topic-table-row"
                    key={topic.topic}
                  >
                    <span className="topic-name">
                      {topic.topic}
                    </span>

                    <span>
                      {topic.reviews}
                    </span>

                    <span>
                      {formatDate(
                        topic.lastStudied
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Topics */}
          <section className="dashboard-card">
            <div className="card-header">
              <div>
                <h2>Recently Studied</h2>
                <p>
                  Your most recently active topics.
                </p>
              </div>
            </div>

            {analytics.recentTopics?.length === 0 ? (
              <div className="empty-state">
                <p>
                  You haven't studied any topics yet.
                </p>
              </div>
            ) : (
              <div className="recent-topics-list">
                {analytics.recentTopics?.map(
                  (topic, index) => (
                    <div
                      className="recent-topic-item"
                      key={topic.topic}
                    >
                      <span className="recent-topic-rank">
                        {index + 1}
                      </span>

                      <div className="recent-topic-content">
                        <strong>
                          {topic.topic}
                        </strong>

                        <span>
                          {topic.reviews}{" "}
                          {topic.reviews === 1
                            ? "review"
                            : "reviews"}
                        </span>
                      </div>

                      <span className="recent-topic-date">
                        {formatDate(
                          topic.lastStudied
                        )}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* CTA */}
          <section className="dashboard-card analytics-cta">
            <div>
              <h2>Ready for another study session?</h2>

              <p>
                Keep building your streak and
                improving your recall.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => navigate("/decks")}
            >
              Study Now
            </button>
          </section>
        </main>
      </div>
    </>
  );
}

export default Analytics;