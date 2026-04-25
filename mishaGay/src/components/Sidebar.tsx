import { NavLink, useNavigate } from "react-router-dom";
import { authAPI } from "../api/auth";
import "../styles/layout.css";
 
/* Простые SVG-иконки */
const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
 
const icons = {
  dashboard: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  clients:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  tools:     "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  contracts: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  plus:      "M12 5v14 M5 12h14",
  logout:    "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
};
 
export const Sidebar = () => {
  const navigate = useNavigate();
 
  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };
 
  return (
    <div className="sidebar">
      <nav className="menu">
        <span className="menu-group-title">Навигация</span>
 
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.dashboard} />
          Главная
        </NavLink>
 
        <NavLink to="/clients" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.clients} />
          Клиенты
        </NavLink>
 
        <NavLink to="/tools" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.tools} />
          Инструменты
        </NavLink>
 
        <div className="menu-divider" />
        <span className="menu-group-title">Договоры</span>
 
        <NavLink to="/contracts/active" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d={icons.contracts} />
          Активные аренды
        </NavLink>
 
        <NavLink to="/contracts/history" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          История договоров
        </NavLink>
 
        <div className="menu-divider" />
 
        <button
          className="create-rental-btn"
          onClick={() => navigate("/rentals/create")}
        >
          <Icon d={icons.plus} size={15} />
          Новая аренда
        </button>
      </nav>
 
      <div className="logout">
        <button onClick={handleLogout}>
          <Icon d={icons.logout} size={15} />
          Выйти из системы
        </button>
      </div>
    </div>
  );
};
