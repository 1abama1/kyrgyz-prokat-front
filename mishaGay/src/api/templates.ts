import { apiCall } from "./client";
import {
  TemplateDto,
  TemplateFullDto,
  CreateTemplateRequest,
} from "../types/inventory.types";

export const templatesAPI = {
  getAll: () =>
    apiCall<TemplateDto[]>({
      url: "/api/templates",
    }),

  getByCategory: (categoryId: number) => {
    if (!categoryId || isNaN(categoryId) || categoryId <= 0) {
      return Promise.reject(new Error("Invalid category id: id must be a positive number"));
    }
    return apiCall<TemplateDto[]>({
      url: `/api/templates`,
      params: { categoryId },
    });
  },

  getFull: (id: number) => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid template id: id must be a positive number"));
    }
    return apiCall<TemplateFullDto>({
      url: `/api/templates/${id}`,
    });
  },

  create: (data: CreateTemplateRequest) =>
    apiCall<TemplateDto>({
      url: "/api/templates",
      method: "POST",
      data,
    }),
};
