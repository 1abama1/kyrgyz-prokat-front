import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { Client } from "../types/client.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { ClientExpandableCard } from "../components/ClientExpandableCard";

export const ClientsPage: FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientsAPI.getAll();
      setClients(data);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки клиентов");
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
      <h1>Клиенты</h1>
      <ErrorMessage error={error} onClose={() => setError(null)} />

      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate("/clients/create")}
          style={{
            padding: "8px 16px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          + Новый клиент
        </button>
      </div>

      {clients.map(client => (
        <ClientExpandableCard key={client.id} clientId={client.id} />
      ))}

      {clients.length === 0 && <p>Клиентов нет</p>}
    </Layout>
  );
};

