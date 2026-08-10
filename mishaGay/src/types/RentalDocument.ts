import type { ContractStatus } from "./Contract";
export type { ContractStatus };

export interface RentalDocument {
  id: number;
  contractNumber: string;
  startDateTime?: string; 
  returnDate?: string; 
  amount: number;
  comment?: string;
  status: ContractStatus;
  clientId?: number; 
  toolId?: number; 
}
