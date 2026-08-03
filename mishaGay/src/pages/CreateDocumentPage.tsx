import { FC, useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { templatesAPI } from "../api/templates";
import { contractsAPI } from "../api/contracts";
import { Client, ClientCard } from "../types/client.types";
import { ToolInstance } from "../types/tool.types";
import { ToolTemplate } from "../types/template.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { StyledSelect } from "../components/StyledSelect";
import "../styles/create-rental.css";

export const CreateDocumentPage: FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<ToolTemplate[]>([]);
  const [availableTools, setAvailableTools] = useState<ToolInstance[]>([]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientCard, setClientCard] = useState<ClientCard | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | "">("");
  const [selectedTool, setSelectedTool] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      setLoading(true);
      const [clientsData, templateData] = await Promise.all([
        clientsAPI.getAll(),
        templatesAPI.getAll()
      ]);

      setClients(clientsData);
      setTemplates(templateData);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (id: number | string | null) => {
    const numId = id ? Number(id) : "";
    setSelectedTemplate(numId);
    setSelectedTool("");
    setAvailableTools([]);

    if (!numId) return;
    try {
      setError(null);
      const free = await contractsAPI.getAvailableTools(Number(numId));
      setAvailableTools(free);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки доступных инструментов");
    }
  };

  const handleClientSelect = async (val: number | string | null) => {
    const id = val ? Number(val) : 0;
    const client = clients.find(c => c.id === id) || null;
    setSelectedClient(client);

    if (!id) {
      setClientCard(null);
      return;
    }

    try {
      setError(null);
      const card = await clientsAPI.getCard(id);
      setClientCard(card);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки карточки клиента");
      setClientCard(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedClient || !selectedTemplate || !selectedTool) {
      setError("Все поля обязательны");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await contractsAPI.createContract({
        clientId: selectedClient.id,
        toolId: Number(selectedTool)
      });

      navigate("/documents");
    } catch (err: any) {
      // Улучшенная обработка ошибок
      const errorMessage = err?.message || err?.error || "Ошибка создания договора";
      
      if (errorMessage.includes("contract_number") || errorMessage.includes("уже существует")) {
        setError("Договор с таким номером уже существует. Пожалуйста, используйте другой номер.");
      } else if (errorMessage.includes("занят") || errorMessage.includes("Инструмент занят")) {
        setError("Этот инструмент уже в аренде. Выберите другой инструмент.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const clientOptions = clients.map(c => ({
    value: c.id,
    label: `${c.fullName} — ${c.phone}`
  }));

  const templateOptions = templates.map(t => ({
    value: t.id,
    label: t.name
  }));

  const toolOptions = availableTools.map(tool => ({
    value: tool.id,
    label: `${tool.name} — ${tool.inventoryNumber}`
  }));

  return (
    <Layout>
      <div className="rental-page">
        <div className="rental-left">
          <h1>Создание договора</h1>

          {clientCard && (
            <div className="client-card">
              <strong>{clientCard.fullName}</strong>
              <div>Тел: {clientCard.phone || "—"}</div>
              <div>Тег: {clientCard.tag || "—"}</div>
            </div>
          )}

          <ErrorMessage error={error} onClose={() => setError(null)} />

          <form onSubmit={handleSubmit}>
            <label>Клиент</label>
            <div style={{ marginBottom: 16 }}>
              <StyledSelect
                options={clientOptions}
                value={selectedClient?.id || ""}
                onChange={handleClientSelect}
                placeholder="Выберите клиента"
                isClearable
                noOptionsMessage="Клиенты не найдены"
              />
            </div>

            <label>Модель (шаблон) инструмента</label>
            <div style={{ marginBottom: 16 }}>
              <StyledSelect
                options={templateOptions}
                value={selectedTemplate}
                onChange={handleTemplateSelect}
                placeholder="Выберите модель"
                isClearable
                noOptionsMessage="Модели не найдены"
              />
            </div>

            <label>Конкретный инструмент</label>
            <div style={{ marginBottom: 16 }}>
              <StyledSelect
                options={toolOptions}
                value={selectedTool}
                onChange={(val) => setSelectedTool(val ? Number(val) : "")}
                placeholder="Выберите инструмент"
                isDisabled={availableTools.length === 0}
                isClearable
                noOptionsMessage="Инструменты не найдены"
              />
            </div>

            {selectedTemplate && availableTools.length === 0 && (
              <div className="no-tools-warning">
                ⚠ Нет свободных инструментов этой модели
              </div>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Создание..." : "Создать договор"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
};
