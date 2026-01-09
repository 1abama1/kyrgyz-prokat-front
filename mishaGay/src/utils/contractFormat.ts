export const statusLabel = (status: string) => {
  switch (status) {
    case "ACTIVE": return "Активен";
    case "CLOSED": return "Закрыт";
    case "OVERDUE": return "Просрочен";
    case "TERMINATED": return "Расторгнут";
    default: return status;
  }
};

export const statusClass = (status: string) => {
  switch (status) {
    case "ACTIVE": return "status-active";
    case "CLOSED": return "status-closed";
    case "OVERDUE": return "status-overdue";
    case "TERMINATED": return "status-terminated";
    default: return "";
  }
};

export const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("ru-RU")
    : "—";

export const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("ru-RU")
    : "—";

export const formatAmount = (value?: number | null) =>
  value != null
    ? `${value.toLocaleString("ru-RU")} ₸`
    : "—";
