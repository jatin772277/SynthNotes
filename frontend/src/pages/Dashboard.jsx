import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

function Dashboard() {
  const { user } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get(
          "/analytics/dashboard"
        );

        if (response.data.success) {
          setAnalytics(response.data.analytics);
        }
      } catch (error) {
        console.error("Analytics error:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load analytics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  /*
   * Build a complete 365-day heatmap.
   *
   * Backend only sends dates where reviews exist.
   * Here we fill the missing dates with 0 reviews.
   */
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const buildHeatmap = () => {
    if (!analytics) {
      return [];
    }

    const activityMap = new Map();

    analytics.heatmap.forEach((day) => {
      activityMap.set(
        day.date,
        day.reviews
      );
    });

    const days = [];

    // 364 days = 52 weeks × 7 days
    for (let i = 0; i < 364; i++) {
      const date = new Date();

      date.setHours(0, 0, 0, 0);
      date.setDate(
        date.getDate() - i
      );

      const dateString =
        formatLocalDate(date);

      days.push({
        date: dateString,
        reviews:
          activityMap.get(
            dateString
          ) || 0,
      });
    }

    return days;
  };

  const getHeatmapLevel = (reviews) => {
    if (reviews === 0) return 0;
    if (reviews === 1) return 1;
    if (reviews <= 3) return 2;
    if (reviews <= 6) return 3;

    return 4;
  };

  if (loading) {
    return (
      <>
        <Navbar />

        <div className="app-layout">
          <Sidebar />

          <main className="main-content">
            <h1>Loading dashboard...</h1>
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
            <h1>Dashboard</h1>

            <p>{error}</p>
          </main>
        </div>
      </>
    );
  }

  if (!analytics) {
    return null;
  }

  const ratings = analytics.ratings;

  const totalRatingReviews =
    ratings["1"] +
    ratings["2"] +
    ratings["3"] +
    ratings["4"];

  const getRatingPercentage = (rating) => {
    if (totalRatingReviews === 0) {
      return 0;
    }

    return (
      (ratings[rating] /
        totalRatingReviews) *
      100
    );
  };

  const heatmap = buildHeatmap();

  return (
    <>
      <Navbar />

      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* =========================
              HEADER
          ========================= */}

          <section className="dashboard-header">
            <h1>
              Welcome back,{" "}
              {user?.name || "Learner"} 👋
            </h1>

            <p>
              Here's how your learning is going.
            </p>
          </section>

          {/* =========================
              PRIMARY STATISTICS
          ========================= */}

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-title">
                📚 Reviews
              </div>

              <div className="stat-value">
                {analytics.summary.totalReviews}
              </div>

              <div className="stat-subtitle">
                Total review sessions
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-title">
                🧠 Cards Reviewed
              </div>

              <div className="stat-value">
                {
                  analytics.summary
                    .totalReviewedFlashcards
                }
              </div>

              <div className="stat-subtitle">
                Unique flashcards
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-title">
                ⭐ Average Recall
              </div>

              <div className="stat-value">
                {analytics.summary.averageRecall}/4
              </div>

              <div className="stat-subtitle">
                Recall performance
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-title">
                🔥 Current Streak
              </div>

              <div className="stat-value">
                {analytics.streak.current}
              </div>

              <div className="stat-subtitle">
                {analytics.streak.current === 1
                  ? "day"
                  : "days"}
              </div>
            </div>
          </section>

          {/* =========================
              SECONDARY STATISTICS
          ========================= */}

          <section className="secondary-stats-grid">
            <div className="stat-card">
              <div className="stat-title">
                🏆 Longest Streak
              </div>

              <div className="stat-value">
                {analytics.streak.longest}
              </div>

              <div className="stat-subtitle">
                {analytics.streak.longest === 1
                  ? "day"
                  : "days"}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-title">
                📅 Active Days
              </div>

              <div className="stat-value">
                {analytics.summary.activeDays}
              </div>

              <div className="stat-subtitle">
                Days you studied
              </div>
            </div>
          </section>

          {/* =========================
              DASHBOARD CONTENT
          ========================= */}

          <section className="dashboard-grid">
            {/* =========================
                HEATMAP
            ========================= */}

            <div className="dashboard-card full-width">
              <div className="heatmap-header">
                <div>
                  <h2>Study Consistency</h2>

                  <p className="card-description">
                    Your study activity over the last
                    year.
                  </p>
                </div>

                <div className="heatmap-legend">
                  <span>Less</span>

                  <div className="heatmap-day" />

                  <div className="heatmap-day level-1" />

                  <div className="heatmap-day level-2" />

                  <div className="heatmap-day level-3" />

                  <div className="heatmap-day level-4" />

                  <span>More</span>
                </div>
              </div>

              <div className="heatmap-wrapper">
                <div className="heatmap-grid">
                  {heatmap.map((day) => (
                    <div
                      key={day.date}
                      className={`heatmap-day level-${getHeatmapLevel(
                        day.reviews
                      )}`}
                      title={`${day.date}: ${
                        day.reviews
                      } review${
                        day.reviews !== 1
                          ? "s"
                          : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* =========================
                RECALL PERFORMANCE
            ========================= */}

            <div className="dashboard-card">
              <h2>Recall Performance</h2>

              <p className="card-description">
                How well you remembered your flashcards.
              </p>

              {[1, 2, 3, 4].map((rating) => (
                <div
                  className="rating-row"
                  key={rating}
                >
                  <div className="rating-label">
                    Rating {rating}
                  </div>

                  <div className="rating-bar-container">
                    <div
                      className="rating-bar"
                      style={{
                        width: `${getRatingPercentage(
                          rating
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="rating-count">
                    {ratings[rating]}
                  </div>
                </div>
              ))}
            </div>

            {/* =========================
                MOST STUDIED TOPICS
            ========================= */}

            <div className="dashboard-card">
              <h2>Most Studied Topics</h2>

              <p className="card-description">
                Topics you've spent the most time
                reviewing.
              </p>

              {analytics.topics.length === 0 ? (
                <p>No topics studied yet.</p>
              ) : (
                <div className="topic-list">
                  {analytics.topics
                    .slice(0, 5)
                    .map((topic) => (
                      <div
                        className="topic-item"
                        key={topic.topic}
                      >
                        <span className="topic-name">
                          {topic.topic}
                        </span>

                        <span className="topic-count">
                          {topic.reviews} review
                          {topic.reviews !== 1
                            ? "s"
                            : ""}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* =========================
                RECENTLY STUDIED
            ========================= */}

            <div className="dashboard-card">
              <h2>Recently Studied</h2>

              <p className="card-description">
                Topics you've studied most recently.
              </p>

              {analytics.recentTopics.length === 0 ? (
                <p>No recent topics.</p>
              ) : (
                <div className="topic-list">
                  {analytics.recentTopics.map(
                    (topic) => (
                      <div
                        className="topic-item"
                        key={topic.topic}
                      >
                        <span className="topic-name">
                          {topic.topic}
                        </span>

                        <span className="topic-count">
                          {new Date(
                            topic.lastStudied
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

export default Dashboard;