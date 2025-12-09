import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { toolsAPI } from "../api/tools";
import { Tool, ToolHistoryEntry } from "../types/tool.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { toolStatusLabel, getToolStatusClass } from "../utils/toolStatus";
import { ToolHistoryTable } from "../components/ToolHistoryTable";
import "../styles/tools.css";

export const ToolCardPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ToolHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("ID инструмента не указан");
      setLoading(false);
      return;
    }
    
    const toolId = Number(id);
    if (isNaN(toolId) || toolId <= 0) {
      setError("Неверный ID инструмента");
      setLoading(false);
      return;
    }
    
    loadTool(toolId);
  }, [id]);

  const loadTool = async (toolId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await toolsAPI.getOne(toolId);
      setTool(data);
      toolsAPI.getHistory(toolId)
        .then(setHistory)
        .catch(() => setHistoryError("Историю выдач загрузить не удалось"));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка загрузки инструмента");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="tools-loading">
          <p>Загрузка...</p>
        </div>
      </Layout>
    );
  }

  if (!tool) {
    return (
      <Layout>
        <ErrorMessage error="Инструмент не найден" onClose={() => {}} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tools-page">
        <ErrorMessage error={error} onClose={() => setError(null)} />
        
        <div className="tool-card-header">
          <h1 className="tools-page-title">{tool.name}</h1>
          <button
            onClick={() => {
              if (id && !isNaN(Number(id)) && Number(id) > 0) {
                navigate(`/tools/edit/${id}`);
              } else {
                console.error("Invalid tool id for edit:", id);
              }
            }}
            className="btn-primary"
          >
            ✏️ Редактировать
          </button>
        </div>

        <div className="tool-card-info">
          <div className="tool-card-section">
            <h3 className="tool-card-section-title">Основная информация</h3>
            <div className="tool-card-field">
              <span className="tool-card-label">Название:</span>
              <span className="tool-card-value">{tool.name}</span>
            </div>
            <div className="tool-card-field">
              <span className="tool-card-label">Инвентарный номер:</span>
              <span className="tool-card-value">{tool.inventoryNumber}</span>
            </div>
            {tool.article && (
              <div className="tool-card-field">
                <span className="tool-card-label">Артикул:</span>
                <span className="tool-card-value">{tool.article}</span>
              </div>
            )}
            <div className="tool-card-field">
              <span className="tool-card-label">Статус:</span>
              <span className={getToolStatusClass(tool.status)}>
                {toolStatusLabel(tool.status)}
              </span>
            </div>
          </div>

          <div className="tool-card-section">
            <h3 className="tool-card-section-title">Классификация</h3>
            <div className="tool-card-field">
              <span className="tool-card-label">Категория:</span>
              <span className="tool-card-value">{tool.categoryName || "—"}</span>
            </div>
            <div className="tool-card-field">
              <span className="tool-card-label">Модель:</span>
              <span className="tool-card-value">{tool.templateName || "—"}</span>
            </div>
          </div>

          <div className="tool-card-section">
            <h3 className="tool-card-section-title">Финансовая информация</h3>
            <div className="tool-card-field">
              <span className="tool-card-label">Залог:</span>
              <span className="tool-card-value">{tool.deposit} сом</span>
            </div>
            <div className="tool-card-field">
              <span className="tool-card-label">Цена закупки:</span>
              <span className="tool-card-value">{tool.purchasePrice} сом</span>
            </div>
            <div className="tool-card-field">
              <span className="tool-card-label">Цена в сутки:</span>
              <span className="tool-card-value">{tool.dailyPrice} сом</span>
            </div>
          </div>

          {tool.images && tool.images.length > 0 && (
            <div className="tool-card-section">
              <h3 className="tool-card-section-title">Фото</h3>
              <ul className="tool-card-images">
                {tool.images.map(img => (
                  <li key={img.id}>{img.fileName}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="tool-card-section">
            <h3 className="tool-card-section-title">История выдачи</h3>
            {historyError && (
              <div style={{ color: "#b91c1c", marginBottom: 8 }}>{historyError}</div>
            )}
            <ToolHistoryTable history={history} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

