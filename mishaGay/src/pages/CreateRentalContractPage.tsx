import { FC, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { clientsAPI } from "../api/clients";
import { toolsAPI } from "../api/tools";
import { contractsAPI } from "../api/contracts";
import { Client } from "../types/client.types";
import { Tool } from "../types/tool.types";
import { ErrorMessage } from "../components/ErrorMessage";
import "../styles/create-rental.css";

export const CreateRentalContractPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<Client[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);

  const [clientId, setClientId] = useState<number | "">("");
  const [toolId, setToolId] = useState<number | "">("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientsAPI.getAll().then(setClients).catch(err => setError(err.message || "Ошибка загрузки клиентов"));
    // Используем только доступные для аренды инструменты
    toolsAPI.getAvailable().then(setTools).catch(err => setError(err.message || "Ошибка загрузки инструментов"));
  }, []);

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

  const onCreate = async () => {
    if (!clientId || !toolId || !expectedReturnDate || !totalAmount) {
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

