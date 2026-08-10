export type ContractStatus = "ACTIVE" | "CLOSED" | "TERMINATED" | "OVERDUE";

export interface ContractDto {
  id: number;
  contractNumber: string;
  startDateTime: string;
  amount: number | null;
  createdAt: string;
  returnDate: string | null;
  status: ContractStatus;
}
