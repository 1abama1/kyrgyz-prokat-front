import { useEffect, useState } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { categoriesAPI } from "../api/categories";
import { templatesAPI } from "../api/templates";
import { ErrorMessage } from "../components/ErrorMessage";
import { StyledSelect } from "../components/StyledSelect";
import type { CategoryDto } from "../types/inventory.types";

export const CreateTemplatePage = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [name, setName] = useState("");
  const [dailyRentalPrice, setDailyRentalPrice] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
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

    if (isEditMode && id) {
      setLoading(true);
      templatesAPI.getFull(id)
        .then((data) => {
          setName(data.name);
          setCategoryId(data.categoryId);
          setDailyRentalPrice(data.dailyRentalPrice || 0);
          setDepositAmount(data.depositAmount || 0);
          setPurchasePrice(data.purchasePrice || 0);
        })
        .catch((err: any) => setError(err?.message || "Не удалось загрузить модель"))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  // Автоподстановка категории из query-параметра
  useEffect(() => {
    const catId = searchParams.get("categoryId");
    if (catId) {
      setCategoryId(catId);
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
      if (isEditMode && id) {
        await templatesAPI.update(id, { 
          name: trimmed, 
          categoryId,
          dailyRentalPrice,
          depositAmount,
          purchasePrice
        });
        setSuccess("Модель обновлена");
        setTimeout(() => navigate(-1), 1000);
      } else {
        await templatesAPI.create({ 
          name: trimmed, 
          categoryId,
          dailyRentalPrice,
          depositAmount,
          purchasePrice
        });
        setSuccess("Модель создана");
        setName("");
        setDailyRentalPrice(0);
        setDepositAmount(0);
        setPurchasePrice(0);
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка сохранения модели");
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
        <h1 className="tools-page-title">{isEditMode ? "Изменить модель инструмента" : "Создать модель инструмента"}</h1>
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
            <StyledSelect
              options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
              value={categoryId ?? ""}
              onChange={(val) => setCategoryId(val ? String(val) : undefined)}
              isDisabled={loading || loadingCategories}
              placeholder={loadingCategories ? "Загрузка категорий..." : "Выберите категорию"}
              isClearable
            />
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Цена за сутки (с)
            </label>
            <input
              type="number"
              value={dailyRentalPrice}
              onChange={(e) => setDailyRentalPrice(Number(e.target.value))}
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Сумма залога (с)
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
              Стоимость инструмента (с)
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
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
            {loading ? "Сохранение..." : isEditMode ? "Сохранить изменения" : "Создать модель"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

