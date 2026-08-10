export interface ToolCategory {
  id: string;
  name: string;
}

export interface ToolTemplate {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
}

export type ToolStatus =
  | "AVAILABLE"
  | "RENTED"
  | "OVERDUE"
  | "BROKEN"
  | "IN_REPAIR"
  | "DECOMMISSIONED"
  | "LOST"
  | "WRITTEN_OFF";

export interface Tool {
  id: number;
  name: string;
  inventoryNumber: string;
  instanceNumber?: number;
  serialNumber?: string | null;
  article: string;
  depositAmount: number;
  purchasePrice: number;
  dailyRentalPrice: number;

  status: ToolStatus;

  templateId: string;
  templateName?: string;

  categoryId?: string;
  categoryName?: string;
}

// Краткое описание экземпляра инструмента для выбора в CRM
export interface ToolInstance {
  id: number;
  name: string;
  inventoryNumber: string;
  article: string;
  depositAmount: number;
  purchasePrice: number;
  dailyRentalPrice: number;
  status: ToolStatus;
  instanceNumber?: number;
}

export interface ToolHistoryEntry {
  id: number;
  startDate: string;
  returnDate?: string | null;
  clientName: string;
  managerName?: string | null;
  profit?: number | null;
  status: string;
}
