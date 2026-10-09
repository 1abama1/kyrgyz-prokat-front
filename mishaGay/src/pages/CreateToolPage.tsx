import { FC, useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { toolsAPI } from "../api/tools";
import { categoriesAPI } from "../api/categories";
import { templatesAPI } from "../api/templates";
import { ToolCategory, ToolTemplate } from "../types/tool.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { StyledSelect, SelectOption, SelectGroup } from "../components/StyledSelect";
import { FormField } from "../components/FormField";
import { useToast } from "../hooks/useToast";
import "../styles/tools.css";
import "../styles/forms.css";

export const CreateToolPage: FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const inventoryNumberInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(Boolean(isEdit && id));
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [allTemplates, setAllTemplates] = useState<ToolTemplate[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>(
    () => searchParams.get("categoryId") || undefined
  );
  const [templateId, setTemplateId] = useState<string | undefined>(
    () => searchParams.get("templateId") || undefined
  );

  // Поля одиночного инструмента
  const [name, setName] = useState("");
  const [inventoryNumber, setInventoryNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  // Режим: одиночное или пакетное
  const [isBatch, setIsBatch] = useState(false);
  const [count, setCount] = useState<number>(1);

  // Загрузка категорий и шаблонов
  useEffect(() => {
    Promise.all([categoriesAPI.getAll(), templatesAPI.getAll()])
      .then(([cats, tmpls]) => {
        setCategories(cats);
        setAllTemplates(tmpls);
        const tplParam = searchParams.get("templateId");
        if (tplParam && !searchParams.get("categoryId")) {
          const found = tmpls.find((t) => String(t.id) === String(tplParam));
          if (found?.categoryId) {
            setCategoryId(found.categoryId);
          }
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Ошибка загрузки категорий и моделей";
        setServerError(msg);
      })
      .finally(() => setLoadingCategories(false));
  }, [searchParams]);

  // Выбранная модель
  const selectedTemplate = useMemo(() => {
    if (!templateId) return null;
    return allTemplates.find((t) => String(t.id) === String(templateId)) || null;
  }, [allTemplates, templateId]);

  // Модели, отфильтрованные по выбранной категории (если категория выбрана)
  const availableTemplates = useMemo(() => {
    if (!categoryId) return allTemplates;
    return allTemplates.filter((t) => String(t.categoryId) === String(categoryId));
  }, [allTemplates, categoryId]);

  // Сгруппированные опции моделей для селекта
  const groupedTemplateOptions = useMemo<SelectGroup[]>(() => {
    if (categories.length === 0) return [];
    const catMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));

    const groups: Record<string, SelectOption[]> = {};
    for (const tpl of allTemplates) {
      const cId = tpl.categoryId || "other";
      if (!groups[cId]) groups[cId] = [];
      groups[cId].push({
        value: tpl.id,
        label: tpl.name,
      });
    }

    return Object.entries(groups).map(([catKey, options]) => ({
      label: catMap.get(catKey) || "Категория",
      options,
    }));
  }, [categories, allTemplates]);

  // Подгрузка данных существующего инструмента при редактировании
  useEffect(() => {
    if (!isEdit || !id) return;
    toolsAPI
      .getOne(Number(id))
      .then((tool) => {
        setCategoryId(tool.categoryId);
        setTemplateId(tool.templateId);
        setName(tool.name || "");
        setInventoryNumber(tool.inventoryNumber || "");
        setSerialNumber(tool.serialNumber || "");
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Ошибка загрузки инструмента";
        setServerError(msg);
      })
      .finally(() => setLoadingData(false));
  }, [id, isEdit]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!templateId) {
      newErrors.templateId = "Выберите модель инструмента";
    }

    if (!isBatch) {
      if (!inventoryNumber.trim()) {
        newErrors.inventoryNumber = "Введите инвентарный номер";
      }
    } else {
      if (!count || count < 1) {
        newErrors.count = "Количество должно быть не менее 1";
      } else if (count > 500) {
        newErrors.count = "Максимальное количество для одной партии — 500";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.inventoryNumber) {
        inventoryNumberInputRef.current?.focus();
      }
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (isEdit) return;

    if (!validate()) return;

    setLoading(true);

    try {
      if (isBatch) {
        await toolsAPI.createBatch({
          templateId: templateId!,
          count,
        });
        toast.success(`Партия из ${count} экз. успешно создана`);
      } else {
        await toolsAPI.create({
          templateId: templateId!,
          inventoryNumber: inventoryNumber.trim(),
          serialNumber: serialNumber.trim() || null,
        });
        toast.success(
          `Экземпляр ${name.trim() || selectedTemplate?.name || ""} успешно создан`
        );
      }
      navigate("/tools");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка создания инструмента";
      setServerError(msg);
      setLoading(false);
    }
  };

  return (
    <Layout
      breadcrumbs={[
        { label: "Инвентарь", path: "/tools" },
        { label: isEdit ? "Карточка экземпляра" : "Добавить инструмент" },
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
          {isEdit ? "Экземпляр инструмента" : "Добавить инструмент в инвентарь"}
        </h1>

        <ErrorMessage error={serverError} onClose={() => setServerError(null)} />

        {isEdit && (
          <div className="form-warning-box" style={{ maxWidth: 640 }}>
            <span style={{ fontSize: 18 }} aria-hidden="true">
              ℹ️
            </span>
            <div>
              <strong>Прямое редактирование параметров экземпляра ограничено</strong>
              <p style={{ margin: "4px 0 10px", lineHeight: 1.5 }}>
                В системе ценовые условия (тариф аренды, залог, балансовая стоимость) и базовое
                наименование определяются на уровне модели.
              </p>
              {templateId && (
                <button
                  type="button"
                  className="btn-secondary btn-small"
                  onClick={() => navigate(`/templates/edit/${templateId}`)}
                >
                  Редактировать модель инструмента →
                </button>
              )}
            </div>
          </div>
        )}

        {!isEdit && (
          <div
            className="segmented-control"
            role="tablist"
            aria-label="Режим добавления инструмента"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isBatch}
              className={`segmented-control-btn ${!isBatch ? "active" : ""}`}
              onClick={() => setIsBatch(false)}
            >
              Одиночное создание
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isBatch}
              className={`segmented-control-btn ${isBatch ? "active" : ""}`}
              onClick={() => setIsBatch(true)}
            >
              Пакетное создание (N экз.)
            </button>
          </div>
        )}

        {loadingData ? (
          <div className="tools-skeleton-card" style={{ maxWidth: 620, marginTop: 16 }}>
            <div className="skeleton-cell" style={{ height: 20, width: "30%", marginBottom: 14 }} />
            <div className="skeleton-cell" style={{ height: 44, width: "100%", marginBottom: 18 }} />
            <div className="skeleton-cell" style={{ height: 20, width: "35%", marginBottom: 14 }} />
            <div className="skeleton-cell" style={{ height: 44, width: "100%", marginBottom: 18 }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ maxWidth: 620, marginTop: 8 }} noValidate>
            <div className="form-section-card">
              <div className="form-section-title">
                <span>📦 Выбор модели</span>
              </div>

              {/* Выбор категории для фильтрации */}
              <FormField
                label="Категория"
                hint="Фильтрует список моделей ниже"
              >
                {(a11y) => (
                  <StyledSelect
                    inputId={a11y.id}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    value={categoryId ?? ""}
                    onChange={(val) => {
                      const newCatId = val ? String(val) : undefined;
                      setCategoryId(newCatId);
                      // Если текущая модель не входит в выбранную категорию — сбрасываем
                      if (
                        templateId &&
                        newCatId &&
                        allTemplates.find((t) => String(t.id) === String(templateId))
                          ?.categoryId !== newCatId
                      ) {
                        setTemplateId(undefined);
                      }
                    }}
                    isDisabled={isEdit || loadingCategories}
                    placeholder="Все категории"
                    isClearable
                  />
                )}
              </FormField>

              {/* Выбор модели */}
              <FormField
                label="Модель инструмента"
                required
                error={errors.templateId}
                hint={
                  categoryId && availableTemplates.length === 0
                    ? undefined
                    : "Выберите модель, к которой принадлежит данный инструмент"
                }
              >
                {(a11y) => (
                  <StyledSelect
                    inputId={a11y.id}
                    isInvalid={Boolean(errors.templateId)}
                    options={
                      categoryId
                        ? availableTemplates.map((t) => ({ value: t.id, label: t.name }))
                        : groupedTemplateOptions
                    }
                    value={templateId ?? ""}
                    onChange={(val) => {
                      const newTplId = val ? String(val) : undefined;
                      setTemplateId(newTplId);
                      if (errors.templateId) {
                        setErrors((prev) => ({ ...prev, templateId: "" }));
                      }
                      if (newTplId) {
                        const tpl = allTemplates.find((t) => String(t.id) === String(newTplId));
                        if (tpl?.categoryId && !categoryId) {
                          setCategoryId(tpl.categoryId);
                        }
                        if (!name && tpl?.name) {
                          setName(tpl.name);
                        }
                      }
                    }}
                    isDisabled={isEdit || loadingCategories}
                    placeholder={
                      loadingCategories
                        ? "Загрузка моделей..."
                        : categoryId
                        ? "Выберите модель в выбранной категории"
                        : "Поиск или выбор модели..."
                    }
                    noOptionsMessage={
                      categoryId ? (
                        <span>
                          В этой категории нет моделей.{" "}
                          <a
                            href={`#/templates/create?categoryId=${categoryId}`}
                            style={{ color: "var(--brand)", fontWeight: 600 }}
                          >
                            + Создать модель
                          </a>
                        </span>
                      ) : (
                        "Модели не найдены"
                      )
                    }
                    isClearable
                  />
                )}
              </FormField>

              {/* Информационная карточка тарифов выбранной модели */}
              {selectedTemplate && (
                <div className="form-info-box" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      Тарифы модели «{selectedTemplate.name}»:
                    </div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
                      <span>
                        Аренда:{" "}
                        <strong>{selectedTemplate.dailyRentalPrice ?? 0} сом/сутки</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Залог: <strong>{selectedTemplate.depositAmount ?? 0} сом</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Стоимость: <strong>{selectedTemplate.purchasePrice ?? 0} сом</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Пакетный режим */}
            {isBatch ? (
              <div className="form-section-card">
                <div className="form-section-title">
                  <span>🔢 Параметры партии</span>
                </div>

                <FormField
                  label="Количество экземпляров"
                  required
                  error={errors.count}
                  hint="Экземпляры будут автоматически добавлены и пронумерованы"
                >
                  {(a11y) => (
                    <div>
                      <input
                        {...a11y}
                        type="number"
                        min="1"
                        max="500"
                        className="form-input"
                        value={count}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCount(val);
                          if (errors.count) {
                            setErrors((prev) => ({ ...prev, count: "" }));
                          }
                        }}
                        disabled={loading}
                        style={{ maxWidth: 200 }}
                      />

                      <div className="quick-count-chips">
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => setCount(5)}
                        >
                          5 экз.
                        </button>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => setCount(10)}
                        >
                          10 экз.
                        </button>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => setCount(20)}
                        >
                          20 экз.
                        </button>
                        <button
                          type="button"
                          className="quick-chip"
                          onClick={() => setCount(50)}
                        >
                          50 экз.
                        </button>
                      </div>
                    </div>
                  )}
                </FormField>

                {count > 30 && (
                  <div className="form-warning-box" style={{ marginTop: 12 }}>
                    <span>⚠️</span>
                    <div>
                      Будет создано <strong>{count} экземпляров</strong>. Проверьте правильность
                      числа перед созданием.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Одиночный режим */
              <div className="form-section-card">
                <div className="form-section-title">
                  <span>🏷 Идентификация экземпляра</span>
                </div>

                <FormField
                  label="Инвентарный номер"
                  required
                  error={errors.inventoryNumber}
                  hint="Уникальный штрихкод или инвентарный код на инструменте"
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      ref={inventoryNumberInputRef}
                      type="text"
                      className="form-input"
                      value={inventoryNumber}
                      onChange={(e) => {
                        setInventoryNumber(e.target.value);
                        if (errors.inventoryNumber) {
                          setErrors((prev) => ({ ...prev, inventoryNumber: "" }));
                        }
                      }}
                      placeholder="Например: INV-00421"
                      disabled={isEdit || loading}
                    />
                  )}
                </FormField>

                <FormField
                  label="Серийный номер (S/N)"
                  hint="Заводской серийный номер с шильдика (необязательно)"
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="text"
                      className="form-input"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="Например: SN8392019"
                      disabled={isEdit || loading}
                    />
                  )}
                </FormField>

                <FormField
                  label="Уточняющее название"
                  hint="Отображаемое имя инструмента (по умолчанию берётся из модели)"
                >
                  {(a11y) => (
                    <input
                      {...a11y}
                      type="text"
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={selectedTemplate?.name || "Название инструмента"}
                      disabled={isEdit || loading}
                    />
                  )}
                </FormField>
              </div>
            )}

            {!isEdit && (
              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading
                    ? "Создание..."
                    : isBatch
                    ? `Создать ${count} экз.`
                    : "Создать инструмент"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loading}
                  onClick={() => navigate("/tools")}
                >
                  Отмена
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </Layout>
  );
};
