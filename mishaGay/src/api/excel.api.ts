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
  const response = await api.get<ContractDto[]>("/api/admin/contracts");
  return response.data;
};
