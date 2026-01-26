import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { contractsAPI, ActiveContractRow } from "../api/contracts";
import { formatDate } from "../utils/formatters";
import "../styles/buttons.css";
import "../styles/tools.css";

export const ActiveContractsPage = () => {
  const [rows, setRows] = useState<ActiveContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleClose = async (contractId: number) => {
    if (!contractId || isNaN(contractId) || contractId <= 0) {
      alert("Ошибка: неверный ID договора");
      return;
    }

    if (!confirm("Вы уверены, что хотите закрыть этот договор?")) {
      return;
    }

    try {
      await contractsAPI.close(contractId);
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
                    <td>
                      <button
                        onClick={() => {
                          if (row.contractId && !isNaN(row.contractId) && row.contractId > 0) {
                            navigate(`/documents/${row.contractId}`);
                          } else {
                            console.error("Invalid contractId:", row.contractId);
                            alert("Ошибка: неверный ID договора");
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
                          if (row.contractId && !isNaN(row.contractId) && row.contractId > 0) {
                            handleClose(row.contractId);
                          } else {
                            console.error("Invalid contractId:", row.contractId);
                            alert("Ошибка: неверный ID договора");
                          }
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
    </Layout>
  );
};

