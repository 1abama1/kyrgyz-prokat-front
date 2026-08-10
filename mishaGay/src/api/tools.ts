import { apiCall } from "./client";
import { ToolDto, CreateToolRequest } from "../types/inventory.types";
import { ToolHistoryEntry } from "../types/tool.types";

export const toolsAPI = {
  getAll: () =>
    apiCall<ToolDto[]>({
      url: "/api/tools",
    }),

  getOne: (id: number) => {
    if (!id) {
      return Promise.reject(new Error("Invalid tool id"));
    }
    return apiCall<ToolDto>({
      url: `/api/tools/${id}`,
    });
  },

  getHistory: (id: number) => {
    if (!id) {
      return Promise.reject(new Error("Invalid tool id"));
    }
    return apiCall<ToolHistoryEntry[]>({
      url: `/api/tools/${id}/history`,
    });
  },

  create: (data: CreateToolRequest) =>
    apiCall<ToolDto>({
      url: "/api/tools",
      method: "POST",
      data,
    }),

  createBatch: (data: any) =>
    apiCall<ToolDto[]>({
      url: "/api/tools/batch",
      method: "POST",
      data,
    }),

  getTodayAll: () =>
    apiCall<ToolDto[]>({
      url: "/api/tools/today",
    }),

  getAllOld: () =>
    apiCall<ToolDto[]>({
      url: "/api/tools/all-old",
    }),

  getAvailableAll: () =>
    apiCall<ToolDto[]>({
      url: "/api/tools/available",
    }),

  getAvailableOld: () =>
    apiCall<ToolDto[]>({
      url: "/api/tools/available/old",
    }),

  getByTemplate: (templateId: string) =>
    apiCall<ToolDto[]>({
      url: `/api/tools/template/${templateId}`,
    }),

  updateStatus: (id: number, status: string, reason?: string) =>
    apiCall<ToolDto>({
      url: `/api/tools/${id}/status`,
      method: "PUT",
      data: { status, reason },
    }),

  uploadImage: (toolId: number, formData: FormData) =>
    apiCall<any>({
      url: `/api/tools/${toolId}/images`,
      method: "POST",
      data: formData,
      isMultipart: true,
    }),

  getImageDetails: (imageId: string) =>
    apiCall<any>({
      url: `/api/tools/images/${imageId}`,
    }),

  deleteImage: (imageId: string) =>
    apiCall<void>({
      url: `/api/tools/images/${imageId}`,
      method: "DELETE",
    }),
};
