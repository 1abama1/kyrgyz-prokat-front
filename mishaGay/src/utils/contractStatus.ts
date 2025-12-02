import { ContractStatus } from "../types/RentalDocument";

export function getStatusLabel(status: ContractStatus) {
  switch (status) {
    case "ACTIVE":
      return "Активен";
    case "OVERDUE":
      return "Просрочен ⚠️";
    case "CLOSED":
      return "Завершён";
    case "TERMINATED":
      return "Разорван";
  }
}

export function getStatusClass(status: ContractStatus) {
  switch (status) {
    case "ACTIVE":
      return "status-active";
    case "OVERDUE":
      return "status-overdue";
    case "CLOSED":
      return "status-closed";
    case "TERMINATED":
      return "status-terminated";
  }
}

