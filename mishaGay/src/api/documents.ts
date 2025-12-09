import { apiCall } from "./client";
import { Document, CreateDocumentDto, DocumentDetail } from "../types/document.types";

export const documentsAPI = {
  getAll: (): Promise<Document[]> => {
    return apiCall<Document[]>("/api/admin/documents");
  },
  
  getById: (id: number): Promise<DocumentDetail> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid document id: id must be a positive number"));
    }
    return apiCall<DocumentDetail>(`/api/admin/documents/${id}`);
  },
  
  create: (documentData: CreateDocumentDto): Promise<Document> => {
    return apiCall<Document>("/api/admin/documents/create", {
      method: "POST",
      body: documentData
    });
  },
  
  close: (id: number): Promise<void> => {
    if (!id || isNaN(id) || id <= 0) {
      return Promise.reject(new Error("Invalid document id: id must be a positive number"));
    }
    return apiCall<void>(`/api/admin/documents/${id}/close`, {
      method: "POST"
    });
  }
};

