import type { ToolStatus } from "./tool.types";

export type { ToolStatus };

export interface ToolListItem {
  id: number;
  name: string;
  inventoryNumber: string;
  status: ToolStatus;
  categoryName: string;
  deposit: number | null;
}

