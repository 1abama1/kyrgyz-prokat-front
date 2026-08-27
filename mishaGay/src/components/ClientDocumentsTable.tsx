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
  const [closeForm, setCloseForm] = useState({
    paidAmount: "",
    comment: "",
    isBroken: false,
    actualReturnDate: new Date().toISOString().slice(0, 16)
  });

  const openCloseModal = (id: number | string) => {
    setClosingId(String(id));
    setCloseForm({
      paidAmount: "",
      comment: "",
      isBroken: false,
      actualReturnDate: new Date().toISOString().slice(0, 16)
    });
  };

  const submitClose = async () => {
    if (!closingId) return;
    try {
      const isOfflineId = isNaN(Number(closingId));
      const contractId = isOfflineId ? undefined : Number(closingId);
      const offlineId = isOfflineId ? closingId : undefined;

      await contractsAPI.close(contractId, {
        paidAmount: closeForm.paidAmount ? Number(closeForm.paidAmount) : undefined,
        comment: closeForm.comment || undefined,
        isBroken: closeForm.isBroken,
        actualReturnDate: closeForm.actualReturnDate ? new Date(closeForm.actualReturnDate).toISOString() : undefined,
      }, offlineId);
      setClosingId(null);
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
      amount: contract.amount?.toString() || "",
      comment: contract.comment || ""
    });
  };

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
                      onClick={() => openCloseModal(d.id)}
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
          <div className="modal">
            <h3>Закрытие договора</h3>

            <label>
              Фактическая дата возврата
              <input
                type="datetime-local"
                value={closeForm.actualReturnDate}
                onChange={e =>
                  setCloseForm(prev => ({ ...prev, actualReturnDate: e.target.value }))
                }
              />
            </label>

            <label>
              Внесенная сумма (сом)
              <input
                type="number"
                value={closeForm.paidAmount}
                onChange={e =>
                  setCloseForm(prev => ({ ...prev, paidAmount: e.target.value }))
                }
                placeholder="Если пусто, берется плановая сумма"
              />
            </label>

            <label>
              Комментарий
              <textarea
                value={closeForm.comment}
                onChange={e =>
                  setCloseForm(prev => ({ ...prev, comment: e.target.value }))
                }
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={closeForm.isBroken}
                onChange={e =>
                  setCloseForm(prev => ({ ...prev, isBroken: e.target.checked }))
                }
              />
              <span style={{ color: '#d32f2f', fontWeight: 500 }}>Инструмент сломан (в ремонт)</span>
            </label>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button onClick={submitClose} style={{ background: '#d32f2f', color: 'white' }}>✅ Закрыть договор</button>
              <button onClick={() => setClosingId(null)}>❌ Отмена</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

