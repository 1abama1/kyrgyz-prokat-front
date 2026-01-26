export const statusLabel = (status: string) => {
  switch (status) {
    case "ACTIVE": return "Активен";
    case "CLOSED": return "Закрыт";
    default: return status;
  }
};

export const statusClass = (status: string) => {
  switch (status) {
    case "ACTIVE": return "status-active";
    case "CLOSED": return "status-closed";
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
