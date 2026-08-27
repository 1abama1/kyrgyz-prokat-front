import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { authAPI } from "../api/auth";
import { IndexedDBManager } from "./IndexedDBManager";
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
  clients: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100 8 4 4 0 000-8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  tools: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
  contracts: "M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  plus: "M12 5v14 M5 12h14",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
};

export const Sidebar = () => {
  const navigate = useNavigate();

  const [dbManagerOpen, setDbManagerOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState<{
    isOpen: boolean;
    type: "success" | "info" | "warning" | "error";
    title: string;
    message?: string;
    stats?: { label: string; value: number; icon: string }[];
  }>({
    isOpen: false,
    type: "success",
    title: "",
  });

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

        <NavLink to="/bookings" className={({ isActive }) => isActive ? "active" : ""}>
          <Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          Брони
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
        {/* <button
          onClick={() => setDbManagerOpen(true)}
          style={{
            width: "100%",
            background: "#334155",
            color: "#e2e8f0",
            border: "none",
            padding: "10px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginBottom: "8px",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#475569")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#334155")}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Настройки БД
        </button> */}
        <button onClick={handleLogout}>
          <Icon d={icons.logout} size={15} />
          Выйти из системы
        </button>
      </div>

      {/* Кастомное модальное окно уведомлений */}
      {modalInfo.isOpen && (
        <div className="custom-modal-overlay" onClick={() => setModalInfo(prev => ({ ...prev, isOpen: false }))}>
          <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`custom-modal-header ${modalInfo.type}`}>
              <div className="custom-modal-icon">
                {modalInfo.type === "success" && "✓"}
                {modalInfo.type === "warning" && "⚠️"}
                {modalInfo.type === "error" && "✕"}
                {modalInfo.type === "info" && "ℹ️"}
              </div>
              <h3>{modalInfo.title}</h3>
            </div>

            {modalInfo.message && (
              <p className="custom-modal-message">{modalInfo.message}</p>
            )}

            {modalInfo.stats && (
              <div className="custom-modal-stats-grid">
                {modalInfo.stats.map((item, idx) => (
                  <div key={idx} className="custom-modal-stat-item">
                    <span className="stat-icon">{item.icon}</span>
                    <span className="stat-label">{item.label}</span>
                    <span className="stat-value">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="custom-modal-footer">
              <button
                className="custom-modal-btn"
                onClick={() => setModalInfo(prev => ({ ...prev, isOpen: false }))}
                type="button"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      <IndexedDBManager isOpen={dbManagerOpen} onClose={() => setDbManagerOpen(false)} />
    </div>
  );
};
