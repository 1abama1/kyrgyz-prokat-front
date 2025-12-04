import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { Client } from "../types/client.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { ClientExpandableCard } from "../components/ClientExpandableCard";

export const ClientsPage: FC = () => {
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    // Локальный поиск по уже загруженному списку клиентов
    if (!searchQuery.trim()) {
      setClients(allClients);
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    const filtered = allClients.filter((client) => {
      const fullName = client.fullName?.toLowerCase() ?? "";
      const phone = client.phone?.toLowerCase() ?? "";
      const inn = client.passport?.inn?.toLowerCase() ?? "";
      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        inn.includes(q)
      );
    });

    setClients(filtered);
  }, [searchQuery, allClients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientsAPI.getAll();
      setAllClients(data);
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
      <div className="page-container clients-page">
        <div className="clients-header">
          <div>
            <h1>Клиенты</h1>
            <ErrorMessage error={error} onClose={() => setError(null)} />
          </div>

          <div className="clients-header-search">
            <input
              type="text"
              placeholder="Поиск по ФИО, телефону, ИНН (Enter для поиска)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearchQuery(searchInput.trim());
                }
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db"
              }}
            />
          </div>

          <button
            onClick={() => navigate("/clients/create")}
            className="btn-primary"
          >
            + Новый клиент
          </button>
        </div>

        <div className="clients-list">
          {clients.map(client => (
            <ClientExpandableCard
              key={client.id}
              clientId={client.id}
              fullName={client.fullName}
              phone={client.phone || undefined}
            />
          ))}

          {clients.length === 0 && <p>Клиентов нет</p>}
        </div>
      </div>
    </Layout>
  );
};

