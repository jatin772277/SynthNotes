import "./App.css";

import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./pages/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Decks from "./pages/Decks";
import DeckDetails from "./pages/DeckDetails";
import StudyHome from "./pages/StudyHome";
import Study from "./pages/Study";
import Analytics from "./pages/Analytics";
import Generate from "./pages/Generate";

function App() {
  return (
    <Routes>
      {/* Default route */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Public routes */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/decks"
          element={<Decks />}
        />

        <Route
          path="/decks/:id"
          element={<DeckDetails />}
        />

        {/* Study deck selection */}
        <Route
          path="/study"
          element={<StudyHome />}
        />

        {/* Actual study session */}
        <Route
          path="/study/:id"
          element={<Study />}
        />

        <Route
          path="/analytics"
          element={<Analytics />}
        />

        <Route
          path="/generate"
          element={<Generate />}
        />
      </Route>

      {/* Catch-all for unknown routes */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default App;