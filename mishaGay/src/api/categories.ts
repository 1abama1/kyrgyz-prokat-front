import { apiCall } from "./client";
import {
  CategoryDto,
  CategoryFullDto,
  CreateCategoryRequest,
} from "../types/inventory.types";

export const categoriesAPI = {
  getAll: () =>
    apiCall<CategoryDto[]>({
      url: "/api/categories",
    }),

  getFull: (id: number) => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid category id: id must be a positive number"));
    }
    return apiCall<CategoryFullDto>({
      url: `/api/categories/${id}/full`,
    });
  },

  create: (data: CreateCategoryRequest) =>
    apiCall<CategoryDto>({
      url: "/api/categories",
      method: "POST",
      data,
    }),
};
