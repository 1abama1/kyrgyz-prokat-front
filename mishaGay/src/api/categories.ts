import { apiCall } from "./client";
import {
  CategoryDto,
  CategoryFullDto,
  CreateCategoryRequest,
} from "../types/inventory.types";
import { networkStore } from "../store/networkStore";
import { db } from "../db/db";

export const categoriesAPI = {
  getAll: async () => {
const requestDb = db;
    if (!networkStore.isOffline) {
      try {
        const categories = await apiCall<CategoryDto[]>({
          url: "/api/categories",
        });
        if (Array.isArray(categories) && categories.length > 0) {
          // ✅ upsert — не стираем офлайн-созданные категории
          await requestDb.categories.bulkPut(categories).catch(() => {});
        }
        return categories;
      } catch (error) {
        console.warn("Failed to fetch categories from server, using local cache", error);
      }
    }

    return (await requestDb.categories.toArray()) as CategoryDto[];
  },

  getFull: (id: string) => {
    if (!id) {
      return Promise.reject(new Error("Invalid category id"));
    }
    return apiCall<CategoryFullDto>({
      url: `/api/categories/${id}/full`,
    });
  },

  getAllFull: async () => {
const requestDb = db;
    if (networkStore.isOffline) {
      const cats = await requestDb.categories.toArray();
      const tmpls = await requestDb.templates.toArray();
      const tools = await requestDb.tools.toArray();
      return (cats || []).map(c => ({
        ...c,
        templates: (tmpls || [])
          .filter((t: any) => String(t.categoryId) === String(c.id))
          .map((t: any) => ({
            ...t,
            tools: (tools || []).filter((tool: any) => {
              const toolTplId = tool.templateId || tool.template?.id || tool.toolTemplateId;
              return String(toolTplId) === String(t.id);
            })
          }))
      })) as CategoryFullDto[];
    }
    const full = await apiCall<CategoryFullDto[]>({
      url: "/api/categories/all/full",
    });
    if (Array.isArray(full) && full.length > 0) {
      const catsToSave = full.map(c => ({ id: c.id, name: c.name }));
      const tmplsToSave: any[] = [];
      const toolsToSave: any[] = [];
      full.forEach(c => {
        if (Array.isArray(c.templates)) {
          c.templates.forEach(t => {
            tmplsToSave.push({ ...t, categoryId: c.id });
            if (Array.isArray(t.tools)) {
              t.tools.forEach(tool => {
                toolsToSave.push({ ...tool, templateId: t.id });
              });
            }
          });
        }
      });
      if (catsToSave.length > 0) requestDb.categories.bulkPut(catsToSave).catch(() => {});
      if (tmplsToSave.length > 0) requestDb.templates.bulkPut(tmplsToSave).catch(() => {});
      if (toolsToSave.length > 0) requestDb.tools.bulkPut(toolsToSave).catch(() => {});
    }
    return full;
  },


  create: async (data: CreateCategoryRequest) => {
const requestDb = db;
    if (networkStore.isOffline) {
      throw new Error('Создание каталога доступно только онлайн. Подключитесь к серверу.');
    }
    const created = await apiCall<CategoryDto>({
      url: "/api/categories",
      method: "POST",
      data,
    });
    if (created) {
      requestDb.categories.put(created).catch(() => {});
    }
    return created;
  },
};
