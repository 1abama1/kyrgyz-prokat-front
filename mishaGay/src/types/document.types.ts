import type { Client } from './client.types';
import type { Tool } from './tool.types';

export enum DocumentStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  TERMINATED = "TERMINATED"
}

export interface Document {
  id: number;
  contractNumber: string;
  clientId: number;
  clientName: string;
  toolId: number | null; // Может быть null для старых документов
  toolName: string;
  amount: number;
  startDateTime?: string;
  status: DocumentStatus;
  createdAt: string;
  returnDate?: string;
  comment?: string;
}

export interface CreateDocumentDto {
  contractNumber: string;
  clientId: number;
  toolId: number;
  price: number;
}

export interface DocumentDetail extends Document {
  client?: Client; // Может быть undefined, если данные не загружены
  tool: Tool | null; // Может быть null для старых документов
}

