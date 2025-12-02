export type ToolStatus =
  | "AVAILABLE"
  | "RENTED"
  | "BROKEN"
  | "LOST"
  | "SERVICE";

export interface ToolAttribute {
  name: string;
  value: string;
}

export interface ToolImage {
  id: number;
  fileName: string;
}

export interface Tool {
  id: number;
  name: string;
  article?: string;
  inventoryNumber: string;
  status: ToolStatus;
  description?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  deposit?: number;
  attributes: ToolAttribute[];
  images: ToolImage[];
  // Для обратной совместимости
  categoryName?: string;
  serialNumber?: string | null;
}

