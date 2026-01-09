export type ContractStatus = "ACTIVE" | "CLOSED" | "OVERDUE" | "TERMINATED";

export interface ContractDto {
  id: number;
  contractNumber: string;
  startDateTime: string;
  expectedReturnDate: string | null;
  amount: number | null;
  createdAt: string;
  closedAt: string | null;
  status: ContractStatus;
}
