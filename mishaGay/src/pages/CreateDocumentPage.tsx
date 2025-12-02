import { FC, useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { toolsAPI } from "../api/tools";
import { contractsAPI, CreateContractPayload } from "../api/contracts";
import { Client, ClientCard } from "../types/client.types";
import { Tool } from "../types/tool.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { generateContractNumber } from "../utils/formatters";
import "../styles/create-rental.css";

export const CreateDocumentPage: FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Tool[]>([]);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientCard, setClientCard] = useState<ClientCard | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | "">("");
  const [selectedTool, setSelectedTool] = useState<number | "">("");
  const [contractNumber, setContractNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

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
        toolsAPI.getAll()
      ]);

      setClients(clientsData);
      setTemplates(templateData);
      
      // Автогенерация номера договора при загрузке
      setContractNumber(generateContractNumber());
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (id: number) => {
    setSelectedTemplate(id);
    setSelectedTool("");
    setAvailableTools([]);

    if (!id) return;
    try {
      setError(null);
      const free = await toolsAPI.getAvailableByTemplate(id);
      setAvailableTools(free);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки доступных инструментов");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedClient || !selectedTemplate || !selectedTool || !contractNumber || !totalAmount || !expectedReturnDate) {
      setError("Все поля обязательны");
      return;
    }

    const amount = Number(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Сумма должна быть положительным числом");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await contractsAPI.createContract({
        clientId: selectedClient.id,
        toolId: Number(selectedTool),
        contractNumber,
        expectedReturnDate,
        totalAmount: amount
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

  return (
    <Layout>
      <button
        onClick={() => navigate("/documents")}
        style={{
          marginBottom: "20px",
          padding: "8px 16px",
          background: "#757575",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        ← Назад к списку
      </button>

      <h1>Создание договора</h1>

      {clientCard && (
        <div className="client-card">
          <strong>{clientCard.fullName}</strong>
          <div>Тел: {clientCard.phone || "—"}</div>
          <div>Email: {clientCard.email || "—"}</div>
          <div>Тег: {clientCard.tag || "—"}</div>
        </div>
      )}

      <ErrorMessage error={error} onClose={() => setError(null)} />

      <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 16 }}>
          <label>Клиент:</label>
          <select
            value={selectedClient?.id || ""}
            onChange={async (e) => {
              const id = Number(e.target.value);
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
            }}
            required
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Выберите клиента</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.fullName} — {client.phone}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Модель (шаблон) инструмента:</label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(Number(e.target.value))}
            required
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Выберите модель</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.categoryName})
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Конкретный инструмент:</label>
          <select
            value={selectedTool}
            disabled={availableTools.length === 0}
            onChange={(e) => setSelectedTool(Number(e.target.value))}
            required
            style={{ width: "100%", padding: 8 }}
          >
            <option value="">Выберите инструмент</option>
            {availableTools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.name} — SN: {tool.serialNumber}
              </option>
            ))}
          </select>

          {selectedTemplate && availableTools.length === 0 && (
            <div style={{ color: "red", marginTop: 5 }}>
              Нет свободных инструментов этой модели 😢
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>
            Номер договора:
            <button
              type="button"
              onClick={() => setContractNumber(generateContractNumber())}
              style={{
                marginLeft: 8,
                padding: "4px 8px",
                fontSize: 12,
                background: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: 4,
                cursor: "pointer"
              }}
              title="Сгенерировать новый номер"
            >
              🔄
            </button>
          </label>
          <input
            type="text"
            value={contractNumber}
            onChange={(e) => setContractNumber(e.target.value)}
            placeholder="Например: R-2025-11-30-123"
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Плановая дата возврата:</label>
          <input
            type="date"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Сумма аренды:</label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            min={0}
            step={100}
            required
            style={{ width: "100%", padding: 8 }}
            placeholder="1500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            background: "#1976d2",
            color: "white",
            borderRadius: 4,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Создание..." : "Создать договор"}
        </button>
      </form>
    </Layout>
  );
};

