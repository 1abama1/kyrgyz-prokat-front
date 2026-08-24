import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { DatePicker } from "../components/DatePicker";
import { contractsAPI } from "../api/contracts";
import { ErrorMessage } from "../components/ErrorMessage";
import { formatDate } from "../utils/formatters";
import { statusLabel, statusClass } from "../utils/contractFormat";
import "../styles/contracts.css";

interface HistoryRow {
  id: number;
  offlineId?: string;
  clientName: string;
  toolName?: string;
  startDateTime?: string;
  returnDate?: string | null;
  status?: string;
  amount?: number | null;
}

export const ContractHistoryPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);

  // Helper to format Date to YYYY-MM-DD for the API
  const toYMD = (d: Date | null) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : undefined;

  // Calculate total earned amount
  const totalEarned = history.reduce((sum, item) => sum + (item.amount || 0), 0);

  useEffect(() => {
    const numericId = id ? Number(id) : undefined;
    if (id && (isNaN(Number(id)) || Number(id) <= 0)) {
      setError("Некорректный id договора");
      setLoading(false);
      return;
    }
    loadHistory(numericId);
  }, [id]);

  const loadHistory = async (contractId?: number, from?: string, to?: string) => {
    try {
      setLoading(true);
      setError(null);
      setIsFiltered(!!from || !!to);

      let toolId: number | undefined = undefined;
      if (contractId) {
        try {
          const contract = await contractsAPI.getById(contractId);
          toolId = contract?.toolId;
        } catch (e) {
          console.warn("Не удалось получить договор, загружаем общую историю", e);
        }
      }

      const historyData = await contractsAPI.getHistoryTable(toolId, from, to);
      const normalized: HistoryRow[] = (historyData || []).map((item: any) => ({
        id: item.id ?? item.contractId ?? 0,
        offlineId: item.offlineId,
        clientName: item.clientName ?? "",
        toolName: item.toolName ?? "",
        startDateTime: item.startDateTime ?? item.startDate ?? "",
        returnDate: item.returnDate ?? item.endDate ?? null,
        status: item.status ?? "",
        amount: typeof item.amount === "number" ? item.amount : (typeof item.balance === "number" ? item.balance : null),
      }));
      setHistory(normalized);
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки истории");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    return formatDate(value);
  };

  const handleRestore = async (contractId: number) => {
    if (!window.confirm("Восстановить договор и вернуть инструмент?")) return;

    try {
      await contractsAPI.restore(contractId);
      // Перезагружаем историю после восстановления
      const numericId = id ? Number(id) : undefined;
      await loadHistory(numericId, toYMD(startDate), toYMD(endDate));
    } catch (e: any) {
      alert(e?.message || "Ошибка восстановления договора");
    }
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

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const formatted = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    if (date.toDateString() === today.toDateString()) {
      return `Сегодня (${formatted})`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Вчера (${formatted})`;
    }
    return formatted;
  };

  // Group history by date (using returnDate if closed, otherwise startDateTime)
  const groupedHistory = history.reduce((acc, item) => {
    const rawDate = item.returnDate || item.startDateTime || "";
    // extract YYYY-MM-DD
    const dateStr = rawDate.split("T")[0] || new Date().toISOString().split("T")[0];

    if (!acc[dateStr]) {
      acc[dateStr] = {
        date: dateStr,
        items: [],
        totalEarned: 0
      };
    }
    acc[dateStr].items.push(item);
    acc[dateStr].totalEarned += (item.amount || 0);
    return acc;
  }, {} as Record<string, { date: string; items: HistoryRow[]; totalEarned: number; }>);

  // Sort groups descending
  const sortedGroups = Object.values(groupedHistory).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <Layout>
      <div className="tools-page">
        {/* <button
          className="btn-small"
          type="button"
          onClick={() => navigate(-1)}
          style={{ marginBottom: 16 }}
        >
          ← Назад
        </button> */}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <h1 className="tools-page-title" style={{ margin: 0 }}>История аренды инструмента</h1>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
            <div style={{ width: 160 }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#6b7280", fontWeight: 500 }}>С даты</label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Не выбрано"
              />
            </div>
            <div style={{ width: 160 }}>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: "#6b7280", fontWeight: 500 }}>По дату</label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Не выбрано"
                minDate={startDate || undefined}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => loadHistory(id ? Number(id) : undefined, toYMD(startDate), toYMD(endDate))}
              style={{ padding: "9px 16px", height: 44 }}
            >
              Фильтровать
            </button>
          </div>
        </div>

        {isFiltered && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px 24px", borderRadius: 8, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, color: "#166534" }}>Общий итог за выбранный период:</span>
            <span style={{ fontSize: 24, fontWeight: "bold", color: "#166534" }}>{totalEarned} сом</span>
          </div>
        )}

        <ErrorMessage error={error} onClose={() => setError(null)} />

        {history.length === 0 ? (
          <div className="tools-empty">
            <p>История пуста</p>
          </div>
        ) : (
          <div className="history-grouped-wrapper">
            {sortedGroups.map((group) => (
              <div key={group.date} style={{ marginBottom: 32, background: "#fff", padding: 24, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", paddingBottom: 12, marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#111827" }}>
                    {getDateLabel(group.date)}
                  </h3>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>
                    Договоров: {group.items.length}
                  </div>
                </div>

                <div className="active-contracts-table-wrapper" style={{ marginBottom: 16, border: "none" }}>
                  <table className="active-contracts-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>ID</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>Клиент</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>Инструмент</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>Выдача / Сдача</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>Заработано</th>
                        <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>Статус</th>
                        <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, textTransform: "uppercase", color: "#6b7280", fontWeight: 600 }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item, itemIdx) => (
                        <tr
                          key={item.id ? `contract-${item.id}` : (item.offlineId ? `offline-${item.offlineId}` : `row-${group.date}-${itemIdx}`)}
                          style={{ borderBottom: "1px solid #f3f4f6" }}
                        >
                          <td style={{ padding: "12px 16px", color: "#4b5563" }}>
                            {item.id ? item.id : (item.offlineId ? `${item.offlineId.slice(0, 8)}...` : "—")}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 500 }}>{item.clientName}</td>
                          <td style={{ padding: "12px 16px" }}>{item.toolName ?? "—"}</td>
                          <td style={{ padding: "12px 16px", fontSize: 13, color: "#6b7280" }}>
                            <div>В: {formatDateTime(item.startDateTime)}</div>
                            <div>С: {formatDateTime(item.returnDate)}</div>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: item.amount ? "#166534" : "#374151" }}>
                            {item.amount != null ? `${item.amount} сом` : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span className={`status ${statusClass(item.status || "")}`}>
                              {statusLabel(item.status || "")}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                              <button
                                className="btn-edit"
                                onClick={() => {
                                  if (item.id) {
                                    navigate(`/documents/${item.id}`);
                                  } else {
                                    alert("Этот договор еще не синхронизирован, невозможно открыть");
                                  }
                                }}
                                style={{ fontSize: "13px", padding: "4px 8px" }}
                              >
                                Открыть
                              </button>
                              {item.status === "CLOSED" && item.id > 0 && (
                                <button
                                  className="btn-restore"
                                  onClick={() => handleRestore(item.id)}
                                  style={{ fontSize: "13px", padding: "4px 8px" }}
                                >
                                  Восстановить
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ textAlign: "right", padding: "8px 16px", background: "#f8fafc", borderRadius: 8, display: "inline-block", float: "right" }}>
                  <span style={{ fontSize: 14, color: "#475569", marginRight: 12 }}>Итого за день:</span>
                  <span style={{ fontSize: 18, fontWeight: "bold", color: "#0f172a" }}>{group.totalEarned} сом</span>
                </div>
                <div style={{ clear: "both" }}></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

