import { FC, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api/auth";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authAPI.logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f3f4f6" }}>
      <nav style={{
        width: "200px",
        background: "#ffffff",
        padding: "32px 24px",
        borderRight: "1px solid #e2e8f0",
        boxShadow: "4px 0 18px rgba(15,23,42,0.05)"
      }}>
        <h2 style={{ marginTop: 0, color: "#111827" }}>Меню</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li style={{ marginBottom: "12px" }}>
            <Link to="/dashboard" style={{ textDecoration: "none", color: "#1d6ef2", fontWeight: 600 }}>
              Главная
            </Link>
          </li>
          <li style={{ marginBottom: "12px" }}>
            <Link to="/clients" style={{ textDecoration: "none", color: "#1d6ef2", fontWeight: 600 }}>
              Клиенты
            </Link>
          </li>
            <li style={{ marginBottom: "12px" }}>
            <Link to="/tools" style={{ textDecoration: "none", color: "#1d6ef2", fontWeight: 600 }}>
              Инструменты
            </Link>
          </li>
          {/* <li style={{ marginBottom: "12px" }}>
            <Link to="/documents" style={{ textDecoration: "none", color: "#1d6ef2", fontWeight: 600 }}>
              Договоры
            </Link>
          </li> */}
          {/*<li style={{ marginBottom: "10px" }}>*/}
          {/*  <Link to="/documents/create" style={{ textDecoration: "none", color: "#1976d2" }}>*/}
          {/*    Создать договор*/}
          {/*  </Link>*/}
          {/*</li>*/}
        </ul>
        <button
          onClick={handleLogout}
          className="danger-button"
          style={{
            marginTop: "auto",
            width: "100%"
          }}
        >
          Выйти
        </button>
      </nav>
      <main style={{ flex: 1, padding: "40px" }}>
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
};

