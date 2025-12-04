import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { documentsAPI } from "../api/documents";
import { toolsAPI } from "../api/tools";
import { ErrorMessage } from "../components/ErrorMessage";

export const DashboardPage: FC = () => {
  const navigate = useNavigate();

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

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>Главная страница</h1>
          <button onClick={() => navigate("/rentals/create")}>
            ➕ Новая аренда
          </button>
        </div>

        <ErrorMessage error={error} onClose={() => setError(null)} />

        {loading ? (
          <div>Загрузка...</div>
        ) : (
          <div className="dashboard-grid">
            <div className="dashboard-card dashboard-card-blue">
              <h2>Клиенты</h2>
              <p className="dashboard-card-value">{clientsCount}</p>
            </div>

            <div className="dashboard-card dashboard-card-purple">
              <h2>Договоры</h2>
              <p className="dashboard-card-value">{documentsCount}</p>
              <p className="dashboard-card-sub">
                Активных: {activeDocumentsCount}
              </p>
            </div>

            <div className="dashboard-card dashboard-card-green">
              <h2>Инструменты</h2>
              <p className="dashboard-card-value">{toolsCount}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

