export interface CategoryDto {
  id: string;
  name: string;
}

export interface TemplateDto {
  id: string;
  name: string;
  categoryId: string;
}

export type ToolStatusDto = "AVAILABLE" | "RENTED" | "BROKEN" | "IN_REPAIR" | "DECOMMISSIONED" | "LOST" | "WRITTEN_OFF";

export interface ToolDto {
  id: number;
  name: string;
  inventoryNumber: string;
  article: string;
  depositAmount: number;
  purchasePrice: number;
  dailyRentalPrice: number;
  status: ToolStatusDto;
  instanceNumber?: number;
  serialNumber?: string | null;
  categoryId?: string;
  templateId?: string;
}

export interface TemplateFullDto {
  id: string;
  name: string;
  tools: ToolDto[];
}

export interface CategoryFullDto {
  id: string;
  name: string;
  templates: TemplateFullDto[];
}

export interface CreateCategoryRequest {
  name: string;
}

export interface CreateTemplateRequest {
  name: string;
  categoryId: string;
}

export interface CreateToolRequest {
  templateId: string;
  inventoryNumber: string;
  serialNumber?: string | null;
}

export interface CreateToolBatchRequest {
  templateId: string;
  count: number;
}
