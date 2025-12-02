export function toolStatusLabel(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "Доступен";
    case "RENTED":
      return "В аренде";
    case "BROKEN":
      return "Сломан";
    case "SERVICE":
      return "Обслуживание";
    case "LOST":
      return "Утрачен";
    default:
      return status;
  }
}

export function getToolStatusClass(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "tool-status-available";
    case "RENTED":
      return "tool-status-rented";
    case "BROKEN":
      return "tool-status-broken";
    case "SERVICE":
      return "tool-status-service";
    case "LOST":
      return "tool-status-lost";
    default:
      return "tool-status-unknown";
  }
}

