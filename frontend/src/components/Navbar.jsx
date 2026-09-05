import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div
        className="navbar-logo"
        onClick={() => navigate("/dashboard")}
      >
        SynthNotes
      </div>

      <div className="navbar-right">
        <span className="navbar-user">
          {user?.name}
        </span>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;