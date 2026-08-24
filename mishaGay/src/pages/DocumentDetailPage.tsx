import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { documentsAPI } from "../api/documents";
import { contractsAPI } from "../api/contracts";
import { DocumentDetail } from "../types/document.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { formatDate } from "../utils/formatters";
import { DownloadExcelButton } from "../components/DownloadExcelButton";
import { syncManager } from "../db/syncManager";

export const DocumentDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  // Состояния для модального окна закрытия
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [comment, setComment] = useState<string>("");

  useEffect(() => {
    if (!id) {
      setError("ID документа не указан");
      setLoading(false);
      return;
    }

    loadDocument(id);
  }, [id]);

  const loadDocument = async (documentId: string | number) => {
    try {
      setLoading(true);
      const data = await documentsAPI.getById(documentId);
      setDocument(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка загрузки договора");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseClick = () => {
    if (!document) return;
    setPaidAmount(document.amount || 0);
    setComment("");
    setIsModalOpen(true);
  };

  const handleConfirmClose = async () => {
    if (!document) return;

    try {
      setClosing(true);
      await contractsAPI.close(
        document.id || undefined,
        { paidAmount: Number(paidAmount) || 0, comment },
        (document as any).offlineId
      );
      setIsModalOpen(false);
      await loadDocument(id || document.id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка закрытия договора");
      }
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div>Загрузка...</div>
      </Layout>
    );
  }

  if (!document) {
    return (
      <Layout>
        <ErrorMessage error="Договор не найден" />
      </Layout>
    );
  }

  return (
    <Layout>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: "20px",
          padding: "8px 16px",
          background: "#757575",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        ← Назад к списку
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ margin: 0 }}>Договор №{document.contractNumber}</h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* <ReinstallExcelButton contractId={document.id} contractNumber={document.contractNumber} style={{ padding: "8px 16px", fontSize: "14px" }} /> */}
          <DownloadExcelButton
            contractId={document.id}
            contractNumber={document.contractNumber}
            offlineId={(document as any).offlineId}
          />
        </div>
      </div>
      <ErrorMessage error={error} onClose={() => setError(null)} />

      {(!document.id || document.id === 0) && (
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          color: "#92400e",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <strong>Договор сохранен локально (ожидает отправки на сервер)</strong>
            <div style={{ fontSize: "13px", marginTop: "2px" }}>
              При наличии сети договор синхронизируется автоматически.
            </div>
          </div>
          <button
            type="button"
            className="btn-small"
            onClick={async () => {
              await syncManager.syncNow();
              await loadDocument(id || (document as any).offlineId);
            }}
            style={{ background: "#d97706", color: "white", padding: "6px 12px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
          >
            ↻ Отправить на сервер
          </button>
        </div>
      )}

      <div style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2>Информация о договоре</h2>
        <p><strong>Статус:</strong>
          <span style={{
            background:
              document.status === "ACTIVE" ? "#c8e6c9" :
                document.status === "TERMINATED" ? "#ffccbc" : "#ffcdd2",
            padding: "4px 8px",
            borderRadius: "4px",
            marginLeft: "8px"
          }}>
            {document.status === "ACTIVE" && "Активен"}
            {document.status === "CLOSED" && "Закрыт"}
            {document.status === "TERMINATED" && "Расторгнут"}
          </span>
        </p>
        <p><strong>Создан:</strong> {formatDate(document.createdAt)}</p>
        <p><strong>Начало аренды:</strong> {formatDate(document.startDateTime || document.createdAt)}</p>
        {document.returnDate && (
          <p><strong>Дата сдачи:</strong> {formatDate(document.returnDate)}</p>
        )}
        {document.amount !== undefined && document.amount !== null && (
          <p><strong>Сумма:</strong> {document.amount.toLocaleString()} сом</p>
        )}
        {document.comment && (
          <p><strong>Комментарий:</strong> {document.comment}</p>
        )}
      </div>

      <div style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2>Клиент</h2>
        {document.client ? (
          <>
            <p><strong>Имя:</strong> {document.client.fullName || "—"}</p>
            <p><strong>WhatsApp (осн):</strong> {document.client.whatsappPhone || "—"}</p>
            <p><strong>Доп. телефон:</strong> {document.client.additionalPhone || "—"}</p>
            <p><strong>Тег:</strong> {document.client.tag || "—"}</p>
          </>
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            Информация о клиенте недоступна
            {document.clientId && ` (ID: ${document.clientId})`}
          </p>
        )}
      </div>

      <div style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2>Инструменты</h2>
        {document.tools && document.tools.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {document.tools.map((t, idx) => (
              <div key={t.id || idx} style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                <p style={{ margin: "0 0 8px 0" }}><strong>Название:</strong> {t.name}</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Категория:</strong> {t.categoryName || "—"}</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Инвентарный / Серийный номер:</strong> {t.inventoryNumber || t.serialNumber || "—"}</p>
                <p style={{ margin: "0 0 8px 0" }}><strong>Статус:</strong>
                  <span style={{
                    background: t.status === "AVAILABLE" ? "#c8e6c9" : "#ffcdd2",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    marginLeft: "8px"
                  }}>
                    {t.status === "AVAILABLE" ? "Доступен" : "В аренде"}
                  </span>
                </p>
                {t.id && !isNaN(Number(t.id)) && Number(t.id) > 0 && (
                  <p style={{ marginTop: "12px", marginBottom: 0 }}>
                    <button
                      onClick={() => navigate(`/tools/${t.id}`)}
                      style={{
                        padding: "6px 12px",
                        background: "#1976d2",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                    >
                      Открыть инструмент →
                    </button>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (document.tool || document.toolInstance) && document.toolId ? (
          <div style={{ padding: "16px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
            <p style={{ margin: "0 0 8px 0" }}><strong>Название:</strong> {(document.tool || document.toolInstance)?.name}</p>
            <p style={{ margin: "0 0 8px 0" }}><strong>Категория:</strong> {(document.tool || document.toolInstance)?.categoryName || "—"}</p>
            <p style={{ margin: "0 0 8px 0" }}><strong>Инвентарный / Серийный номер:</strong> {(document.tool || document.toolInstance)?.inventoryNumber || (document.tool || document.toolInstance)?.serialNumber || "—"}</p>
            <p style={{ margin: "0 0 8px 0" }}><strong>Статус:</strong>
              <span style={{
                background: (document.tool || document.toolInstance)?.status === "AVAILABLE" ? "#c8e6c9" : "#ffcdd2",
                padding: "4px 8px",
                borderRadius: "4px",
                marginLeft: "8px"
              }}>
                {(document.tool || document.toolInstance)?.status === "AVAILABLE" ? "Доступен" : "В аренде"}
              </span>
            </p>
            {document.toolId &&
              document.toolId !== null &&
              !isNaN(Number(document.toolId)) &&
              Number(document.toolId) > 0 && (
                <p style={{ marginTop: "12px", marginBottom: 0 }}>
                  <button
                    onClick={() => {
                      const toolId = Number(document.toolId);
                      if (toolId && !isNaN(toolId) && toolId > 0) {
                        navigate(`/tools/${toolId}`);
                      }
                    }}
                    style={{
                      padding: "6px 12px",
                      background: "#1976d2",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px"
                    }}
                  >
                    Открыть инструмент →
                  </button>
                </p>
              )}
          </div>
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            Информация об инструменте недоступна (старый договор)
          </p>
        )}
      </div>

      {document.status === "ACTIVE" && (
        <button
          onClick={handleCloseClick}
          disabled={closing}
          style={{
            padding: "10px 20px",
            background: "#d32f2f",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: closing ? "not-allowed" : "pointer"
          }}
        >
          {closing ? "Закрытие..." : "Закрыть договор"}
        </button>
      )}

      {/* Модальное окно закрытия */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Закрытие договора</h2>

            <label style={{ marginBottom: '12px', display: 'block', textAlign: 'left' }}>
              <span style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Сумма оплаты (KGS):</span>
              <input
                type="text"
                inputMode="numeric"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value.replace(/\D/g, ''))}
                onFocus={(e) => e.target.select()}
                autoFocus
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
              />
            </label>

            <label style={{ marginBottom: '20px', display: 'block', textAlign: 'left' }}>
              <span style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Комментарий:</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Причина закрытия, нюансы..."
                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', resize: 'vertical' }}
              />
            </label>

            <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmClose}
                disabled={closing}
                style={{ padding: '8px 16px', background: '#1d6ef2', color: '#fff', border: 'none', borderRadius: '4px', cursor: closing ? 'not-allowed' : 'pointer' }}
              >
                Подтвердить закрытие
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

