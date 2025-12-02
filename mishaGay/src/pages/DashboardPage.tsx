import { FC, useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { documentsAPI } from "../api/documents";
import { toolsAPI } from "../api/tools";
import { ErrorMessage } from "../components/ErrorMessage";

export const DashboardPage: FC = () => {
  const [clientsCount, setClientsCount] = useState<number>(0);
  const [documentsCount, setDocumentsCount] = useState<number>(0);
  const [toolsCount, setToolsCount] = useState<number>(0);
  const [activeDocumentsCount, setActiveDocumentsCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
      setActiveDocumentsCount(documents.filter(d => d.status === "ACTIVE").length);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка загрузки данных");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div>Загрузка...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1>Главная страница</h1>
      <ErrorMessage error={error} onClose={() => setError(null)} />
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginTop: "20px" }}>
        <div style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          background: "#e3f2fd"
        }}>
          <h2>Клиенты</h2>
          <p style={{ fontSize: "32px", margin: 0 }}>{clientsCount}</p>
        </div>
        
        <div style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          background: "#f3e5f5"
        }}>
          <h2>Договоры</h2>
          <p style={{ fontSize: "32px", margin: 0 }}>{documentsCount}</p>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Активных: {activeDocumentsCount}
          </p>
        </div>
        
        <div style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          background: "#e8f5e9"
        }}>
          <h2>Инструменты</h2>
          <p style={{ fontSize: "32px", margin: 0 }}>{toolsCount}</p>
        </div>
      </div>
    </Layout>
  );
};

