import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { documentsAPI } from "../api/documents";
import { DocumentDetail } from "../types/document.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { formatDate, formatCurrency } from "../utils/formatters";

export const DocumentDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("ID документа не указан");
      setLoading(false);
      return;
    }
    
    const docId = Number(id);
    if (isNaN(docId) || docId <= 0) {
      setError("Неверный ID документа");
      setLoading(false);
      return;
    }
    
    loadDocument(docId);
  }, [id]);

  const loadDocument = async (documentId: number) => {
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

  const handleClose = async () => {
    if (!document || !confirm("Вы уверены, что хотите закрыть договор?")) {
      return;
    }

    try {
      setClosing(true);
      await documentsAPI.close(document.id);
      await loadDocument(document.id);
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
        onClick={() => navigate("/documents")}
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
      
      <h1>Договор №{document.contractNumber}</h1>
      <ErrorMessage error={error} onClose={() => setError(null)} />
      
      <div style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2>Информация о договоре</h2>
        <p><strong>Статус:</strong> 
          <span style={{
            background: document.status === "ACTIVE" ? "#c8e6c9" : "#ffcdd2",
            padding: "4px 8px",
            borderRadius: "4px",
            marginLeft: "8px"
          }}>
            {document.status === "ACTIVE" ? "Активен" : "Закрыт"}
          </span>
        </p>
        <p><strong>Цена аренды:</strong> {formatCurrency(document.price)}</p>
        <p><strong>Создан:</strong> {formatDate(document.createdAt)}</p>
        {document.closedAt && (
          <p><strong>Закрыт:</strong> {formatDate(document.closedAt)}</p>
        )}
      </div>

      <div style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2>Клиент</h2>
        <p><strong>Имя:</strong> {document.client.fullName}</p>
        <p><strong>Телефон:</strong> {document.client.phone || "—"}</p>
        <p><strong>WhatsApp:</strong> {document.client.whatsappPhone || document.client.phone || "—"}</p>
        <p><strong>Email:</strong> {document.client.email || "—"}</p>
        <p><strong>Тег:</strong> {document.client.tag || "—"}</p>
      </div>

      <div style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "20px"
      }}>
        <h2>Инструмент</h2>
        {document.tool && document.toolId ? (
          <>
            <p><strong>Название:</strong> {document.tool.name}</p>
            <p><strong>Категория:</strong> {document.tool.categoryName || "—"}</p>
            <p><strong>Серийный номер:</strong> {document.tool.serialNumber || "—"}</p>
            <p><strong>Статус:</strong> 
              <span style={{
                background: document.tool.status === "AVAILABLE" ? "#c8e6c9" : "#ffcdd2",
                padding: "4px 8px",
                borderRadius: "4px",
                marginLeft: "8px"
              }}>
                {document.tool.status === "AVAILABLE" ? "Доступен" : "В аренде"}
              </span>
            </p>
            {document.toolId && 
             document.toolId !== null && 
             !isNaN(Number(document.toolId)) && 
             Number(document.toolId) > 0 && (
              <p style={{ marginTop: "12px" }}>
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
          </>
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            Информация об инструменте недоступна (старый договор)
          </p>
        )}
      </div>

      {document.status === "ACTIVE" && (
        <button
          onClick={handleClose}
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
    </Layout>
  );
};

