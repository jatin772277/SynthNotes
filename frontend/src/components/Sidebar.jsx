import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <p className="sidebar-label">WORKSPACE</p>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          📊 Dashboard
        </NavLink>

        <NavLink
          to="/decks"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          📚 My Decks
        </NavLink>

        <NavLink
          to="/generate"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          ✨ Generate
        </NavLink>

        <NavLink
          to="/study"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          🧠 Study
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) =>
            `sidebar-link ${isActive ? "active" : ""}`
          }
        >
          📈 Analytics
        </NavLink>
      </div>

      <div className="sidebar-bottom">
        <p>Keep learning.</p>
        <span>Build knowledge that lasts.</span>
      </div>
    </aside>
  );
}

export default Sidebar;