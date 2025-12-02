import { apiCall } from "./client";
import type { Tool } from "../types/tool.types";
import type { ToolListItem, ToolStatus } from "../types/ToolList";

/**
 * 1) Список шаблонов инструментов (ToolTemplateDto)
 *    GET /api/tools/templates
 */
export const getToolTemplates = (): Promise<Tool[]> => {
  return apiCall<Tool[]>("/api/admin/tools/templates");
};

export const toolsAPI = {
  /**
   * Список инструментов с фильтрами (ToolListDto)
   * GET /api/admin/tools?status=...&categoryId=...
   */
  getList: (filters?: {
    status?: ToolStatus;
    categoryId?: number;
  }): Promise<ToolListItem[]> => {
    const queryParams = new URLSearchParams();
    if (filters?.status) {
      queryParams.append("status", filters.status);
    }
    if (filters?.categoryId) {
      queryParams.append("categoryId", filters.categoryId.toString());
    }
    const query = queryParams.toString();
    return apiCall<ToolListItem[]>(`/api/admin/tools${query ? `?${query}` : ""}`);
  },

  /**
   * Все физические инструменты (полная модель Tool)
   * GET /api/admin/tools
   */
  getAll: (): Promise<Tool[]> => {
    return apiCall<Tool[]>("/api/admin/tools");
  },

  /**
   * Доступные инструменты (только AVAILABLE)
   * GET /api/admin/tools/available?categoryId=...&rentalPointId=...
   */
  getAvailable: (params?: {
    categoryId?: number;
    rentalPointId?: number;
  }): Promise<Tool[]> => {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) {
      queryParams.append("categoryId", params.categoryId.toString());
    }
    if (params?.rentalPointId) {
      queryParams.append("rentalPointId", params.rentalPointId.toString());
    }
    const query = queryParams.toString();
    return apiCall<Tool[]>(`/api/admin/tools/available${query ? `?${query}` : ""}`);
  },

  /**
   * Получить инструмент по ID
   * GET /api/admin/tools/{id}
   */
  getById: (id: number): Promise<Tool> => {
    return apiCall<Tool>(`/api/admin/tools/${id}`);
  },

  /**
   * Создать инструмент
   * POST /api/admin/tools
   */
  create: (data: any): Promise<Tool> => {
    return apiCall<Tool>("/api/admin/tools", {
      method: "POST",
      body: data
    });
  },

  /**
   * Обновить статус инструмента
   * PUT /api/admin/tools/{id}/status
   */
  updateStatus: (id: number, status: string): Promise<Tool> => {
    return apiCall<Tool>(`/api/admin/tools/${id}/status`, {
      method: "PUT",
      body: { status }
    });
  },

  /**
   * Загрузить изображения инструмента
   * POST /api/admin/tools/{id}/images
   */
  uploadImages: (id: number, files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    return apiCall<void>(`/api/admin/tools/${id}/images`, {
      method: "POST",
      body: formData,
      isMultipart: true
    });
  },

  /**
   * Все шаблоны (для выбора модели) - для обратной совместимости
   */
  getTemplates: (): Promise<Tool[]> => {
    return getToolTemplates();
  },

  /**
   * Шаблоны по категории (id категории!)
   * GET /api/admin/tools/templates/category/{categoryId}
   */
  getByCategory: (categoryId: number): Promise<Tool[]> => {
    return apiCall<Tool[]>(`/api/admin/tools/templates/category/${categoryId}`);
  },

  /**
   * Доступные физические инструменты по шаблону
   * GET /api/admin/tools/available?templateId=...
   */
  getAvailableByTemplate: (templateId: number): Promise<Tool[]> => {
    return apiCall<Tool[]>(`/api/admin/tools/available?templateId=${templateId}`);
  },

  /**
   * Старое название, оставим как алиас,
   * чтобы не переписывать весь код.
   */
  getFreeToolsByTemplate(templateId: number): Promise<Tool[]> {
    return this.getAvailableByTemplate(templateId);
  },

  /**
   * Обновить инструмент
   * PUT /api/admin/tools/{id}
   */
  update: (id: number, data: Partial<Tool>): Promise<Tool> => {
    return apiCall<Tool>(`/api/admin/tools/${id}`, {
      method: "PUT",
      body: data
    });
  }
};