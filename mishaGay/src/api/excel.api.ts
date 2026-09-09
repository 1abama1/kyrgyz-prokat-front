import { api } from "./axios";
import { ContractDto } from "../types/Contract";

export const downloadContractExcel = async (contractId: number) => {
  const response = await api.get(
    `/api/admin/contracts/${contractId}/excel`,
    {
      responseType: "blob", // 🔴 КРИТИЧНО
    }
  );

  return response.data as Blob;
};

export const getContracts = async (): Promise<ContractDto[]> => {
  // Бек возвращает Page<RentalDocumentDto>, а не массив — извлекаем content
  const response = await api.get<{ content: ContractDto[] } | ContractDto[]>(
    "/api/admin/contracts?page=0&size=1000"
  );
  const data = response.data;
  // Spring Page имеет поле content; если вдруг пришёл массив — работаем с ним тоже
  return Array.isArray(data) ? data : (data as { content: ContractDto[] }).content ?? [];
};
