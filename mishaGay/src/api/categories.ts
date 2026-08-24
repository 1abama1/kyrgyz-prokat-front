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
    const local = (await db.categories.toArray()) as CategoryDto[];
    if (local.length > 0) {
      if (!networkStore.isOffline) {
        apiCall<CategoryDto[]>({
          url: "/api/categories",
        }).then(categories => {
          if (Array.isArray(categories) && categories.length > 0) {
            db.categories.bulkPut(categories).catch(() => {});
          }
        }).catch(() => {});
      }
      return local;
    }

    if (networkStore.isOffline) {
      return [];
    }

    const categories = await apiCall<CategoryDto[]>({
      url: "/api/categories",
    });
    if (Array.isArray(categories) && categories.length > 0) {
      db.categories.bulkPut(categories).catch(err => console.warn("Failed to cache categories to Dexie", err));
    }
    return categories;
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
    if (networkStore.isOffline) {
      const cats = await db.categories.toArray();
      const tmpls = await db.templates.toArray();
      const tools = await db.tools.toArray();
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
            tmplsToSave.push({ id: t.id, name: t.name, categoryId: c.id });
            if (Array.isArray(t.tools)) {
              t.tools.forEach(tool => {
                toolsToSave.push({ ...tool, templateId: t.id });
              });
            }
          });
        }
      });
      if (catsToSave.length > 0) db.categories.bulkPut(catsToSave).catch(() => {});
      if (tmplsToSave.length > 0) db.templates.bulkPut(tmplsToSave).catch(() => {});
      if (toolsToSave.length > 0) db.tools.bulkPut(toolsToSave).catch(() => {});
    }
    return full;
  },


  create: async (data: CreateCategoryRequest) => {
    if (networkStore.isOffline) {
      const localId = crypto.randomUUID();
      const localCat = { id: localId, name: data.name };
      await db.categories.put(localCat);
      return localCat as CategoryDto;
    }
    const created = await apiCall<CategoryDto>({
      url: "/api/categories",
      method: "POST",
      data,
    });
    if (created) {
      db.categories.put(created).catch(() => {});
    }
    return created;
  },
};
