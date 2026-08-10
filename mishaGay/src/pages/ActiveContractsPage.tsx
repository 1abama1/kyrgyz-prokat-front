import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { contractsAPI, ActiveContractRow } from "../api/contracts";
import { formatDate } from "../utils/formatters";
import "../styles/tools.css";

export const ActiveContractsPage = () => {
  const [rows, setRows] = useState<ActiveContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      await load(); // Перезагружаем данные
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Ошибка закрытия договора: ${err.message}`);
      } else {
        alert("Ошибка закрытия договора");
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="tools-loading">
          <p>Загрузка...</p>
        </div>
      </Layout>
    );
  }

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
            onClick={() => {
              navigate("/contracts/history");
            }}
          >
            История
          </button>
        </div>

        {rows.length === 0 ? (
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
                  <th>Дата</th>
                  <th>Просмотр</th>
                  <th>Закрыть</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.contractId || `contract-${index}`}>
                    <td>{row.index}</td>
                    <td>{row.clientName}</td>
                    <td>{row.toolName}</td>
                    <td>{formatDate(row.startDate)}</td>
                    <td style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {/* <ReinstallExcelButton contractId={row.contractId} /> */}
                      <button
                        onClick={() => {
                          if (row.contractId) {
                            navigate(`/documents/${row.contractId}`);
                          } else {
                            console.error("Invalid contractId:", row.contractId);
                            alert("Ошибка: этот договор еще не синхронизирован, невозможно открыть");
                          }
                        }}
                        className="btn-small"
                        type="button"
                      >
                        Открыть →
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          handleCloseClick(row.contractId, row.offlineId, row.balance);
                        }}
                        className="btn-danger"
                        type="button"
                      >
                        Закрыть
                      </button>
                    </td>
                  </tr>
                ))}
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

