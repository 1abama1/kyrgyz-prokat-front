import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { documentsAPI } from "../api/documents";
import { toolsAPI } from "../api/tools";
import { ErrorMessage } from "../components/ErrorMessage";
 
const StatCard = ({
  label, value, sub, color, icon, onClick
}: {
  label: string; value: number | string; sub?: string;
  color: string; icon: string; onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    style={{
      background: "#fff",
      border: "1px solid #E2E8F0",
      borderRadius: 16,
      padding: "24px",
      cursor: onClick ? "pointer" : "default",
      transition: "all .2s",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,.06)",
    }}
    onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,.1)"; } }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,.06)"; }}
  >
    {/* Цветовой акцент слева */}
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color, borderRadius: "4px 0 0 4px" }} />
 
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#94A3B8" }}>
          {label}
        </p>
        <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: "#0F172A", lineHeight: 1.1, letterSpacing: "-.03em" }}>
          {value}
        </p>
        {sub && <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#64748B" }}>{sub}</p>}
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, flexShrink: 0
      }}>
        {icon}
      </div>
    </div>
  </div>
);
 
const QuickAction = ({ label, icon, desc, color, onClick }: {
  label: string; icon: string; desc: string; color: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12,
      padding: "16px 18px", cursor: "pointer", textAlign: "left", width: "100%",
      display: "flex", alignItems: "center", gap: 14, transition: "all .18s",
      boxShadow: "0 1px 2px rgba(0,0,0,.04)"
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${color}22`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 2px rgba(0,0,0,.04)"; }}
  >
    <div style={{ width: 40, height: 40, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{desc}</div>
    </div>
  </button>
);
 
export const DashboardPage: FC = () => {
  const navigate = useNavigate();
  const [clientsCount, setClientsCount] = useState(0);
  const [documentsCount, setDocumentsCount] = useState(0);
  const [toolsCount, setToolsCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => { loadData(); }, []);
 
  const loadData = async () => {
    try {
      setLoading(true);
      const [clients, documents, tools] = await Promise.all([
        clientsAPI.getAll(),
        documentsAPI.getAll(),
        toolsAPI.getAll()
      ]);
      setClientsCount(clients.length);
      setDocumentsCount(documents.length);
      setToolsCount(tools.length);
      setActiveCount(documents.filter(d => d.status === "ACTIVE").length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally { setLoading(false); }
  };
 
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Доброе утро" : now.getHours() < 18 ? "Добрый день" : "Добрый вечер";
 
  return (
    <Layout>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Приветствие */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.7rem" }}>{greeting} 👋</h1>
          <p style={{ margin: 0, color: "#64748B", fontSize: 14.5 }}>
            {now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
 
        <ErrorMessage error={error} onClose={() => setError(null)} />
 
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>Загрузка...</div>
        ) : (
          <>
            {/* Статистика */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard label="Клиентов" value={clientsCount} icon="👥" color="#2563EB" onClick={() => navigate("/clients")} />
              <StatCard label="Активных аренд" value={activeCount} sub={`Всего договоров: ${documentsCount}`} icon="📋" color="#16A34A" onClick={() => navigate("/contracts/active")} />
              <StatCard label="Инструментов" value={toolsCount} icon="🔧" color="#D97706" onClick={() => navigate("/tools")} />
              <StatCard label="Все договоры" value={documentsCount} icon="📁" color="#7C3AED" onClick={() => navigate("/documents")} />
            </div>
 
            {/* Быстрые действия */}
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#94A3B8" }}>
                Быстрые действия
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                <QuickAction label="Новая аренда" icon="➕" desc="Оформить договор аренды" color="#2563EB" onClick={() => navigate("/rentals/create")} />
                <QuickAction label="Добавить клиента" icon="👤" desc="Зарегистрировать клиента" color="#16A34A" onClick={() => navigate("/clients/create")} />
                <QuickAction label="Добавить инструмент" icon="🔧" desc="Новый экземпляр в инвентарь" color="#D97706" onClick={() => navigate("/tools/create")} />
                <QuickAction label="Активные аренды" icon="📋" desc="Просмотр текущих договоров" color="#7C3AED" onClick={() => navigate("/contracts/active")} />
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};
