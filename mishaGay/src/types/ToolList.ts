import type { ToolStatus } from "./tool.types";

export type { ToolStatus };

export interface ToolListItem {
  id: string;
  name: string;
  inventoryNumber: string;
  status: ToolStatus;
  categoryName: string;
  depositAmount: number | null;
}

export type { ToolCategory } from "./tool.types";
export type { ToolTemplate } from "./tool.types";
