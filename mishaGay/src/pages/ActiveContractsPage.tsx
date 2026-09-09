import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { contractsAPI, ActiveContractRow } from "../api/contracts";
import { formatDate } from "../utils/formatters";
import "../styles/tools.css";

const OVERDUE_DAYS = 14;

const SkeletonRow = () => (
  <tr>
    {[...Array(6)].map((_, i) => (
      <td key={i} style={{ padding: "13px 16px" }}>
        <div className="skeleton-cell" style={{ width: i === 0 ? 24 : i === 4 ? 80 : "80%" }} />
      </td>
    ))}
  </tr>
);

export const ActiveContractsPage = () => {
  const [rows, setRows] = useState<ActiveContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Поиск и сортировка
  const [search, setSearch] = useState("");
  const [sortByDate, setSortByDate] = useState<"asc" | "desc">("asc");

  // Состояния для модального окна закрытия
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [selectedOfflineId, setSelectedOfflineId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [comment, setComment] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await contractsAPI.getActiveTable();

      const normalized = data.map((item, idx) => {
        const contractId = item.contractId ?? (item as any).id;
        return {
          index: idx + 1,
          contractId: contractId ?? 0,
          offlineId: (item as any).offlineId,
          clientName: item.clientName ?? "",
          toolName: item.toolName ?? "",
          startDate: item.startDate ?? "",
          balance: typeof item.balance === "number" ? item.balance : 0,
          dailyPrice: typeof item.dailyPrice === "number" ? item.dailyPrice : 0,
          clientId: (item as any).clientId ?? 0,
        };
      });

      setRows(normalized);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка загрузки активных договоров");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseClick = (contractId: number, offlineId: string | undefined, currentBalance: number) => {
    setSelectedContractId(contractId || null);
    setSelectedOfflineId(offlineId || null);
    setPaidAmount(currentBalance || 0);
    setComment("");
    setIsModalOpen(true);
  };

  const handleConfirmClose = async () => {
    const selectedRow = rows.find(r =>
      (selectedContractId && r.contractId === selectedContractId) ||
      (selectedOfflineId && r.offlineId === selectedOfflineId)
    );
    if (!selectedRow) return;

    try {
      await contractsAPI.close(
        selectedContractId || undefined,
        { paidAmount: Number(paidAmount) || 0, comment },
        selectedRow?.offlineId
      );
      setIsModalOpen(false);
      await load();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Ошибка закрытия договора: ${err.message}`);
      } else {
        alert("Ошибка закрытия договора");
      }
    }
  };

  // Фильтрация + сортировка
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows
      .filter(r =>
        r.clientName.toLowerCase().includes(q) ||
        r.toolName.toLowerCase().includes(q)
      )
      .sort((a, b) =>
        sortByDate === "asc"
          ? new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          : new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
  }, [rows, search, sortByDate]);

  const getDaysRented = (startDate: string) => {
    if (!startDate) return 0;
    const start = new Date(startDate).getTime();
    const now = Date.now();
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  if (error) {
    return (
      <Layout>
        <div className="tools-empty">
          <p style={{ color: "#dc2626" }}>{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tools-page">
        <div className="tools-page-header" style={{ alignItems: "center", gap: 12 }}>
          <h1 className="tools-page-title" style={{ marginBottom: 0 }}>Активные договора</h1>
          <button
            type="button"
            className="btn-small"
            onClick={() => navigate("/contracts/history")}
          >
            История
          </button>
        </div>

        {/* Поиск */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Поиск по ФИО или инструменту..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 420 }}
          />
          {!loading && (
            <span style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>
              Найдено: <b>{filtered.length}</b> из {rows.length}
            </span>
          )}
        </div>

        {!loading && rows.length === 0 ? (
          <div className="tools-empty">
            <p>Нет активных договоров</p>
          </div>
        ) : (
          <div className="active-contracts-table-wrapper">
            <table className="active-contracts-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ФИО</th>
                  <th>Инструмент</th>
                  <th
                    onClick={() => setSortByDate(s => s === "asc" ? "desc" : "asc")}
                    style={{ cursor: "pointer", userSelect: "none" }}
                    title="Нажмите для сортировки"
                  >
                    Дата {sortByDate === "asc" ? "↑" : "↓"}
                  </th>
                  <th>К оплате</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                  : filtered.map((row, index) => {
                      const days = getDaysRented(row.startDate);
                      const isOverdue = days >= OVERDUE_DAYS;
                      const calculatedDebt = (Math.max(1, days) * (row.dailyPrice || 0)) + row.balance;
                      return (
                        <tr
                          key={row.contractId ? `contract-${row.contractId}` : `offline-${row.offlineId || index}`}
                          style={{ backgroundColor: isOverdue ? "#fef2f2" : "transparent" }}
                          title={isOverdue ? `Аренда идёт ${days} дней` : undefined}
                        >
                          <td>{row.index}</td>
                          <td>{row.clientName}</td>
                          <td>
                            {row.toolName}
                            {isOverdue && (
                              <span style={{
                                marginLeft: 6,
                                fontSize: 11,
                                background: "#fee2e2",
                                color: "#b91c1c",
                                borderRadius: 4,
                                padding: "1px 5px",
                                fontWeight: 600,
                              }}>
                                {days} дн.
                              </span>
                            )}
                          </td>
                          <td>{formatDate(row.startDate)}</td>
                          <td style={{
                            color: calculatedDebt > 0 ? "#dc2626" : "#166534",
                            fontWeight: 600,
                          }}>
                            {calculatedDebt} сом
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button
                                onClick={() => {
                                  const targetId = row.contractId || row.offlineId;
                                  if (targetId) {
                                    navigate(`/documents/${targetId}`);
                                  } else {
                                    alert("Ошибка: невозможно открыть договор");
                                  }
                                }}
                                className="btn-small"
                                type="button"
                              >
                                Открыть →
                              </button>
                              <button
                                onClick={() => handleCloseClick(row.contractId, row.offlineId, row.balance)}
                                className="btn-danger"
                                type="button"
                              >
                                Закрыть
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно закрытия */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Закрытие договора</h2>

            <label style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, marginBottom: '4px' }}>Сумма оплаты (KGS):</span>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                onFocus={(e) => e.target.select()}
                autoFocus
              />
            </label>

            <label style={{ marginBottom: '20px' }}>
              <span style={{ fontWeight: 600, marginBottom: '4px' }}>Комментарий:</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Причина закрытия, нюансы..."
              />
            </label>

            <div className="modal-actions">
              <button
                className="btn-small"
                onClick={() => setIsModalOpen(false)}
                style={{ background: '#f3f4f6', color: '#374151' }}
              >
                Отмена
              </button>
              <button
                className="btn-edit"
                onClick={handleConfirmClose}
              >
                Подтвердить закрытие
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
