import { FC } from "react";
import { RentalDocument } from "../types/RentalDocument";
import { getStatusLabel, getStatusClass } from "../utils/contractStatus";
import { contractsAPI } from "../api/contracts";
import { formatDate } from "../utils/formatters";
import "../styles/contracts.css";

interface Props {
  documents: RentalDocument[];
  onRefresh: () => void;
}

export const ClientDocumentsTable: FC<Props> = ({ documents, onRefresh }) => {
  const close = async (id: number) => {
    const confirmed = window.confirm("Вы уверены, что хотите закрыть договор?");
    if (!confirmed) {
      return;
    }

    try {
      await contractsAPI.close(id);
      onRefresh();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || "Ошибка закрытия");
    }
  };

  const canClose = (status: string) =>
    status === "ACTIVE" || status === "OVERDUE";

  return (
    <table className="contracts">
      <thead>
        <tr>
          <th>№</th>
          <th>План возврата</th>
          <th>Сумма</th>
          <th>Статус</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {documents.map(d => (
          <tr key={d.id}>
            <td>{d.contractNumber}</td>
            <td>{d.expectedReturnDate ? formatDate(d.expectedReturnDate) : "—"}</td>
            <td>{d.amount} сом</td>
            <td>
              <span className={getStatusClass(d.status)}>
                {getStatusLabel(d.status)}
              </span>
            </td>
            <td>
              {canClose(d.status) && (
                <button
                  className="btn-danger"
                  onClick={() => close(d.id)}
                >
                  Закрыть
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

