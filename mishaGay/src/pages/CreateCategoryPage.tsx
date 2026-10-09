import { useState, useRef, FC } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { categoriesAPI } from "../api/categories";
import { ErrorMessage } from "../components/ErrorMessage";
import { FormField } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import { db } from "../db/db";
import { CategoryDto } from "../types/inventory.types";
import "../styles/tools.css";
import "../styles/forms.css";

export const CreateCategoryPage: FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdCategory, setCreatedCategory] = useState<CategoryDto | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setFieldErrors({ name: "Введите название категории" });
      inputRef.current?.focus();
      return;
    }

    // Проверка на дубликат в локальной базе Dexie
    try {
      const localCats = await db.categories.toArray();
      const isDuplicate = localCats.some(
        (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (isDuplicate) {
        setFieldErrors({ name: "Такая категория уже есть" });
        inputRef.current?.focus();
        return;
      }
    } catch (dbErr) {
      console.warn("Не удалось проверить дубликаты локально:", dbErr);
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const created = await categoriesAPI.create({ name: trimmed });
      toast.success(`Категория «${trimmed}» успешно создана!`);
      setCreatedCategory(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка создания категории";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setName("");
    setCreatedCategory(null);
    setFieldErrors({});
    setServerError(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <Layout
      breadcrumbs={[
        { label: "Инвентарь", path: "/tools" },
        { label: "Создать категорию" },
      ]}
    >
      <div className="tools-page">
        <button
          type="button"
          className="back-button-link"
          onClick={() => navigate(-1)}
          aria-label="Вернуться назад"
        >
          ← Назад
        </button>

        <h1 className="tools-page-title" style={{ marginBottom: 20 }}>
          Создать категорию
        </h1>

        <ErrorMessage error={serverError} onClose={() => setServerError(null)} />

        {createdCategory ? (
          <div className="form-section-card" style={{ maxWidth: 480, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#DCFCE7",
                  color: "#15803D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Категория «{createdCategory.name}» создана
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  Что вы хотите сделать дальше?
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  navigate(`/templates/create?categoryId=${createdCategory.id}`)
                }
              >
                + Добавить модель в эту категорию
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCreateAnother}
              >
                Создать ещё одну категорию
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => navigate("/tools")}
              >
                Перейти к инвентарю
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ maxWidth: 460, marginTop: 12 }} noValidate>
            <FormField
              label="Название категории"
              required
              error={fieldErrors.name}
              hint="Например: Перфораторы, Виброплиты, Бензопилы"
            >
              {(a11y) => (
                <input
                  {...a11y}
                  ref={inputRef}
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors({});
                    }
                  }}
                  placeholder="Введите название категории"
                  disabled={loading}
                  autoFocus
                />
              )}
            </FormField>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Создание..." : "Создать категорию"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={loading}
                onClick={() => navigate(-1)}
              >
                Отмена
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};
