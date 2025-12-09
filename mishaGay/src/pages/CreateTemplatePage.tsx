import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { categoriesAPI } from "../api/categories";
import { templatesAPI } from "../api/templates";
import { ErrorMessage } from "../components/ErrorMessage";
import type { CategoryDto } from "../types/inventory.types";

export const CreateTemplatePage = () => {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoadingCategories(true);
    categoriesAPI.getAll()
      .then(setCategories)
      .catch((err: any) => setError(err?.message || "Не удалось загрузить категории"))
      .finally(() => setLoadingCategories(false));
  }, []);

  // Автоподстановка категории из query-параметра
  useEffect(() => {
    const catId = searchParams.get("categoryId");
    if (catId) {
      const parsed = Number(catId);
      if (!isNaN(parsed) && parsed > 0) {
        setCategoryId(parsed);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = name.trim();
    if (!categoryId) {
      setError("Выберите категорию");
      return;
    }
    if (!trimmed) {
      setError("Введите название модели");
      return;
    }

    setLoading(true);
    try {
      await templatesAPI.create({ name: trimmed, categoryId });
      setSuccess("Модель создана");
      setName("");
    } catch (err: any) {
      setError(err?.message || "Ошибка создания модели");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="tools-page">
        <button
          type="button"
          className="btn-small"
          onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/tools")}
          style={{ marginBottom: 16 }}
        >
          ← Назад
        </button>
        <h1 className="tools-page-title">Создать модель инструмента</h1>
        <ErrorMessage error={error} onClose={() => setError(null)} />
        {success && (
          <div style={{ marginBottom: 12, color: "#15803d", fontWeight: 600 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: 480, marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Категория <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
              disabled={loading || loadingCategories}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: loading || loadingCategories ? "#f9fafb" : "#fff",
                fontSize: 14,
                cursor: loading || loadingCategories ? "not-allowed" : "pointer",
              }}
            >
              <option value="">
                {loadingCategories ? "Загрузка категорий..." : "Выберите категорию"}
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Название модели <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Bosch GBH 2-26 DFR"
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: loading ? "#f9fafb" : "#fff",
                fontSize: 14,
              }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: "100%", maxWidth: 240 }}
          >
            {loading ? "Создание..." : "Создать модель"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

