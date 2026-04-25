import { apiCall } from "./client";
import { ToolDto, CreateToolRequest } from "../types/inventory.types";
import { ToolHistoryEntry } from "../types/tool.types";

export const toolsAPI = {
  getAll: () =>
    apiCall<ToolDto[]>({
      url: "/api/tools",
    }),

  getOne: (id: number) => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid tool id: id must be a positive number"));
    }
    return apiCall<ToolDto>({
      url: `/api/tools/${id}`,
    });
  },

  getHistory: (id: number) => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid tool id: id must be a positive number"));
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

  getByTemplate: (templateId: number) =>
    apiCall<ToolDto[]>({
      url: `/api/tools/template/${templateId}`,
    }),

  uploadImage: (toolId: number, formData: FormData) =>
    apiCall<any>({
      url: `/api/tools/${toolId}/images`,
      method: "POST",
      data: formData,
      isMultipart: true,
    }),

  getImageDetails: (imageId: number) =>
    apiCall<any>({
      url: `/api/tools/images/${imageId}`,
    }),

  deleteImage: (imageId: number) =>
    apiCall<void>({
      url: `/api/tools/images/${imageId}`,
      method: "DELETE",
    }),
};
