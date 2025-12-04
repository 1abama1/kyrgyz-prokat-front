import { NavLink, useNavigate } from "react-router-dom";
import { authAPI } from "../api/auth";
import "../styles/sidebar.css";

export const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <div className="menu">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
          Главная
        </NavLink>
        <NavLink to="/clients" className={({ isActive }) => isActive ? "active" : ""}>
          Клиенты
        </NavLink>
        <NavLink to="/tools" className={({ isActive }) => isActive ? "active" : ""}>
          Инструменты
        </NavLink>

        <button
          className="create-rental-btn"
          onClick={() => navigate("/rentals/create")}
        >
          ➕ Новая аренда
        </button>
      </div>

      <div className="logout">
        <button onClick={handleLogout}>
          Выйти
        </button>
      </div>
    </div>
  );
};


