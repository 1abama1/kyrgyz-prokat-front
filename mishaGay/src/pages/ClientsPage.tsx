import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { Client, CLIENT_TAGS } from "../types/client.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { ClientExpandableCard } from "../components/ClientExpandableCard";
import { matchPhone } from "../utils/phoneMatch";
import { useLocalFirst } from "../hooks/useLocalFirst";
import { db } from "../db/db";

export const ClientsPage: FC = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const navigate = useNavigate();

  // ── Local-First: читаем из Dexie, HTTP обновляет в фоне ─────────────────────
  const { data: allClients = [], loading, error, refresh } = useLocalFirst<Client[]>(
    // 1. Реактивный запрос из IndexedDB (useLiveQuery под капотом)
    () => db.clients.toArray(),
    // 2. Фоновый HTTP-запрос, который обновит Dexie → компонент перерисуется сам
    () => clientsAPI.getAll()
  );

  // ── Фильтрация (без запросов к серверу) ─────────────────────────────────────
  const clients = allClients.filter((client) => {
    if (selectedTag && client.tag !== selectedTag) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.trim().toLowerCase();
    const fullName = client.fullName?.toLowerCase() ?? "";
    const whatsapp = client.whatsappPhone?.toLowerCase() ?? "";
    const additional = client.additionalPhone?.toLowerCase() ?? "";
    const inn = client.passport?.inn?.toLowerCase() ?? "";
    const regAddr =
      `${client.registrationAddress?.region || ""} ${client.registrationAddress?.street || ""}`.toLowerCase();
    const liveAddr =
      `${client.livingAddress?.region || ""} ${client.livingAddress?.street || ""}`.toLowerCase();

    return (
      fullName.includes(q) ||
      whatsapp.includes(q) ||
      matchPhone(client.whatsappPhone, q) ||
      additional.includes(q) ||
      matchPhone(client.additionalPhone, q) ||
      inn.includes(q) ||
      regAddr.includes(q) ||
      liveAddr.includes(q)
    );
  });

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
        <div className="clients-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Клиенты</h1>
            <ErrorMessage error={error} onClose={() => {}} />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, justifyContent: "flex-end" }}>
            <input
              type="text"
              placeholder="Поиск по ФИО, телефону, ИНН (Enter)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setSearchQuery(searchInput.trim());
                }
              }}
              style={{ width: "260px" }}
            />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{ width: "140px" }}
            >
              <option value="">Все теги</option>
              {CLIENT_TAGS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
              whatsappPhone={client.whatsappPhone || undefined}
              additionalPhone={client.additionalPhone || undefined}
              tag={client.tag || undefined}
              onDelete={refresh}
            />
          ))}

          {clients.length === 0 && <p>Клиентов нет</p>}
        </div>
      </div>
    </Layout>
  );
};
