import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { toolsAPI } from "../api/tools";
import { Tool } from "../types/tool.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { toolStatusLabel, getToolStatusClass } from "../utils/toolStatus";
import { formatDate } from "../utils/formatters";
import "../styles/tools.css";

export const ToolCardPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadTool();
  }, [id]);

  const loadTool = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await toolsAPI.getById(Number(id));
      setTool(data);
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
        <div>Загрузка...</div>
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
      <ErrorMessage error={error} onClose={() => setError(null)} />
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>{tool.name}</h2>
        <button
          onClick={() => navigate(`/tools/edit/${id}`)}
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
          title="Редактировать инструмент"
        >
          ✏️ Редактировать
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <p><strong>Инвентарный номер:</strong> {tool.inventoryNumber}</p>
        <p>
          <strong>Статус:</strong>{" "}
          <span className={getToolStatusClass(tool.status)}>
            {toolStatusLabel(tool.status)}
          </span>
        </p>
        {tool.article && (
          <p><strong>Артикул:</strong> {tool.article}</p>
        )}
        <p><strong>Описание:</strong> {tool.description || "—"}</p>
        <p><strong>Залог:</strong> {tool.deposit ? `${tool.deposit} сом` : "—"}</p>
        {tool.purchasePrice && (
          <p><strong>Цена покупки:</strong> {tool.purchasePrice} сом</p>
        )}
        {tool.purchaseDate && (
          <p><strong>Дата покупки:</strong> {formatDate(tool.purchaseDate)}</p>
        )}
      </div>

      {tool.attributes && tool.attributes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3>Параметры</h3>
          <ul>
            {tool.attributes.map((a, i) => (
              <li key={i}>
                <strong>{a.name}:</strong> {a.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tool.images && tool.images.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3>Фото</h3>
          <ul>
            {tool.images.map(img => (
              <li key={img.id}>{img.fileName}</li>
            ))}
          </ul>
        </div>
      )}
    </Layout>
  );
};

