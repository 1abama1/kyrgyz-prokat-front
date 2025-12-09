import { FC, useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { toolsAPI } from "../api/tools";
import { categoriesAPI } from "../api/categories";
import { templatesAPI } from "../api/templates";
import { ToolCategory } from "../types/tool.types";
import { ToolTemplate } from "../types/tool.types";
import { CreateToolDto } from "../types/dto/createTool.dto";
import { ErrorMessage } from "../components/ErrorMessage";

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
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [templateId, setTemplateId] = useState<number | undefined>();
  
  // Новые поля
  const [name, setName] = useState("");
  const [inventoryNumber, setInventoryNumber] = useState("");
  const [article, setArticle] = useState("");
  const [deposit, setDeposit] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [dailyPrice, setDailyPrice] = useState<number>(0);

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
      const id = Number(templateIdParam);
      if (!isNaN(id) && id > 0) {
        // Если категория уже известна из query — просто ставим шаблон
        const categoryIdParam = searchParams.get("categoryId");
        const parsedCat = categoryIdParam ? Number(categoryIdParam) : undefined;

        if (parsedCat && !isNaN(parsedCat) && parsedCat > 0) {
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
      const parsed = Number(categoryIdParam);
      if (!isNaN(parsed) && parsed > 0) {
        setCategoryId(parsed);
      }
    }
  }, [searchParams, isEdit]);

  // Подтягиваем данные при редактировании
  useEffect(() => {
    if (!isEdit || !id) return;

    const toolId = Number(id);
    if (isNaN(toolId) || toolId <= 0) {
      setError("Неверный ID инструмента");
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    toolsAPI.getOne(toolId)
      .then((tool) => {
        setCategoryId(tool.categoryId);
        setTemplateId(tool.templateId);
        setName(tool.name || "");
        setInventoryNumber(tool.inventoryNumber || "");
        setArticle(tool.article || "");
        setDeposit(tool.deposit || 0);
        setPurchasePrice(tool.purchasePrice || 0);
        setDailyPrice(tool.dailyPrice || 0);
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

    if (!templateId || !name || !inventoryNumber) {
      setError("Заполните обязательные поля: категория, модель, название и инвентарный номер");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const toolData: CreateToolDto = {
        templateId,
        name,
        inventoryNumber,
        article,
        deposit,
        purchasePrice,
        dailyPrice,
      };

      if (isEdit && id) {
        // Для редактирования используем update (если он поддерживает новую структуру)
        // Пока что просто создаём новый, так как update может не поддерживать новую структуру
        setError("Редактирование пока не поддерживается для новой структуры");
        return;
      } else {
        await toolsAPI.create(toolData);
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

      <form onSubmit={handleSubmit} style={{ maxWidth: 600, marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Категория <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={categoryId ?? ""}
            onChange={(e) => {
              const newCategoryId = e.target.value ? Number(e.target.value) : undefined;
              setCategoryId(newCategoryId);
              setTemplateId(undefined); // Сбрасываем модель при смене категории
            }}
            required
            disabled={loadingData}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14,
              background: loadingData ? "#f3f4f6" : "white",
              cursor: loadingData ? "not-allowed" : "pointer"
            }}
          >
            <option value="">Выберите категорию</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Модель <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={templateId ?? ""}
            onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : undefined)}
            required
            disabled={!categoryId || loadingData}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: 14,
              background: !categoryId || loadingData ? "#f3f4f6" : "white",
              cursor: !categoryId || loadingData ? "not-allowed" : "pointer"
            }}
          >
            <option value="">
              {!categoryId ? "Сначала выберите категорию" : "Выберите модель"}
            </option>
            {templates.map(tmpl => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </option>
            ))}
          </select>
        </div>

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
