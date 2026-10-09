import { apiCall } from "./client";
import { ToolDto, CreateToolRequest } from "../types/inventory.types";
import { ToolHistoryEntry } from "../types/tool.types";
import { networkStore } from "../store/networkStore";
import { db } from "../db/db";

export const toolsAPI = {
  getAll: async () => {
const requestDb = db;
    if (networkStore.isOffline) {
      return (await requestDb.tools.toArray()) as ToolDto[];
    }
    try {
      const tools = await apiCall<ToolDto[]>({
        url: "/api/tools",
      });
      if (Array.isArray(tools) && tools.length > 0) {
        const normalizedTools = tools.map((t: any) => ({
          ...t,
          templateId: t.templateId || t.template?.id || t.toolTemplateId
        })) as unknown as import("../types/tool.types").Tool[];
        requestDb.tools.bulkPut(normalizedTools).catch(err => console.warn("Failed to cache tools to Dexie", err));
      }
      return tools;
    } catch (e: any) {
      console.warn("Failed to fetch tools, falling back to offline", e);
      networkStore.setManualOffline(true);
      return (await requestDb.tools.toArray()) as ToolDto[];
    }
  },

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

  create: async (data: CreateToolRequest) => {
const requestDb = db;
    if (networkStore.isOffline) {
      throw new Error('Создание каталога доступно только онлайн. Подключитесь к серверу.');
    }
    const created = await apiCall<ToolDto>({
      url: "/api/tools",
      method: "POST",
      data,
    });
    if (created) {
      requestDb.tools.put({ ...created, templateId: created.templateId || data.templateId } as unknown as import("../types/tool.types").Tool).catch(() => { });
    }
    return created;
  },

  createBatch: async (data: any) => {
const requestDb = db;
    if (networkStore.isOffline) {
      throw new Error('Создание каталога доступно только онлайн. Подключитесь к серверу.');
    }
    const tools = await apiCall<ToolDto[]>({
      url: "/api/tools/batch",
      method: "POST",
      data,
    });
    if (Array.isArray(tools) && tools.length > 0) {
      const normalized = tools.map((t: any) => ({
        ...t,
        templateId: t.templateId || data.templateId
      })) as unknown as import("../types/tool.types").Tool[];
      requestDb.tools.bulkPut(normalized).catch(() => { });
    }
    return tools;
  },

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
