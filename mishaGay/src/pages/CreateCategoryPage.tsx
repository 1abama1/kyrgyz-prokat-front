import { useState } from "react";
import { Layout } from "../components/Layout";
import { categoriesAPI } from "../api/categories";
import { ErrorMessage } from "../components/ErrorMessage";

export const CreateCategoryPage = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Введите название категории");
      return;
    }

    setLoading(true);
    try {
      await categoriesAPI.create({ name: trimmed });
      setSuccess("Категория создана");
      setName("");
    } catch (err: any) {
      setError(err?.message || "Ошибка создания категории");
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
        <h1 className="tools-page-title">Создать категорию</h1>
        <ErrorMessage error={error} onClose={() => setError(null)} />
        {success && (
          <div style={{ marginBottom: 12, color: "#15803d", fontWeight: 600 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ maxWidth: 420, marginTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Название категории <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Перфораторы"
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
            style={{ width: "100%", maxWidth: 220 }}
          >
            {loading ? "Создание..." : "Создать категорию"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

