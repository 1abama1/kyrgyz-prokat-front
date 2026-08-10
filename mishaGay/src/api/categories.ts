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

  getFull: (id: string) => {
    if (!id) {
      return Promise.reject(new Error("Invalid category id"));
    }
    return apiCall<CategoryFullDto>({
      url: `/api/categories/${id}/full`,
    });
  },

  getAllFull: () =>
    apiCall<CategoryFullDto[]>({
      url: "/api/categories/all/full",
    }),


  create: (data: CreateCategoryRequest) =>
    apiCall<CategoryDto>({
      url: "/api/categories",
      method: "POST",
      data,
    }),
};
