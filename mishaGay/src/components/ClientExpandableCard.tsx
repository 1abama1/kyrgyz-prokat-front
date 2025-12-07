import { FC, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientsAPI } from "../api/clients";
import { contractsAPI } from "../api/contracts";
import type { Client } from "../types/client.types";
import type { RentalDocument } from "../types/RentalDocument";
import { formatDate } from "../utils/formatters";
import { ErrorMessage } from "./ErrorMessage";
import { ClientDocumentsTable } from "./ClientDocumentsTable";

interface Props {
  clientId: number;
  fullName?: string | null;
  phone?: string | null;
}

export const ClientExpandableCard: FC<Props> = ({ clientId, fullName, phone }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<Client | null>(null);
  const [documents, setDocuments] = useState<RentalDocument[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClient = async () => {
    try {
      setLoading(true);
      const [client, docs] = await Promise.all([
        clientsAPI.getById(clientId),
        contractsAPI.getClientDocuments(clientId)
      ]);
      setData(client);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки карточки клиента");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen && !data) {
      try {
        await loadClient();
      } catch {
        // loadClient already handles errors
      }
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        marginBottom: 16,
        boxShadow: open ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
        transition: "box-shadow 0.3s ease"
      }}
      >
      <div
        onClick={toggle}
        style={{
          padding: "24px 20px",
          minHeight: "80px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f7f7f7"
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {data?.fullName || fullName || `Клиент #${clientId}`}
          </div>
          <div style={{ marginTop: 4, fontSize: 14, color: "#6b7280" }}>
            {data?.phone || phone || "—"}
            {data?.createdAt && (
              <span style={{ marginLeft: 12 }}>
                с {formatDate(data.createdAt)}
              </span>
            )}
          </div>
        </div>
        <span
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }}
        >
          ▶
        </span>
      </div>

      <div
        style={{
          maxHeight: open ? 10000 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s ease, padding 0.4s ease",
          padding: open ? "16px" : "0 16px"
        }}
      >
        {loading && <div>Загрузка...</div>}
        <ErrorMessage error={error} onClose={() => setError(null)} />

        {data && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>{data.fullName}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/clients/edit/${clientId}`);
                }}
                style={{
                  background: "#1976d2",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
                title="Редактировать клиента"
              >
                ✏️ Редактировать
              </button>
            </div>

            {/* === ОСНОВНАЯ ИНФА === */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>Основная информация</h4>
              <p><strong>Телефон:</strong> {data.phone || "—"}</p>
              <p><strong>Email:</strong> {data.email || "—"}</p>
              <p><strong>Адрес:</strong> {data.address || "—"}</p>
              <p><strong>Дата рождения:</strong> {data.birthDate || "—"}</p>
              <p><strong>Тег:</strong> {data.tag || "Обычный"}</p>
              {data.createdAt && (
                <p><strong>Создан:</strong> {formatDate(data.createdAt)}</p>
              )}
            </div>

            {/* === ПАСПОРТ === */}
            {data.passport && (
              <div style={{ marginBottom: 20, padding: 12, background: "#f8f9fa", borderRadius: 8 }}>
                <h4 style={{ marginTop: 0, marginBottom: 12 }}>Паспорт</h4>
                <p><strong>Серия:</strong> {data.passport.series || "—"}</p>
                <p><strong>Номер:</strong> {data.passport.number || "—"}</p>
                <p><strong>Кем выдан:</strong> {data.passport.issuedBy || "—"}</p>
                <p><strong>Код подразделения:</strong> {data.passport.subdivisionCode || "—"}</p>
                <p><strong>Дата выдачи:</strong> {data.passport.issueDate || "—"}</p>
                <p><strong>ИНН:</strong> {data.passport.inn || "—"}</p>
              </div>
            )}

            {/* === ДОГОВОРЫ === */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginTop: 0, marginBottom: 12 }}>Договоры аренды</h4>
              {documents.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <ClientDocumentsTable
                    documents={documents}
                    onRefresh={loadClient}
                  />
                </div>
              ) : (
                <p>Договоров нет</p>
              )}
            </div>

            {/* === ФОТО === */}
            {data.images && data.images.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ marginTop: 0, marginBottom: 12 }}>Фото документов</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.images.map((img: any) => (
                    <div key={img.id} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 4 }}>
                      {img.fileName}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/rentals/create?clientId=${clientId}`);
                }}
                style={{
                  background: "#1d6ef2",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 16px",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                ➕ Создать аренду
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

