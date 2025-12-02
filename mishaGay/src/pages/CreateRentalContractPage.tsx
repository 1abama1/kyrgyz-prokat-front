import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { toolsAPI } from "../api/tools";
import { contractsAPI } from "../api/contracts";
import { Client } from "../types/client.types";
import { Tool } from "../types/tool.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { generateContractNumber } from "../utils/formatters";
import "../styles/create-rental.css";

export const CreateRentalContractPage: FC = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);

  const [clientId, setClientId] = useState<number | "">("");
  const [toolId, setToolId] = useState<number | "">("");

  const [contractNumber, setContractNumber] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientsAPI.getAll().then(setClients).catch(err => setError(err.message || "Ошибка загрузки клиентов"));
    toolsAPI.getAll().then(setTools).catch(err => setError(err.message || "Ошибка загрузки инструментов"));
    
    // Автогенерация номера договора при загрузке
    setContractNumber(generateContractNumber());
  }, []);

  const onCreate = async () => {
    if (!clientId || !toolId || !expectedReturnDate || !totalAmount || !contractNumber) {
      setError("Заполните все обязательные поля");
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
        clientId: Number(clientId),
        toolId: Number(toolId),
        contractNumber,
        expectedReturnDate,
        totalAmount: amount
      });

      navigate("/documents");
    } catch (e: any) {
      // Улучшенная обработка ошибок
      const errorMessage = e?.message || e?.error || "Ошибка создания договора";
      
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
      <div className="rental-page">
        <div className="rental-left">
          <h1>Новая аренда</h1>

          <ErrorMessage error={error} onClose={() => setError(null)} />

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

          <label>Инструмент</label>
          <select 
            value={toolId} 
            onChange={e => setToolId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Выберите инструмент</option>
            {tools.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} {t.serialNumber ? `— SN: ${t.serialNumber}` : ""}
              </option>
            ))}
          </select>

          <label>
            Номер договора
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
            value={contractNumber} 
            onChange={e => setContractNumber(e.target.value)} 
            placeholder="Например: R-2025-11-30-123"
          />

          <label>Плановая дата возврата</label>
          <input 
            type="date" 
            value={expectedReturnDate} 
            onChange={e => setExpectedReturnDate(e.target.value)} 
          />

          <label>Сумма аренды</label>
          <input 
            type="number"
            value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)}
            placeholder="1500"
            min="0"
            step="100"
          />

          <button disabled={loading} onClick={onCreate}>
            {loading ? "Создание..." : "Создать договор"}
          </button>
        </div>
      </div>
    </Layout>
  );
};

