import { FC, useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { toolsAPI } from "../api/tools";
import { categoriesAPI } from "../api/categories";
import { templatesAPI } from "../api/templates";
import { ToolCategory } from "../types/tool.types";
import { ToolTemplate } from "../types/tool.types";
import { CreateToolRequest } from "../types/inventory.types";
import { CreateToolBatchRequest } from "../types/inventory.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { StyledSelect } from "../components/StyledSelect";

export const CreateToolPage: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [templateId, setTemplateId] = useState<string | undefined>();
  
  // Новые поля
  const [name, setName] = useState("");
  const [inventoryNumber, setInventoryNumber] = useState("");
  const [article, setArticle] = useState("");
  const [deposit, setDeposit] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [dailyPrice, setDailyPrice] = useState<number>(0);
  
  // Для пакетного создания
  const [isBatch, setIsBatch] = useState(false);
  const [count, setCount] = useState<number>(1);

  // Загружаем категории при монтировании
  useEffect(() => {
    categoriesAPI.getAll()
      .then(setCategories)
      .catch((err: any) => {
        setError(err?.message || "Ошибка загрузки категорий");
      });
  }, []);

  // Подгружаем модели при выборе категории
  useEffect(() => {
    if (!categoryId) {
      setTemplates([]);
      setTemplateId(undefined);
      return;
    }

    templatesAPI.getByCategory(categoryId)
      .then(setTemplates)
      .catch((err: any) => {
        setError(err?.message || "Ошибка загрузки моделей");
      });
  }, [categoryId]);

  // Автоматически выбираем templateId из URL параметра
  useEffect(() => {
    const templateIdParam = searchParams.get("templateId");
    if (templateIdParam && !isEdit) {
      const id = templateIdParam;
      if (id) {
        // Если категория уже известна из query — просто ставим шаблон
        const categoryIdParam = searchParams.get("categoryId");
        const parsedCat = categoryIdParam;

        if (parsedCat) {
          setCategoryId(parsedCat);
          setTemplateId(id);
        } else {
          // Иначе находим категорию по шаблону
          templatesAPI.getAll()
            .then(allTemplates => {
              const template = allTemplates.find(t => t.id === id);
              if (template) {
                setTemplateId(id);
                setCategoryId(template.categoryId);
              }
            })
            .catch((err: any) => {
              console.error("Ошибка загрузки шаблонов:", err);
            });
        }
      }
    }
  }, [searchParams, isEdit]);

  // Автоподстановка категории без выбора модели (если пришли только с categoryId)
  useEffect(() => {
    if (isEdit) return;
    const categoryIdParam = searchParams.get("categoryId");
    if (categoryIdParam) {
      setCategoryId(categoryIdParam);
    }
  }, [searchParams, isEdit]);

  // Подтягиваем данные при редактировании
  useEffect(() => {
    if (!isEdit || !id) return;

    const toolId = Number(id);

    setLoadingData(true);
    toolsAPI.getOne(toolId)
      .then((tool) => {
        setCategoryId(tool.categoryId);
        setTemplateId(tool.templateId);
        setName(tool.name || "");
        setInventoryNumber(tool.inventoryNumber || "");
        setArticle(tool.article || "");
        setDeposit(tool.depositAmount || 0);
        setPurchasePrice(tool.purchasePrice || 0);
        setDailyPrice(tool.dailyRentalPrice || 0);
      })
      .catch((err: any) => {
        setError(err?.message || "Ошибка загрузки данных инструмента");
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateId) {
      setError("Выберите модель");
      return;
    }

    if (!isBatch && (!name || !inventoryNumber)) {
      setError("Заполните обязательные поля: название и инвентарный номер");
      return;
    }

    if (isBatch && count < 1) {
      setError("Количество должно быть больше 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit && id) {
        setError("Редактирование пока не поддерживается для новой структуры");
        return;
      } else {
        if (isBatch) {
          const batchData: CreateToolBatchRequest = {
            templateId,
            count,
          };
          await toolsAPI.createBatch(batchData);
        } else {
          const toolData = {
            templateId,
            name,
            inventoryNumber,
            article,
            deposit,
            purchasePrice,
            dailyPrice,
          } as unknown as CreateToolRequest;
          await toolsAPI.create(toolData);
        }
      }

      navigate("/tools");
    } catch (err: any) {
      setError(err?.message || (isEdit ? "Ошибка обновления инструмента" : "Ошибка создания инструмента"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <h1>{isEdit ? "Редактирование инструмента" : "Создать инструмент"}</h1>
      <ErrorMessage error={error} onClose={() => setError(null)} />

      {loadingData && (
        <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
          Загрузка данных...
        </div>
      )}

      {!isEdit && (
        <div style={{ marginBottom: 20, display: "flex", gap: "10px" }}>
          <button
            onClick={() => setIsBatch(false)}
            style={{
              padding: "8px 16px",
              background: !isBatch ? "#1976d2" : "#f3f4f6",
              color: !isBatch ? "white" : "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            Одиночное создание
          </button>
          <button
            onClick={() => setIsBatch(true)}
            style={{
              padding: "8px 16px",
              background: isBatch ? "#1976d2" : "#f3f4f6",
              color: isBatch ? "white" : "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            Пакетное создание
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 600, marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Категория <span style={{ color: "red" }}>*</span>
          </label>
          <StyledSelect
            options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
            value={categoryId ?? ""}
            onChange={(val) => {
              const newCategoryId = val ? String(val) : undefined;
              setCategoryId(newCategoryId);
              setTemplateId(undefined);
            }}
            isDisabled={loadingData}
            placeholder="Выберите категорию"
            isClearable
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Модель <span style={{ color: "red" }}>*</span>
          </label>
          <StyledSelect
            options={templates.map(tmpl => ({ value: tmpl.id, label: tmpl.name }))}
            value={templateId ?? ""}
            onChange={(val) => setTemplateId(val ? String(val) : undefined)}
            isDisabled={!categoryId || loadingData}
            placeholder={!categoryId ? "Сначала выберите категорию" : "Выберите модель"}
            isClearable
          />
        </div>

        {isBatch ? (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Количество создаваемых инструментов <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              required
              min="1"
              disabled={loadingData}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: 14,
                background: loadingData ? "#f3f4f6" : "white"
              }}
            />
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Название <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loadingData}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: 14,
                  background: loadingData ? "#f3f4f6" : "white"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Инвентарный номер <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                value={inventoryNumber}
                onChange={(e) => setInventoryNumber(e.target.value)}
                required
                disabled={loadingData}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: 14,
                  background: loadingData ? "#f3f4f6" : "white"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Артикул
              </label>
              <input
                type="text"
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                disabled={loadingData}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: 14,
                  background: loadingData ? "#f3f4f6" : "white"
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Цена покупки (сом)
              </label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                min="0"
                step="0.01"
                disabled={loadingData}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: 14,
                  background: loadingData ? "#f3f4f6" : "white"
                }}
              />
            </div>
          </>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Залог (сом)
          </label>
          <input
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(Number(e.target.value))}
            min="0"
            step="0.01"
            disabled={loadingData}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14,
              background: loadingData ? "#f3f4f6" : "white"
            }}
          />
        </div>



        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Дневная цена аренды (сом)
          </label>
          <input
            type="number"
            value={dailyPrice}
            onChange={(e) => setDailyPrice(Number(e.target.value))}
            min="0"
            step="0.01"
            disabled={loadingData}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14,
              background: loadingData ? "#f3f4f6" : "white"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={loading || loadingData}
            style={{
              padding: "10px 20px",
              background: loading || loadingData ? "#9ca3af" : "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading || loadingData ? "not-allowed" : "pointer",
              fontWeight: 500
            }}
          >
            {loading ? (isEdit ? "Сохранение..." : "Создание...") : (isEdit ? "Сохранить" : "Создать")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/tools")}
            style={{
              padding: "10px 20px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            Отмена
          </button>
        </div>
      </form>
    </Layout>
  );
};
