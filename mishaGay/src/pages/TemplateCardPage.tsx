import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { templatesAPI } from "../api/templates";
import { categoriesAPI } from "../api/categories";
import { TemplateFullDto, CategoryDto } from "../types/inventory.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { ToolStatusBadge } from "../components/ToolStatusBadge";
import { StyledSelect } from "../components/StyledSelect";
import { FormField } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import "../styles/tools.css";
import "../styles/forms.css";

export const TemplateCardPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [template, setTemplate] = useState<TemplateFullDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDailyRentalPrice, setEditDailyRentalPrice] = useState<number>(0);
  const [editDepositAmount, setEditDepositAmount] = useState<number>(0);
  const [editPurchasePrice, setEditPurchasePrice] = useState<number>(0);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  useEffect(() => {
    if (!id) {
      setError("ID модели не указан");
      setLoading(false);
      return;
    }
    loadData(id);
    categoriesAPI.getAll().then(setCategories).catch(console.error);
  }, [id]);

  const loadData = async (templateId: string) => {
    try {
      setLoading(true);
      setError(null);
      const tmpl = await templatesAPI.getFull(templateId);
      setTemplate(tmpl);
      setEditName(tmpl.name);

      setEditDailyRentalPrice(tmpl.dailyRentalPrice || 0);
      setEditDepositAmount(tmpl.depositAmount || 0);
      setEditPurchasePrice(tmpl.purchasePrice || 0);

      setEditCategoryId(tmpl.categoryId || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки модели");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    if (!editName.trim()) {
      setError("Название модели не может быть пустым");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await templatesAPI.update(id, {
        name: editName.trim(),
        categoryId: editCategoryId,
        dailyRentalPrice: editDailyRentalPrice,
        depositAmount: editDepositAmount,
        purchasePrice: editPurchasePrice,
      });

      await loadData(id);
      setIsEditing(false);
      toast.success("Изменения модели сохранены");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения модели");
    } finally {
      setSaving(false);
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

  if (!template) {
    return (
      <Layout>
        <ErrorMessage error="Модель не найдена" onClose={() => {}} />
      </Layout>
    );
  }

  return (
    <Layout
      breadcrumbs={[
        { label: "Инвентарь", path: "/tools" },
        { label: template.name },
      ]}
    >
      <div className="tools-page">
        <ErrorMessage error={error} onClose={() => setError(null)} />

        <button
          type="button"
          className="back-button-link"
          onClick={() => navigate(-1)}
          aria-label="Вернуться назад"
        >
          ← Назад
        </button>

        <div
          className="tool-card-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h1 className="tools-page-title">
            {isEditing ? "Редактирование модели" : `Модель: ${template.name}`}
          </h1>
          {!isEditing && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditing(true)}
            >
              ✎ Изменить
            </button>
          )}
        </div>

        <div className="tool-card-info">
          {isEditing ? (
            <div className="form-section-card" style={{ maxWidth: 680 }}>
              <div className="form-section-title">
                <span>Параметры модели</span>
              </div>

              <FormField label="Название модели" required>
                {(a11y) => (
                  <input
                    {...a11y}
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Название модели"
                  />
                )}
              </FormField>

              <FormField label="Категория">
                {(a11y) => (
                  <StyledSelect
                    inputId={a11y.id}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    value={editCategoryId}
                    onChange={(val) => setEditCategoryId(String(val || ""))}
                    placeholder="Выберите категорию"
                  />
                )}
              </FormField>

              <div className="form-row" style={{ marginTop: 16 }}>
                <FormField label="Цена за сутки">
                  {(a11y) => (
                    <div className="input-with-suffix">
                      <input
                        {...a11y}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        className="form-input"
                        value={editDailyRentalPrice || ""}
                        onChange={(e) =>
                          setEditDailyRentalPrice(Number(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                      <span className="input-suffix">сом</span>
                    </div>
                  )}
                </FormField>

                <FormField label="Сумма залога">
                  {(a11y) => (
                    <div className="input-with-suffix">
                      <input
                        {...a11y}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        className="form-input"
                        value={editDepositAmount || ""}
                        onChange={(e) =>
                          setEditDepositAmount(Number(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                      <span className="input-suffix">сом</span>
                    </div>
                  )}
                </FormField>

                <FormField label="Стоимость инструмента">
                  {(a11y) => (
                    <div className="input-with-suffix">
                      <input
                        {...a11y}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        className="form-input"
                        value={editPurchasePrice || ""}
                        onChange={(e) =>
                          setEditPurchasePrice(Number(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                      <span className="input-suffix">сом</span>
                    </div>
                  )}
                </FormField>
              </div>

              <div className="form-actions" style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div
              className="tool-card-section"
              style={{
                background: "#fff",
                padding: 22,
                borderRadius: 14,
                border: "1px solid var(--border)",
              }}
            >
              <h3 className="tool-card-section-title">Информация о модели</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginTop: 16,
                }}
              >
                <div>
                  <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
                    Название
                  </p>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: "4px 0 0" }}>
                    {template.name}
                  </p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
                    Категория
                  </p>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: "4px 0 0" }}>
                    {categories.find((c) => c.id === template.categoryId)?.name || "—"}
                  </p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
                    Цена за сутки
                  </p>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: "4px 0 0" }}>
                    {template.dailyRentalPrice ? `${template.dailyRentalPrice} сом` : "—"}
                  </p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
                    Сумма залога
                  </p>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: "4px 0 0" }}>
                    {template.depositAmount ? `${template.depositAmount} сом` : "—"}
                  </p>
                </div>
                <div>
                  <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 13 }}>
                    Стоимость инструмента
                  </p>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: "4px 0 0" }}>
                    {template.purchasePrice ? `${template.purchasePrice} сом` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="tool-card-section" style={{ marginTop: 24 }}>
            <h3 className="tool-card-section-title">
              Экземпляры ({template.tools.length})
            </h3>
            {template.tools.length === 0 ? (
              <p style={{ color: "var(--text-muted)", padding: "16px 20px" }}>
                Нет экземпляров
              </p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px" }}>№</th>
                    <th style={{ padding: "12px 16px" }}>Инвентарный №</th>
                    <th style={{ padding: "12px 16px" }}>Статус</th>
                    <th style={{ padding: "12px 16px" }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {template.tools.map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px" }}>{idx + 1}</td>
                      <td style={{ padding: "12px 16px" }}>{t.inventoryNumber}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <ToolStatusBadge status={t.activeBookingId ? "BOOKED" : t.status} />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          type="button"
                          className="btn-small btn-secondary"
                          onClick={() => navigate(`/tools/${t.id}`)}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
