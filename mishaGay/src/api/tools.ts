import { apiCall } from "./client";
import { ToolDto, CreateToolRequest } from "../types/inventory.types";
import { ToolHistoryEntry } from "../types/tool.types";
import { networkStore } from "../store/networkStore";
import { db } from "../db/db";

export const toolsAPI = {
  getAll: async () => {
    if (networkStore.isOffline) {
      return (await db.tools.toArray()) as ToolDto[];
    }
    try {
      const tools = await apiCall<ToolDto[]>({
        url: "/api/tools",
      });
      if (Array.isArray(tools) && tools.length > 0) {
        const normalizedTools = tools.map((t: any) => ({
          ...t,
          templateId: t.templateId || t.template?.id || t.toolTemplateId
        }));
        db.tools.bulkPut(normalizedTools).catch(err => console.warn("Failed to cache tools to Dexie", err));
      }
      return tools;
    } catch (e: any) {
      console.warn("Failed to fetch tools, falling back to offline", e);
      networkStore.setManualOffline(true);
      return (await db.tools.toArray()) as ToolDto[];
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
    if (networkStore.isOffline) {
      const allTools = await db.tools.toArray();
      const existingInTemplate = allTools.filter((t: any) => String(t.templateId || t.template?.id) === String(data.templateId));
      const maxInstNum = existingInTemplate.reduce((max: number, t: any) => Math.max(max, t.instanceNumber || 0), 0);
      const tmpls = await db.templates.toArray();
      const tmpl = tmpls.find((t: any) => String(t.id) === String(data.templateId));
      const fakeId = Date.now() + Math.floor(Math.random() * 1000);
      const newTool: ToolDto = {
        id: fakeId,
        name: tmpl?.name || "Новый инструмент",
        inventoryNumber: data.inventoryNumber || `OFFLINE-${fakeId}`,
        article: "",
        depositAmount: 0,
        purchasePrice: 0,
        dailyRentalPrice: 0,
        status: "AVAILABLE",
        instanceNumber: maxInstNum + 1,
        serialNumber: data.serialNumber,
        templateId: data.templateId,
      };
      await db.tools.put(newTool);
      return newTool;
    }
    const created = await apiCall<ToolDto>({
      url: "/api/tools",
      method: "POST",
      data,
    });
    if (created) {
      db.tools.put({ ...created, templateId: created.templateId || data.templateId }).catch(() => {});
    }
    return created;
  },

  createBatch: async (data: any) => {
    if (networkStore.isOffline) {
      const allTools = await db.tools.toArray();
      const existingInTemplate = allTools.filter((t: any) => String(t.templateId || t.template?.id) === String(data.templateId));
      const maxInstNum = existingInTemplate.reduce((max: number, t: any) => Math.max(max, t.instanceNumber || 0), 0);
      const tmpls = await db.templates.toArray();
      const tmpl = tmpls.find((t: any) => String(t.id) === String(data.templateId));
      
      const createdList: ToolDto[] = [];
      const count = data.count || 1;
      for (let i = 1; i <= count; i++) {
        const nextNum = maxInstNum + i;
        const fakeId = Date.now() + Math.floor(Math.random() * 1000) + i;
        const newTool: ToolDto = {
          id: fakeId,
          name: tmpl?.name || `Экземпляр #${nextNum}`,
          inventoryNumber: `OFFLINE-${fakeId}`,
          article: "",
          depositAmount: 0,
          purchasePrice: 0,
          dailyRentalPrice: 0,
          status: "AVAILABLE",
          instanceNumber: nextNum,
          templateId: data.templateId,
        };
        await db.tools.put(newTool);
        createdList.push(newTool);
      }
      return createdList;
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
      }));
      db.tools.bulkPut(normalized).catch(() => {});
    }
    return tools;
  },

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
