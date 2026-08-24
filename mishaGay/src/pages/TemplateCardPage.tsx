import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { templatesAPI } from "../api/templates";
import { categoriesAPI } from "../api/categories";
import { TemplateFullDto, CategoryDto } from "../types/inventory.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { ToolStatusBadge } from "../components/ToolStatusBadge";
import { StyledSelect } from "../components/StyledSelect";
import "../styles/tools.css";

export const TemplateCardPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
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
      
      // We added categoryId to TemplateFullDto
      setEditCategoryId(tmpl.categoryId || "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки модели");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    try {
      setSaving(true);
      setError(null);
      
      await templatesAPI.update(id, {
        name: editName,
        categoryId: editCategoryId,
        dailyRentalPrice: editDailyRentalPrice,
        depositAmount: editDepositAmount,
        purchasePrice: editPurchasePrice,
      });
      
      await loadData(id);
      setIsEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения модели");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Layout><div className="tools-loading"><p>Загрузка...</p></div></Layout>;
  }

  if (!template) {
    return <Layout><ErrorMessage error="Модель не найдена" onClose={() => {}} /></Layout>;
  }



  return (
    <Layout>
      <div className="tools-page">
        <ErrorMessage error={error} onClose={() => setError(null)} />
        
        <button
          type="button"
          className="btn-small"
          onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = "/tools")}
          style={{ marginBottom: 16 }}
        >
          ← Назад
        </button>

        <div className="tool-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="tools-page-title">
            {isEditing ? "Редактирование модели" : `Модель: ${template.name}`}
          </h1>
          {!isEditing && (
            <button className="btn-secondary" onClick={() => setIsEditing(true)}>
              Изменить
            </button>
          )}
        </div>

        <div className="tool-card-info">
          {isEditing ? (
            <div className="tool-card-section" style={{ background: "#f9fafb", padding: 20, borderRadius: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Название модели</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: 4, border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Категория</label>
                  <StyledSelect
                    options={categories.map(c => ({ value: c.id, label: c.name }))}
                    value={editCategoryId}
                    onChange={(val) => setEditCategoryId(String(val))}
                    placeholder="Выберите категорию"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Цена за сутки (с)</label>
                  <input
                    type="number"
                    value={editDailyRentalPrice}
                    onChange={(e) => setEditDailyRentalPrice(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px", borderRadius: 4, border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Сумма залога (с)</label>
                  <input
                    type="number"
                    value={editDepositAmount}
                    onChange={(e) => setEditDepositAmount(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px", borderRadius: 4, border: "1px solid #ccc" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>Стоимость инструмента (с)</label>
                  <input
                    type="number"
                    value={editPurchasePrice}
                    onChange={(e) => setEditPurchasePrice(Number(e.target.value))}
                    style={{ width: "100%", padding: "10px", borderRadius: 4, border: "1px solid #ccc" }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
                <button className="btn-secondary" onClick={() => setIsEditing(false)} disabled={saving}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div className="tool-card-section" style={{ background: "#fff", padding: 20, borderRadius: 8, border: "1px solid #eee" }}>
              <h3 className="tool-card-section-title">Информация о модели</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: 16 }}>
                <div>
                  <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Название</p>
                  <p style={{ fontWeight: 500, fontSize: 16, margin: "4px 0 0" }}>{template.name}</p>
                </div>
                <div>
                  <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Категория</p>
                  <p style={{ fontWeight: 500, fontSize: 16, margin: "4px 0 0" }}>
                    {categories.find(c => c.id === template.categoryId)?.name || "—"}
                  </p>
                </div>
                <div>
                  <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Цена за сутки</p>
                  <p style={{ fontWeight: 500, fontSize: 16, margin: "4px 0 0" }}>
                    {template.dailyRentalPrice ? `${template.dailyRentalPrice} с` : "—"}
                  </p>
                </div>
                <div>
                  <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Сумма залога</p>
                  <p style={{ fontWeight: 500, fontSize: 16, margin: "4px 0 0" }}>
                    {template.depositAmount ? `${template.depositAmount} с` : "—"}
                  </p>
                </div>
                <div>
                  <p style={{ color: "#666", margin: 0, fontSize: 14 }}>Стоимость инструмента</p>
                  <p style={{ fontWeight: 500, fontSize: 16, margin: "4px 0 0" }}>
                    {template.purchasePrice ? `${template.purchasePrice} с` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="tool-card-section" style={{ marginTop: 32 }}>
            <h3 className="tool-card-section-title">Экземпляры ({template.tools.length})</h3>
            {template.tools.length === 0 ? (
              <p style={{ color: "#666" }}>Нет экземпляров</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                    <th style={{ padding: "8px" }}>№</th>
                    <th style={{ padding: "8px" }}>Инвентарный №</th>
                    <th style={{ padding: "8px" }}>Статус</th>
                    <th style={{ padding: "8px" }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {template.tools.map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px" }}>{idx + 1}</td>
                      <td style={{ padding: "8px" }}>{t.inventoryNumber}</td>
                      <td style={{ padding: "8px" }}>
                        <ToolStatusBadge status={t.activeBookingId ? "BOOKED" : t.status} />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <button
                          onClick={() => navigate(`/tools/${t.id}`)}
                          style={{
                            background: "transparent",
                            border: "1px solid #2563eb",
                            color: "#2563eb",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
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
