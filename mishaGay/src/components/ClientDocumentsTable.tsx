import { FC, useState } from "react";
import { RentalDocument } from "../types/RentalDocument";
import { getStatusLabel, getStatusClass } from "../utils/contractStatus";
import { contractsAPI } from "../api/contracts";
import "../styles/contracts.css";

interface Props {
  documents: RentalDocument[];
  onRefresh: () => void;
}

export const ClientDocumentsTable: FC<Props> = ({ documents, onRefresh }) => {
  const [editing, setEditing] = useState<RentalDocument | null>(null);

  const [form, setForm] = useState({
    amount: "",
    comment: ""
  });

  const [closingId, setClosingId] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [comment, setComment] = useState<string>("");

  const handleCloseClick = (contract: RentalDocument) => {
    setClosingId(String(contract.id));
    setPaidAmount(contract.amount || 0);
    setComment("");
  };

  const handleConfirmClose = async () => {
    if (!closingId) return;
    try {
      const isOfflineId = isNaN(Number(closingId));
      const contractId = isOfflineId ? undefined : Number(closingId);
      const offlineId = isOfflineId ? closingId : undefined;

      await contractsAPI.close(
        contractId,
        { paidAmount: Number(paidAmount) || 0, comment },
        offlineId
      );
      setClosingId(null);
      onRefresh();
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || "Ошибка закрытия договора");
    }
  };

  const canClose = (status: string) =>
    status === "ACTIVE" || status === "OVERDUE";

  // const canEdit = (status: string) =>
  //   status === "ACTIVE" || status === "OVERDUE";

  // const openEdit = (contract: RentalDocument) => {
  //   if (!canEdit(contract.status)) {
  //     alert("Нельзя редактировать закрытый договор");
  //     return;
  //   }
  // 
  //   setEditing(contract);
  //   setForm({
  //     amount: contract.amount?.toString() || "",
  //     comment: contract.comment || ""
  //   });
  // };

  const save = async () => {
    if (!editing) return;

    try {
      const isOfflineId = isNaN(Number(editing.id));
      const contractId = isOfflineId ? undefined : Number(editing.id);
      const offlineId = isOfflineId ? String(editing.id) : undefined;

      await contractsAPI.update(contractId, {
        amount: form.amount ? Number(form.amount) : undefined,
        comment: form.comment || undefined
      }, offlineId);

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
            <th>Сумма</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {documents.map(d => (
            <tr key={d.id}>
              <td>{d.contractNumber}</td>
              <td>{d.amount != null ? `${d.amount} сом` : ''}</td>
              <td>
                <span className={getStatusClass(d.status)}>
                  {getStatusLabel(d.status)}
                </span>
              </td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {canClose(d.status) && (
                    <button
                      className="btn-danger"
                      onClick={() => handleCloseClick(d)}
                    >
                      Закрыть
                    </button>
                  )}
                </div>
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

      {closingId && (
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
                onClick={() => setClosingId(null)}
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
    </>
  );
};

