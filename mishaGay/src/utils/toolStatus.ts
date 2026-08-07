export function toolStatusLabel(status: string) {
  switch (status) {
    case "AVAILABLE":
      return "Доступен";
    case "RENTED":
      return "В аренде";
    case "BROKEN":
      return "Сломан (устар.)";
    case "IN_REPAIR":
      return "В ремонте";
    case "DECOMMISSIONED":
      return "Списан";
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
    case "IN_REPAIR":
      return "tool-status-repair"; // Потребуется добавить в CSS
    case "DECOMMISSIONED":
      return "tool-status-decommissioned"; // Потребуется добавить в CSS
    case "SERVICE":
      return "tool-status-service";
    case "LOST":
      return "tool-status-lost";
    default:
      return "tool-status-unknown";
  }
}

