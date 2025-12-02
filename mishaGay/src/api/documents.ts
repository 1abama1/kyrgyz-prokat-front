import { apiCall } from "./client";
import { Document, CreateDocumentDto, DocumentDetail } from "../types/document.types";

export const documentsAPI = {
  getAll: (): Promise<Document[]> => {
    return apiCall<Document[]>("/api/admin/documents");
  },
  
  getById: (id: number): Promise<DocumentDetail> => {
    return apiCall<DocumentDetail>(`/api/admin/documents/${id}`);
  },
  
  create: (documentData: CreateDocumentDto): Promise<Document> => {
    return apiCall<Document>("/api/admin/documents/create", {
      method: "POST",
      body: documentData
    });
  },
  
  close: (id: number): Promise<void> => {
    return apiCall<void>(`/api/admin/documents/${id}/close`, {
      method: "POST"
    });
  }
};

