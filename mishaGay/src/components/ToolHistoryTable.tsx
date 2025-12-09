import type { ToolHistoryEntry } from "../types/tool.types";

interface ToolHistoryTableProps {
  history: ToolHistoryEntry[];
}

export const ToolHistoryTable = ({ history }: ToolHistoryTableProps) => {
  if (!history || history.length === 0) {
    return <p style={{ marginTop: 8 }}>История выдач пока пуста</p>;
  }

  return (
    <div className="history-table-wrapper">
      <table className="history-table">
        <thead>
          <tr>
            <th>Дата выдачи</th>
            <th>Клиент</th>
            <th>Менеджер</th>
            <th>Возврат</th>
            <th>Прибыль</th>
            <th>Статус</th>
          </tr>
        </thead>

        <tbody>
          {history.map((h) => {
            const statusKey = (h.status || "").toLowerCase();
            return (
              <tr key={h.id}>
                <td>{h.startDate}</td>
                <td>{h.clientName}</td>
                <td>{h.managerName ?? "—"}</td>
                <td>{h.returnDate ?? "—"}</td>
                <td>{h.profit ?? 0} сом</td>
                <td>
                  <span className={`history-status history-status-${statusKey}`}>
                    {h.status || "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

