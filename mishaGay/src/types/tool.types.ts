export interface ToolCategory {
  id: number;
  name: string;
}

export interface ToolTemplate {
  id: number;
  name: string;
  categoryId: number;
}

export type ToolStatus =
  | "AVAILABLE"
  | "RENTED"
  | "OVERDUE"
  | "BROKEN";

export interface Tool {
  id: number;
  name: string;
  inventoryNumber: string;
  serialNumber?: string | null;
  article: string;
  deposit: number;
  purchasePrice: number;
  dailyPrice: number;

  status: ToolStatus;

  templateId: number;
  templateName: string;

  categoryId: number;
  categoryName: string;

  images: ToolImage[];
}

// Краткое описание экземпляра инструмента для выбора в CRM
export interface ToolInstance {
  id: number;
  name: string;
  inventoryNumber: string;
  article: string;
  deposit: number;
  purchasePrice: number;
  dailyPrice: number;
  status: "AVAILABLE" | "RENTED" | "BROKEN";
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

export interface ToolImage {
  id: number;
  fileName: string;
}
