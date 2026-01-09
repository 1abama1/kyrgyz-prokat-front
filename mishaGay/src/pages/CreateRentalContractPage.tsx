import { FC, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { categoriesAPI } from "../api/categories";
import { templatesAPI } from "../api/templates";
import { contractsAPI } from "../api/contracts";
import { Client } from "../types/client.types";
import { ToolInstance } from "../types/tool.types";
import { ToolCategory } from "../types/category.types";
import { ToolTemplate } from "../types/template.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { ToolInstanceSelect } from "../components/ToolInstanceSelect";
import { useClientCheck } from "../hooks/useClientCheck";
import { ProblemClientWarning } from "../components/ProblemClientWarning";
import "../styles/create-rental.css";

export const CreateRentalContractPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  
  // Новая архитектура: Категория → Модель → Экземпляр
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [templateId, setTemplateId] = useState<number | "">("");
  
  const [tools, setTools] = useState<ToolInstance[]>([]);
  const [toolId, setToolId] = useState<number | null>(null);

  const [clientId, setClientId] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warningAccepted, setWarningAccepted] = useState(false);

  // Загрузка клиентов и категорий при монтировании
  useEffect(() => {
    clientsAPI.getAll().then(setClients).catch(err => setError(err.message || "Ошибка загрузки клиентов"));
    categoriesAPI.getAll().then(setCategories).catch(err => setError(err.message || "Ошибка загрузки категорий"));
  }, []);

  // Загрузка моделей при выборе категории
  useEffect(() => {
    if (categoryId) {
      templatesAPI.getByCategory(Number(categoryId))
        .then(setTemplates)
        .catch(err => {
          setError(err.message || "Ошибка загрузки моделей");
        });
      // Сброс выбранной модели и инструмента
      setTemplateId("");
      setToolId(null);
      setTools([]);
    } else {
      setTemplates([]);
      setTemplateId("");
      setToolId(null);
      setTools([]);
    }
  }, [categoryId]);

  // Загрузка экземпляров при выборе модели (все статусы)
  useEffect(() => {
    if (templateId) {
      templatesAPI.getFull(Number(templateId))
        .then((fullTemplate) => setTools(fullTemplate.tools ?? []))
        .catch(err => {
          setError(err.message || "Ошибка загрузки инструментов");
        });
      // Сброс выбранного инструмента
      setToolId(null);
    } else {
      setTools([]);
      setToolId(null);
    }
  }, [templateId]);

  // Автоматически выбираем клиента из URL параметра
  useEffect(() => {
    const clientIdParam = searchParams.get("clientId");
    if (clientIdParam) {
      const id = Number(clientIdParam);
      if (!isNaN(id) && id > 0) {
        setClientId(id);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    setWarningAccepted(false);
  }, [clientId]);

  const selectedClient = clients.find(c => c.id === Number(clientId));
  const clientCheck = useClientCheck(selectedClient);

  const onCreate = async () => {
    if (!clientId || !categoryId || !templateId || !toolId) {
      setError("Заполните все обязательные поля");
      return;
    }

    if (!clientCheck.allowed) {
      setError(clientCheck.reason || "Этот клиент не может арендовать инструмент");
      return;
    }

    if (clientCheck.warning && !warningAccepted) {
      setError("Подтвердите выдачу проблемному клиенту");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await contractsAPI.createContract({
        clientId: Number(clientId),
        toolId: Number(toolId),
      });

      navigate("/documents");
    } catch (e: any) {
      // Улучшенная обработка ошибок
      const errorMessage = e?.message || e?.error || "Ошибка создания договора";
      
      if (errorMessage.includes("contract_number") || errorMessage.includes("уже существует")) {
        setError("Договор с таким номером уже существует. Пожалуйста, используйте другой номер.");
      } else if (errorMessage.includes("занят") || errorMessage.includes("Инструмент занят") || errorMessage.includes("RENTED")) {
        setError("Этот инструмент уже в аренде. Выберите другой инструмент.");
        // Обновляем список доступных инструментов для выбранной модели
        if (templateId) {
          templatesAPI.getFull(Number(templateId))
            .then(full => setTools(full.tools ?? []))
            .catch(() => {});
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="rental-page">
        <div className="rental-left">
          <h1>Новая аренда</h1>

          <ErrorMessage error={error} onClose={() => setError(null)} />

          {!clientCheck.allowed && (
            <div style={{ marginBottom: 12, color: "#b91c1c", fontWeight: 600 }}>
              {clientCheck.reason}
            </div>
          )}

          <label>Клиент</label>
          <select 
            value={clientId} 
            onChange={e => setClientId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Выберите клиента</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.fullName} {c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>

          {clientCheck.warning && !warningAccepted && (
            <ProblemClientWarning
              open={true}
              onConfirm={() => setWarningAccepted(true)}
              onCancel={() => {
                setClientId("");
                setWarningAccepted(false);
              }}
            />
          )}

          <label>Категория</label>
          <select 
            value={categoryId} 
            onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Выберите категорию</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {categoryId && (
            <>
              <label>Модель</label>
              <select 
                value={templateId} 
                onChange={e => setTemplateId(e.target.value ? Number(e.target.value) : "")}
                disabled={!categoryId}
              >
                <option value="">Выберите модель</option>
                {templates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {templateId && (
            <>
              <label>Экземпляр инструмента</label>
              <ToolInstanceSelect
                tools={tools}
                value={toolId}
                onChange={setToolId}
                placeholder={tools.length === 0 ? "Нет экземпляров" : "Выберите экземпляр"}
              />
              {templateId && tools.length === 0 && (
                <div style={{ marginTop: 6, color: "#dc2626", fontSize: 12 }}>
                  Нет экземпляров для выбранной модели
                </div>
              )}
            </>
          )}

          <button
            disabled={
              loading ||
              !clientCheck.allowed ||
              (!!clientCheck.warning && !warningAccepted)
            }
            onClick={onCreate}
          >
            {loading ? "Создание..." : "Создать договор"}
          </button>
        </div>
      </div>
    </Layout>
  );
};

