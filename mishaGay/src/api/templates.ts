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
const requestDb = db;
    if (networkStore.isOffline) {
      return (await requestDb.templates.toArray()) as TemplateDto[];
    }
    try {
      const templates = await apiCall<TemplateDto[]>({
        url: "/api/templates",
      });
      if (Array.isArray(templates) && templates.length > 0) {
        requestDb.transaction('rw', requestDb.templates, async () => {
          for (const template of templates) await requestDb.templates.put({ ...await requestDb.templates.get(template.id), ...template });
        }).catch(err => console.warn("Failed to cache templates to Dexie", err));
      }
      return templates;
    } catch (e: any) {
      console.warn("Failed to fetch templates, falling back to offline", e);
      networkStore.setManualOffline(true);
      return (await requestDb.templates.toArray()) as TemplateDto[];
    }
  },

  getByCategory: async (categoryId: string) => {
const requestDb = db;
    if (!categoryId) {
      return Promise.reject(new Error("Invalid category id"));
    }
    const allTmpls = await requestDb.templates.toArray();
    const local = allTmpls.filter((t: any) => String(t.categoryId) === String(categoryId)) as TemplateDto[];

    if (local.length > 0) {
      if (!networkStore.isOffline) {
        apiCall<TemplateDto[]>({
          url: `/api/templates`,
          params: { categoryId },
        }).then(templates => {
          if (Array.isArray(templates) && templates.length > 0) {
            requestDb.transaction('rw', requestDb.templates, async () => {
          for (const template of templates) await requestDb.templates.put({ ...await requestDb.templates.get(template.id), ...template });
        }).catch(() => {});
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
      requestDb.transaction('rw', requestDb.templates, async () => {
          for (const template of templates) await requestDb.templates.put({ ...await requestDb.templates.get(template.id), ...template });
        }).catch(err => console.warn("Failed to cache templates to Dexie", err));
    }
    return templates;
  },

  getFull: async (id: string) => {
const requestDb = db;
    if (!id) {
      return Promise.reject(new Error("Invalid template id"));
    }

    // Офлайн-режим: возвращаем из кеша
    if (networkStore.isOffline) {
      const tmpls = await requestDb.templates.toArray();
      const tmpl = tmpls.find((t: any) => String(t.id) === String(id));
      const allTools = await requestDb.tools.toArray();
      const localTools = allTools.filter((t: any) => String(t.templateId || t.template?.id || t.toolTemplateId) === String(id));
      if (!tmpl) {
        throw new Error('Модель отсутствует в локальном каталоге. Выполните синхронизацию.');
      }
      return { ...tmpl, tools: localTools } as TemplateFullDto;
    }

    // Онлайн: всегда запрашиваем свежие данные с сервера (статусы инструментов могут измениться)
    const full = await apiCall<TemplateFullDto>({
      url: `/api/templates/${id}`,
    });
    if (full) {
      requestDb.templates.put({ ...full }).catch(() => {});
      if (Array.isArray(full.tools) && full.tools.length > 0) {
        const normalized = full.tools.map((t: any) => ({
          ...t,
          templateId: t.templateId || full.id
        }));
        requestDb.tools.bulkPut(normalized).catch(() => {});
      }
    }
    return full;
  },

  create: async (data: CreateTemplateRequest) => {
const requestDb = db;
    if (networkStore.isOffline) {
      throw new Error('Создание каталога доступно только онлайн. Подключитесь к серверу.');
    }
    const created = await apiCall<TemplateDto>({
      url: "/api/templates",
      method: "POST",
      data,
    });
    if (created) {
      requestDb.templates.put(created).catch(() => {});
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
