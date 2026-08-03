import { FC, useState } from "react";
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
  const [editing, setEditing] = useState<RentalDocument | null>(null);
  const [loadingDownload, setLoadingDownload] = useState<number | null>(null);

  const handleDownloadExistingExcel = async (contractId: number, contractNumber: string) => {
    try {
      setLoadingDownload(contractId);
      const { blob, filename } = await contractsAPI.downloadExistingExcel(contractId, `Договор_${contractNumber}.xlsx`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Ошибка при скачивании: " + (err?.message || "Неизвестная ошибка"));
    } finally {
      setLoadingDownload(null);
    }
  };

  const [form, setForm] = useState({
    expectedReturnDate: "",
    amount: "",
    comment: ""
  });

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

  const canEdit = (status: string) =>
    status === "ACTIVE" || status === "OVERDUE";

  const openEdit = (contract: RentalDocument) => {
    if (!canEdit(contract.status)) {
      alert("Нельзя редактировать закрытый договор");
      return;
    }

    setEditing(contract);
    setForm({
      expectedReturnDate: contract.expectedReturnDate || "",
      amount: contract.amount?.toString() || "",
      comment: contract.comment || ""
    });
  };

  const save = async () => {
    if (!editing) return;

    try {
      await contractsAPI.update(editing.id, {
        expectedReturnDate: form.expectedReturnDate || undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        comment: form.comment || undefined
      });

      alert("Договор обновлён");
      setEditing(null);
      onRefresh();
    } catch (e: any) {
      const message = e.response?.data?.message || e.message || "Ошибка сохранения договора";
      alert(message);
    }
  };

  return (
    <>
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
                <button
                  onClick={() => handleDownloadExistingExcel(d.id, d.contractNumber)}
                  disabled={loadingDownload === d.id}
                  style={{
                    background: "#e8f5e9",
                    color: "#2e7d32",
                    border: "1px solid #c8e6c9",
                    borderRadius: 4,
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 500,
                    marginRight: "8px",
                    marginBottom: "4px"
                  }}
                  title="Переустановить / Скачать Excel заново"
                >
                  {loadingDownload === d.id ? "⏳..." : "⬇️ Excel"}
                </button>
                {canEdit(d.status) && (
                  <button
                    className="btn-edit"
                    onClick={() => openEdit(d)}
                    style={{ marginBottom: "4px" }}
                  >
                    ✏️ Редактировать
                  </button>
                )}
                {canClose(d.status) && (
                  <button
                    className="btn-danger"
                    onClick={() => close(d.id)}
                    style={{ marginLeft: canEdit(d.status) ? 8 : 0 }}
                  >
                    Закрыть
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Редактировать договор № {editing.contractNumber}</h3>

            <label>
              Плановая дата возврата
              <input
                type="date"
                value={form.expectedReturnDate}
                onChange={e =>
                  setForm(prev => ({ ...prev, expectedReturnDate: e.target.value }))
                }
                onKeyDown={e => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </label>

            <label>
              Сумма аренды
              <input
                type="number"
                value={form.amount}
                onChange={e =>
                  setForm(prev => ({ ...prev, amount: e.target.value }))
                }
                onKeyDown={e => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            </label>

            <label>
              Комментарий
              <textarea
                value={form.comment}
                onChange={e =>
                  setForm(prev => ({ ...prev, comment: e.target.value }))
                }
              />
            </label>

            <div className="modal-actions">
              <button onClick={save}>✅ Сохранить</button>
              <button onClick={() => setEditing(null)}>❌ Отмена</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

