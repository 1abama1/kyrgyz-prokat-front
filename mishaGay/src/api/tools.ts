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
};
