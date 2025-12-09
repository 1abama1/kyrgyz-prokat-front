export type ContractStatus =
  | "ACTIVE"
  | "OVERDUE"
  | "CLOSED"
  | "TERMINATED";

export interface RentalDocument {
  id: number;
  contractNumber: string;
  startDateTime?: string; // ISO 8601 формат (2025-12-07T10:30:00)
  expectedReturnDate?: string; // YYYY-MM-DD
  amount: number;
  comment?: string;
  status: ContractStatus;
  clientId?: number; // ID клиента для удобства
  toolId?: number; // ID экземпляра инструмента для удобства
}

