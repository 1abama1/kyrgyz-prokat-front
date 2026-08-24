import { apiCall } from "./client";
import {
  TemplateDto,
  TemplateFullDto,
  CreateTemplateRequest,
} from "../types/inventory.types";
import { networkStore } from "../store/networkStore";
import { db } from "../db/db";

export const templatesAPI = {
  getAll: async () => {
    if (networkStore.isOffline) {
      return (await db.templates.toArray()) as TemplateDto[];
    }
    const templates = await apiCall<TemplateDto[]>({
      url: "/api/templates",
    });
    if (Array.isArray(templates) && templates.length > 0) {
      db.templates.bulkPut(templates).catch(err => console.warn("Failed to cache templates to Dexie", err));
    }
    return templates;
  },

  getByCategory: async (categoryId: string) => {
    if (!categoryId) {
      return Promise.reject(new Error("Invalid category id"));
    }
    const allTmpls = await db.templates.toArray();
    const local = allTmpls.filter((t: any) => String(t.categoryId) === String(categoryId)) as TemplateDto[];

    if (local.length > 0) {
      if (!networkStore.isOffline) {
        apiCall<TemplateDto[]>({
          url: `/api/templates`,
          params: { categoryId },
        }).then(templates => {
          if (Array.isArray(templates) && templates.length > 0) {
            db.templates.bulkPut(templates).catch(() => {});
          }
        }).catch(() => {});
      }
      return local;
    }

    if (networkStore.isOffline) {
      return [];
    }

    const templates = await apiCall<TemplateDto[]>({
      url: `/api/templates`,
      params: { categoryId },
    });
    if (Array.isArray(templates) && templates.length > 0) {
      db.templates.bulkPut(templates).catch(err => console.warn("Failed to cache templates to Dexie", err));
    }
    return templates;
  },

  getFull: async (id: string) => {
    if (!id) {
      return Promise.reject(new Error("Invalid template id"));
    }
    const tmpls = await db.templates.toArray();
    const tmpl = tmpls.find((t: any) => String(t.id) === String(id));
    const allTools = await db.tools.toArray();
    const localTools = allTools.filter((t: any) => String(t.templateId || t.template?.id || t.toolTemplateId) === String(id));

    if (tmpl && localTools.length > 0) {
      if (!networkStore.isOffline) {
        apiCall<TemplateFullDto>({
          url: `/api/templates/${id}`,
        }).then(full => {
          if (full) {
            db.templates.put({ id: full.id, name: full.name, categoryId: full.categoryId }).catch(() => {});
            if (Array.isArray(full.tools) && full.tools.length > 0) {
              const normalized = full.tools.map((t: any) => ({
                ...t,
                templateId: t.templateId || full.id
              }));
              db.tools.bulkPut(normalized).catch(() => {});
            }
          }
        }).catch(() => {});
      }
      return { ...tmpl, tools: localTools } as TemplateFullDto;
    }

    if (networkStore.isOffline) {
      if (!tmpl) {
        return { id, name: "Модель", categoryId: "", dailyRentalPrice: 0, depositAmount: 0, purchasePrice: 0, tools: [] } as TemplateFullDto;
      }
      return { ...tmpl, tools: localTools } as TemplateFullDto;
    }

    const full = await apiCall<TemplateFullDto>({
      url: `/api/templates/${id}`,
    });
    if (full) {
      db.templates.put({ id: full.id, name: full.name, categoryId: full.categoryId }).catch(() => {});
      if (Array.isArray(full.tools) && full.tools.length > 0) {
        const normalized = full.tools.map((t: any) => ({
          ...t,
          templateId: t.templateId || full.id
        }));
        db.tools.bulkPut(normalized).catch(() => {});
      }
    }
    return full;
  },

  create: async (data: CreateTemplateRequest) => {
    if (networkStore.isOffline) {
      const localId = crypto.randomUUID();
      const localTmpl = {
        id: localId,
        name: data.name,
        categoryId: data.categoryId,
        dailyRentalPrice: data.dailyRentalPrice || 0,
        depositAmount: data.depositAmount || 0,
        purchasePrice: data.purchasePrice || 0
      };
      await db.templates.put(localTmpl);
      return localTmpl as TemplateDto;
    }
    const created = await apiCall<TemplateDto>({
      url: "/api/templates",
      method: "POST",
      data,
    });
    if (created) {
      db.templates.put(created).catch(() => {});
    }
    return created;
  },

  checkAvailability: (id: string, start: string, end: string) =>
    apiCall<any>({
      url: `/api/templates/${id}/availability`,
      params: { start, end },
    }),

  update: (id: string, data: import("../types/inventory.types").UpdateTemplateRequest) =>
    apiCall<TemplateDto>({
      url: `/api/templates/${id}`,
      method: "PUT",
      data,
    }),
};
