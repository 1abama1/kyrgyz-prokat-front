// Базовые DTO, соответствующие Java бэкенду

export interface CategoryDto {
  id: number;
  name: string;
}

export interface TemplateDto {
  id: number;
  name: string;
  categoryId: number;
}

export type ToolStatusDto = "AVAILABLE" | "RENTED" | "BROKEN";

export interface ToolDto {
  id: number;
  name: string;
  inventoryNumber: string;
  article: string;
  deposit: number;
  purchasePrice: number;
  dailyPrice: number;
  status: ToolStatusDto;
  instanceNumber?: number;
  serialNumber?: string | null;
}

// Full DTO для полной структуры

export interface TemplateFullDto {
  id: number;
  name: string;
  tools: ToolDto[];
}

export interface CategoryFullDto {
  id: number;
  name: string;
  templates: TemplateFullDto[];
}

// Request DTO для создания

export interface CreateCategoryRequest {
  name: string;
}

export interface CreateTemplateRequest {
  name: string;
  categoryId: number;
}

export interface CreateToolRequest {
  templateId: number;
  name: string;
  inventoryNumber: string;
  article: string;
  deposit: number;
  purchasePrice: number;
  dailyPrice: number;
}

