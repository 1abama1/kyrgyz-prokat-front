export type ToolStatus = "AVAILABLE" | "RENTED" | "OVERDUE";

export interface ToolListItem {
  id: number;
  name: string;
  inventoryNumber: string;
  status: ToolStatus;
  categoryName: string;
  deposit: number | null;
}

