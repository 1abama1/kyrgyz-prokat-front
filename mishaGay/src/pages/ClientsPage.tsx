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
      const whatsapp = client.whatsappPhone?.toLowerCase() ?? "";
      const inn = client.passport?.inn?.toLowerCase() ?? "";
      const regAddr =
        `${client.registrationAddress?.region || ""} ${client.registrationAddress?.street || ""}`
          .toLowerCase();
      const liveAddr =
        `${client.livingAddress?.region || ""} ${client.livingAddress?.street || ""}`
          .toLowerCase();
      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        whatsapp.includes(q) ||
        inn.includes(q) ||
        regAddr.includes(q) ||
        liveAddr.includes(q)
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
        <div className="clients-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px", fontSize: "1.6rem" }}>Клиенты</h1>
            <ErrorMessage error={error} onClose={() => setError(null)} />
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1, maxWidth: "600px", justifyContent: "flex-end" }}>
            <div className="clients-header-search" style={{ flex: 1, maxWidth: "400px" }}>
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
              />
            </div>

            <button
              onClick={() => navigate("/clients/create")}
              className="btn-primary"
              style={{ whiteSpace: "nowrap" }}
            >
              + Новый клиент
            </button>
          </div>
        </div>

        <div className="clients-list">
          {clients.map(client => (
            <ClientExpandableCard
              key={client.id}
              clientId={client.id}
              fullName={client.fullName}
              phone={client.phone || undefined}
              whatsappPhone={client.whatsappPhone || undefined}
            />
          ))}

          {clients.length === 0 && <p>Клиентов нет</p>}
        </div>
      </div>
    </Layout>
  );
};

