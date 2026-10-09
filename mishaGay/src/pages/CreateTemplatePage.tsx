import { useEffect, useState, useRef, FC } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { categoriesAPI } from "../api/categories";
import { templatesAPI } from "../api/templates";
import { ErrorMessage } from "../components/ErrorMessage";
import { StyledSelect } from "../components/StyledSelect";
import { FormField } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import type { CategoryDto } from "../types/inventory.types";
import "../styles/tools.css";
import "../styles/forms.css";

export const CreateTemplatePage: FC = () => {
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = Boolean(id);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(
    () => searchParams.get("categoryId") || undefined
  );
  const [name, setName] = useState("");
  const [dailyRentalPriceStr, setDailyRentalPriceStr] = useState<string>("");
  const [depositAmountStr, setDepositAmountStr] = useState<string>("");
  const [purchasePriceStr, setPurchasePriceStr] = useState<string>("");

  const [initialData, setInitialData] = useState<{
    categoryId?: string;
    name: string;
    daily: string;
    deposit: string;
    purchase: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(Boolean(isEditMode && id));
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    categoriesAPI
      .getAll()
      .then(setCategories)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Не удалось загрузить категории";
        setServerError(msg);
      })
      .finally(() => setLoadingCategories(false));

    if (isEditMode && id) {
      templatesAPI
        .getFull(id)
        .then((data) => {
          const loadedName = data.name || "";
          const loadedCatId = data.categoryId;
          const loadedDaily = data.dailyRentalPrice ? String(data.dailyRentalPrice) : "";
          const loadedDeposit = data.depositAmount ? String(data.depositAmount) : "";
          const loadedPurchase = data.purchasePrice ? String(data.purchasePrice) : "";

          setName(loadedName);
          setCategoryId(loadedCatId);
          setDailyRentalPriceStr(loadedDaily);
          setDepositAmountStr(loadedDeposit);
          setPurchasePriceStr(loadedPurchase);

          setInitialData({
            categoryId: loadedCatId,
            name: loadedName,
            daily: loadedDaily,
            deposit: loadedDeposit,
            purchase: loadedPurchase,
          });
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Не удалось загрузить модель";
          setServerError(msg);
        })
        .finally(() => setLoadingData(false));
    }
  }, [id, isEditMode]);

  // Проверка "грязной" формы (были ли изменения)
  const isFormDirty = () => {
    if (isEditMode && initialData) {
      return (
        categoryId !== initialData.categoryId ||
        name !== initialData.name ||
        dailyRentalPriceStr !== initialData.daily ||
        depositAmountStr !== initialData.deposit ||
        purchasePriceStr !== initialData.purchase
      );
    }
    return Boolean(
      name.trim() ||
        dailyRentalPriceStr ||
        depositAmountStr ||
        purchasePriceStr ||
        (categoryId && !searchParams.get("categoryId"))
    );
  };

  const handleBack = () => {
    if (isFormDirty()) {
      const confirmLeave = window.confirm(
        "У вас есть несохранённые изменения. Вы уверены, что хотите уйти?"
      );
      if (!confirmLeave) return;
    }
    navigate(-1);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!categoryId) {
      newErrors.categoryId = "Выберите категорию";
    }
    if (!name.trim()) {
      newErrors.name = "Введите название модели";
    }

    if (dailyRentalPriceStr && Number(dailyRentalPriceStr) < 0) {
      newErrors.daily = "Цена не может быть отрицательной";
    }
    if (depositAmountStr && Number(depositAmountStr) < 0) {
      newErrors.deposit = "Залог не может быть отрицательным";
    }
    if (purchasePriceStr && Number(purchasePriceStr) < 0) {
      newErrors.purchase = "Стоимость не может быть отрицательной";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.name) {
        nameInputRef.current?.focus();
      }
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    const trimmed = name.trim();
    const dailyRentalPrice = dailyRentalPriceStr ? Number(dailyRentalPriceStr) : 0;
    const depositAmount = depositAmountStr ? Number(depositAmountStr) : 0;
    const purchasePrice = purchasePriceStr ? Number(purchasePriceStr) : 0;

    setLoading(true);
    try {
      if (isEditMode && id) {
        await templatesAPI.update(id, {
          name: trimmed,
          categoryId: categoryId!,
          dailyRentalPrice,
          depositAmount,
          purchasePrice,
        });
        toast.success(`Модель «${trimmed}» успешно обновлена`);
        navigate(-1);
      } else {
        await templatesAPI.create({
          name: trimmed,
          categoryId: categoryId!,
          dailyRentalPrice,
          depositAmount,
          purchasePrice,
        });
        toast.success(`Модель «${trimmed}» успешно создана`);
        navigate(-1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка сохранения модели";
      setServerError(msg);
      setLoading(false);
    }
  };

  return (
    <Layout
      breadcrumbs={[
        { label: "Инвентарь", path: "/tools" },
        { label: isEditMode ? "Редактирование модели" : "Новая модель" },
      ]}
    >
      <div className="tools-page">
        <button
          type="button"
          className="back-button-link"
          onClick={handleBack}
          aria-label="Вернуться назад"
        >
          ← Назад
        </button>

        <h1 className="tools-page-title" style={{ marginBottom: 20 }}>
          {isEditMode ? "Изменить модель инструмента" : "Создать модель инструмента"}
        </h1>

        <ErrorMessage error={serverError} onClose={() => setServerError(null)} />

        {loadingData ? (
          <div className="tools-skeleton-card" style={{ maxWidth: 580, marginTop: 16 }}>
            <div className="skeleton-cell" style={{ height: 20, width: "35%", marginBottom: 16 }} />
            <div className="skeleton-cell" style={{ height: 44, width: "100%", marginBottom: 20 }} />
            <div className="skeleton-cell" style={{ height: 20, width: "40%", marginBottom: 16 }} />
            <div className="skeleton-cell" style={{ height: 44, width: "100%", marginBottom: 20 }} />
            <div className="skeleton-cell" style={{ height: 90, width: "100%", borderRadius: 12 }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ maxWidth: 580, marginTop: 12 }} noValidate>
            <FormField label="Категория" required error={errors.categoryId}>
              {(a11y) => (
                <StyledSelect
                  inputId={a11y.id}
                  isInvalid={Boolean(errors.categoryId)}
                  options={categories.map((cat) => ({ value: cat.id, label: cat.name }))}
                  value={categoryId ?? ""}
                  onChange={(val) => {
                    setCategoryId(val ? String(val) : undefined);
                    if (errors.categoryId) {
                      setErrors((prev) => ({ ...prev, categoryId: "" }));
                    }
                  }}
                  isDisabled={loading || loadingCategories}
                  placeholder={
                    loadingCategories ? "Загрузка категорий..." : "Выберите категорию"
                  }
                  isClearable
                />
              )}
            </FormField>

            <FormField
              label="Название модели"
              required
              error={errors.name}
              hint="Например: Перфоратор Bosch GBH 2-26 DFR"
            >
              {(a11y) => (
                <input
                  {...a11y}
                  ref={nameInputRef}
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: "" }));
                    }
                  }}
                  placeholder="Введите полное наименование модели"
                  disabled={loading}
                />
              )}
            </FormField>

            <div className="form-section-card" style={{ marginTop: 24, padding: "20px 22px" }}>
              <div className="form-section-title">
                <span>💰 Тарифы и стоимость</span>
              </div>

              <div className="form-row">
                <FormField
                  label="Цена за сутки"
                  error={errors.daily}
                  hint="Суточный тариф"
                >
                  {(a11y) => (
                    <div className="input-with-suffix">
                      <input
                        {...a11y}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        className="form-input"
                        value={dailyRentalPriceStr}
                        onChange={(e) => setDailyRentalPriceStr(e.target.value)}
                        placeholder="0"
                        disabled={loading}
                      />
                      <span className="input-suffix">сом</span>
                    </div>
                  )}
                </FormField>

                <FormField
                  label="Сумма залога"
                  error={errors.deposit}
                  hint="Возвращается клиенту"
                >
                  {(a11y) => (
                    <div className="input-with-suffix">
                      <input
                        {...a11y}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        className="form-input"
                        value={depositAmountStr}
                        onChange={(e) => setDepositAmountStr(e.target.value)}
                        placeholder="0"
                        disabled={loading}
                      />
                      <span className="input-suffix">сом</span>
                    </div>
                  )}
                </FormField>

                <FormField
                  label="Стоимость инструмента"
                  error={errors.purchase}
                  hint="Балансовая стоимость"
                >
                  {(a11y) => (
                    <div className="input-with-suffix">
                      <input
                        {...a11y}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        className="form-input"
                        value={purchasePriceStr}
                        onChange={(e) => setPurchasePriceStr(e.target.value)}
                        placeholder="0"
                        disabled={loading}
                      />
                      <span className="input-suffix">сом</span>
                    </div>
                  )}
                </FormField>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading
                  ? "Сохранение..."
                  : isEditMode
                  ? "Сохранить изменения"
                  : "Создать модель"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={loading}
                onClick={handleBack}
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
