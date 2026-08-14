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

  getByCategory: (categoryId: string) => {
    if (!categoryId) {
      return Promise.reject(new Error("Invalid category id"));
    }
    return apiCall<TemplateDto[]>({
      url: `/api/templates`,
      params: { categoryId },
    });
  },

  getFull: (id: string) => {
    if (!id) {
      return Promise.reject(new Error("Invalid template id"));
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
