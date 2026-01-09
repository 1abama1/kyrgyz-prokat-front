import { ContractDto } from "../types/Contract";
import {
  formatAmount,
  formatDate,
  formatDateTime,
  statusClass,
  statusLabel
} from "../utils/contractFormat";
import { DownloadExcelButton } from "./DownloadExcelButton";
import { useNavigate } from "react-router-dom";
import { contractsAPI } from "../api/contracts";
import "../styles/contracts.css";

type Props = {
  contracts: ContractDto[];
};

export const ContractsTable = ({ contracts }: Props) => {
  const navigate = useNavigate();

  const handleRestore = async (id: number) => {
    if (!window.confirm("Восстановить договор и вернуть инструмент?")) return;

    try {
      await contractsAPI.restore(id);
      window.location.reload(); // быстро и надёжно
    } catch (e: any) {
      alert(e?.message || "Ошибка восстановления договора");
    }
  };

  return (
    <table className="contracts-table">
      <thead>
        <tr>
          <th>№ договора</th>
          <th>Статус</th>
          <th>Начало</th>
          <th>План возврата</th>
          <th>Сумма</th>
          <th>Закрыт</th>
          <th>Действия</th>
        </tr>
      </thead>

      <tbody>
        {contracts.map(c => (
          <tr key={c.id}>
            <td>{c.contractNumber}</td>

            <td>
              <span className={`status ${statusClass(c.status)}`}>
                {statusLabel(c.status)}
              </span>
            </td>

            <td>{formatDateTime(c.startDateTime)}</td>
            <td>{formatDate(c.expectedReturnDate)}</td>
            <td>{formatAmount(c.amount)}</td>
            <td>{formatDateTime(c.closedAt)}</td>

            <td>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <DownloadExcelButton 
                  contractId={c.id} 
                  contractNumber={c.contractNumber}
                />

                <button
                  className="btn-edit"
                  onClick={() => navigate(`/documents/${c.id}`)}
                  style={{ fontSize: "14px" }}
                >
                  Открыть
                </button>

                {c.status === "CLOSED" && (
                  <button
                    className="btn-restore"
                    onClick={() => handleRestore(c.id)}
                    style={{ fontSize: "14px" }}
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
  );
};
