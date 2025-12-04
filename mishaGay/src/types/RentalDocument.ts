export type ContractStatus =
  | "ACTIVE"
  | "OVERDUE"
  | "CLOSED"
  | "TERMINATED";

export interface RentalDocument {
  id: number;
  contractNumber: string;
  expectedReturnDate?: string;
  amount: number;
  comment?: string;
  status: ContractStatus;
}

