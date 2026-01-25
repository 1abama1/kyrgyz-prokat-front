import type { Document } from "./document.types";

export const CLIENT_TAGS = [
  "Постоянник",
  "Должник",
  "Проблемный"
] as const;

export type ClientTag = (typeof CLIENT_TAGS)[number];

export interface AddressDto {
  region?: string;
  street?: string;
}

export interface PassportDto {
  series?: string;
  number?: string;
  issuedBy?: string;
  subdivisionCode?: string;
  issueDate?: string; // YYYY-MM-DD
  inn?: string;
}

export interface ClientImageMeta {
  id: number;
  fileName: string;
  fileType: string;
}

export interface CreateClientDto {
  fullName: string;
  phone: string;
  whatsappPhone?: string;
  email?: string;
  registrationAddress?: AddressDto;
  livingAddress?: AddressDto;
  objectAddress?: string;
  birthDate?: string;
  comment?: string;
  tag?: ClientTag;
  passport?: PassportDto;
}

export interface Client {
  id: number;
  fullName: string;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  registrationAddress?: AddressDto | null;
  livingAddress?: AddressDto | null;
  objectAddress?: string | null;
  birthDate?: string | null;
  comment?: string | null;
  tag?: ClientTag | null;
  passport?: PassportDto | null;
  images?: ClientImageMeta[];
  createdAt?: string | null;
  documents?: Document[];
}

// Новый тип — карточка клиента (ответ от /card)
export interface ActiveContractDto {
  id: number;
  contractNumber: string;
  toolName?: string | null;
  serialNumber?: string | null;
  startDate?: string | null; // ISO date
}

export interface ContractHistoryDto {
  id: number;
  contractNumber: string;
  toolName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ClientCard {
  id: number;
  fullName: string;
  phone?: string | null;
  whatsappPhone?: string | null;
  email?: string | null;
  registrationAddress?: AddressDto | null;
  livingAddress?: AddressDto | null;
  objectAddress?: string | null;
  tag?: string | null;
  hasActiveContract?: boolean;
  activeContractId?: number | null;
  activeContractNumber?: string | null;
  createdAt?: string | null;
  activeContracts: ActiveContractDto[];
  history: ContractHistoryDto[];
}

