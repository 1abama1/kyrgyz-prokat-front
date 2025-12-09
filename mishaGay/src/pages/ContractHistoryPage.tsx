import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { contractsAPI } from "../api/contracts";
import { ErrorMessage } from "../components/ErrorMessage";

interface HistoryRow {
  id: number;
  clientName: string;
  toolName?: string;
  startDateTime?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string | null;
  status?: string;
  amount?: number | null;
}

export const ContractHistoryPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const numericId = id ? Number(id) : undefined;
    if (id && (isNaN(Number(id)) || Number(id) <= 0)) {
      setError("Некорректный id договора");
      setLoading(false);
      return;
    }
    loadHistory(numericId);
  }, [id]);

  const loadHistory = async (contractId?: number) => {
    try {
      setLoading(true);
      setError(null);

      let toolId: number | undefined = undefined;
      if (contractId) {
        try {
          const contract = await contractsAPI.getById(contractId);
          toolId = contract?.toolId;
        } catch (e) {
          console.warn("Не удалось получить договор, загружаем общую историю", e);
        }
      }

      const historyData = await contractsAPI.getHistoryTable(toolId);
      setHistory(historyData || []);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки истории");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleString();
  };

  if (loading) {
    return (
      <Layout>
        <div className="tools-loading">
          <p>Загрузка истории...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tools-page">
        <button
          className="btn-small"
          type="button"
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
        >
          ← Назад
        </button>

        <h1 className="tools-page-title">История аренды инструмента</h1>
        <ErrorMessage error={error} onClose={() => setError(null)} />

        {history.length === 0 ? (
          <div className="tools-empty">
            <p>История пуста</p>
          </div>
        ) : (
          <div className="active-contracts-table-wrapper">
            <table className="active-contracts-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Клиент</th>
                  <th>Инструмент</th>
                  <th>Дата выдачи</th>
                  <th>Ожидаемая сдача</th>
                  <th>Фактическая сдача</th>
                  <th>Статус</th>
                  <th>Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.clientName}</td>
                    <td>{item.toolName ?? "—"}</td>
                    <td>{formatDate(item.startDateTime)}</td>
                    <td>{formatDate(item.expectedReturnDate)}</td>
                    <td>{formatDate(item.actualReturnDate)}</td>
                    <td>{item.status ?? "—"}</td>
                    <td>{item.amount ?? 0} c</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

