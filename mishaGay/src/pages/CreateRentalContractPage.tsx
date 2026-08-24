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
import { StyledSelect } from "../components/StyledSelect";
import { useClientCheck } from "../hooks/useClientCheck";
import { ProblemClientWarning } from "../components/ProblemClientWarning";
import { matchPhone } from "../utils/phoneMatch";
import "../styles/create-rental.css";

export const CreateRentalContractPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  
  // Новая архитектура: Категория → Модель → Экземпляр
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [categoryId, setCategoryId] = useState<string | "">("");
  
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string | "">("");
  
  const [tools, setTools] = useState<ToolInstance[]>([]);
  const [toolId, setToolId] = useState<number | null>(null);
  const [selectedTools, setSelectedTools] = useState<ToolInstance[]>([]);

  const [clientId, setClientId] = useState<string | "">("");

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
      templatesAPI.getByCategory(categoryId)
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
      templatesAPI.getFull(templateId)
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
      setClientId(clientIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setWarningAccepted(false);
  }, [clientId]);

  const selectedClient = clients.find(c => String(c.id) === clientId);
  const clientCheck = useClientCheck(selectedClient);


  const onCreate = async () => {
    if (!clientId || selectedTools.length === 0) {
      setError("Заполните все обязательные поля (выберите клиента и добавьте минимум один инструмент)");
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
        toolIds: selectedTools.map(t => t.id),
      });

      navigate("/contracts/active");
    } catch (e: any) {
      // Улучшенная обработка ошибок
      const errorMessage = e?.message || e?.error || "Ошибка создания договора";
      
      if (errorMessage.includes("contract_number") || errorMessage.includes("уже существует")) {
        setError("Договор с таким номером уже существует. Пожалуйста, используйте другой номер.");
      } else if (errorMessage.includes("занят") || errorMessage.includes("Инструмент занят") || errorMessage.includes("RENTED")) {
        setError("Один из инструментов уже в аренде. Удалите его из списка и выберите другой.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = () => {
    if (!toolId) return;
    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;
    if (selectedTools.find(t => t.id === tool.id)) {
        setError("Этот инструмент уже добавлен");
        return;
    }
    if (selectedTools.length >= 10) {
        setError("Максимум 10 инструментов в одном договоре");
        return;
    }
    setSelectedTools([...selectedTools, tool]);
    setCategoryId("");
    setTemplateId("");
    setToolId(null);
    setError(null);
  };

  const handleRemoveTool = (id: number) => {
    setSelectedTools(selectedTools.filter(t => t.id !== id));
  };

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: `${c.fullName}${c.whatsappPhone ? ` (${c.whatsappPhone})` : ""}`
  }));

  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }));

  const templateOptions = templates.map(tmpl => ({
    value: tmpl.id,
    label: tmpl.name
  }));

  const clientFilterOption = (option: { label: string; value: string | number; data: any }, inputValue: string) => {
    if (!inputValue) return true;
    if (option.label.toLowerCase().includes(inputValue.toLowerCase())) return true;
    
    const client = clients.find(c => c.id === option.value);
    if (client) {
      if (matchPhone(client.whatsappPhone, inputValue)) return true;
      if (matchPhone(client.additionalPhone, inputValue)) return true;
    }
    
    return false;
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
          <div style={{ marginBottom: 16 }}>
            <StyledSelect
              options={clientOptions}
              value={clientId}
              onChange={(val) => setClientId(val ? String(val) : "")}
              placeholder="Выберите клиента"
              isClearable
              noOptionsMessage="Клиенты не найдены"
              filterOption={clientFilterOption}
            />
          </div>

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

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Выбранные инструменты ({selectedTools.length}/10)</h3>
            {selectedTools.length === 0 ? (
                <div style={{ color: "#64748B", fontSize: 14, fontStyle: "italic", marginBottom: 12 }}>
                    Пока не добавлено ни одного инструмента
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {selectedTools.map(t => (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{t.name} (№{t.instanceNumber ?? t.id})</div>
                                <div style={{ fontSize: 12, color: "#64748B" }}>ИНВ: {t.inventoryNumber} | {t.dailyRentalPrice ?? t.dailyPrice} с/сутки</div>
                            </div>
                            <button 
                              onClick={() => handleRemoveTool(t.id)} 
                              style={{ padding: "6px 12px", background: "#FEE2E2", color: "#DC2626", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "background 0.2s" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#FCA5A5"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "#FEE2E2"}
                            >
                              Удалить
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedTools.length < 10 && (
                <div style={{ padding: 16, background: "#F1F5F9", borderRadius: 8, border: "1px dashed #CBD5E1" }}>
                    <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#334155" }}>Добавить инструмент</h4>
                    <label>Категория</label>
                    <div style={{ marginBottom: 16 }}>
                        <StyledSelect
                        options={categoryOptions}
                        value={categoryId}
                        onChange={(val) => setCategoryId(val ? String(val) : "")}
                        placeholder="Выберите категорию"
                        isClearable
                        noOptionsMessage="Категории не найдены"
                        />
                    </div>

                    {categoryId && (
                        <>
                        <label>Модель</label>
                        <div style={{ marginBottom: 16 }}>
                            <StyledSelect
                            options={templateOptions}
                            value={templateId}
                            onChange={(val) => setTemplateId(val ? String(val) : "")}
                            placeholder="Выберите модель"
                            isDisabled={!categoryId}
                            isClearable
                            noOptionsMessage="Модели не найдены"
                            />
                        </div>
                        </>
                    )}

                    {templateId && (
                        <>
                        <label>Экземпляр инструмента</label>
                        <div style={{ marginBottom: 16 }}>
                            <ToolInstanceSelect
                            tools={tools}
                            value={toolId}
                            onChange={setToolId}
                            placeholder={tools.length === 0 ? "Нет экземпляров" : "Выберите экземпляр"}
                            />
                        </div>
                        {templateId && tools.length === 0 && (
                            <div className="no-tools-warning">
                            ⚠ Нет экземпляров для выбранной модели
                            </div>
                        )}
                        </>
                    )}

                    <button 
                        disabled={!toolId} 
                        onClick={handleAddTool}
                        style={{ width: "100%", padding: "10px", background: toolId ? "#3B82F6" : "#E2E8F0", color: toolId ? "#fff" : "#94A3B8", border: "none", borderRadius: 6, cursor: toolId ? "pointer" : "not-allowed", fontWeight: 600, transition: "background 0.2s" }}
                    >
                        Добавить к договору
                    </button>
                </div>
            )}
          </div>

          <button
            className="submit-btn"
            disabled={
              loading ||
              !clientCheck.allowed ||
              (!!clientCheck.warning && !warningAccepted) ||
              selectedTools.length === 0
            }
            onClick={onCreate}
            style={{ width: "100%", padding: 14, fontSize: 16, marginTop: 16 }}
          >
            {loading ? "Создание..." : "Создать договор"}
          </button>
        </div>
      </div>
    </Layout>
  );
};
