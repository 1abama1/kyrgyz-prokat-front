export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId?: number;
  email?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

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
  categoryName?: string;
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
}

export interface CreateToolBatchRequest {
  templateId: string;
  count: number;
}
