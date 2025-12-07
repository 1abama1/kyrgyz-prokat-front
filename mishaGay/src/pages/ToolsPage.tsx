import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { toolsAPI } from "../api/tools";
import { ToolListItem, ToolStatus } from "../types/ToolList";
import { ToolStatusBadge } from "../components/ToolStatusBadge";
import { ToolsFilter } from "../components/ToolsFilter";
import { ErrorMessage } from "../components/ErrorMessage";
import "../styles/tools.css";

export const ToolsPage = () => {
  const [tools, setTools] = useState<ToolListItem[]>([]);
  const [status, setStatus] = useState<ToolStatus>();
  const [categoryId, setCategoryId] = useState<number>();
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Загружаем категории один раз при монтировании
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const allTools = await toolsAPI.getList();
        const uniqueCategories = Array.from(
          new Set(allTools.map(t => t.categoryName))
        ).map((name, index) => ({ id: index + 1, name }));
        setCategories(uniqueCategories);
      } catch (err) {
        console.error("Ошибка загрузки категорий:", err);
      }
    };
    loadCategories();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await toolsAPI.getList({ status, categoryId });
      setTools(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка загрузки инструментов");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [status, categoryId]);

  if (loading) {
    return (
      <Layout>
        <div>Загрузка инвентаря...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Инвентарь</h1>
        <button
          onClick={() => navigate("/tools/create")}
          style={{
            padding: "8px 16px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500
          }}
        >
          + Новый инструмент
        </button>
      </div>

      <ErrorMessage error={error} onClose={() => setError(null)} />

      <ToolsFilter
        status={status}
        categoryId={categoryId}
        categories={categories}
        onChange={({ status, categoryId }) => {
          setStatus(status);
          setCategoryId(categoryId);
        }}
      />

      <div style={{ marginTop: "20px", width: "100%", maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
        <table className="tools-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Инв. №</th>
              <th>Категория</th>
              <th>Статус</th>
              <th>Залог</th>
              <th style={{ width: 100 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tools.map(t => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tools/${t.id}`)}
                style={{
                  cursor: "pointer",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                }}
              >
                <td>{t.name}</td>
                <td>{t.inventoryNumber}</td>
                <td>{t.categoryName}</td>
                <td>
                  <ToolStatusBadge status={t.status} />
                </td>
                <td>
                  {t.deposit !== null ? `${t.deposit} сом` : "—"}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/tools/edit/${t.id}`)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 18,
                      padding: "4px 8px",
                      borderRadius: "4px",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#e3f2fd";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                    title="Редактировать инструмент"
                  >
                    ✏️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tools.length === 0 && !loading && (
        <p style={{ marginTop: "20px" }}>Инструменты не найдены</p>
      )}
    </Layout>
  );
};
