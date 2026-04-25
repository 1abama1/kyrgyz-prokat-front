import { apiCall } from "./client";
import type { RentalDocument } from "../types/RentalDocument";

export interface RentRequest {
  toolId: number;
  clientId: number;
  rentDays: number;
  pricePerDay: number;
}

export interface ReturnRequest {
  contractId: number;
}

export const rentAPI = {
  rentTool: (data: RentRequest) =>
    apiCall<RentalDocument>({
      url: "/api/rent",
      method: "POST",
      data,
    }),

  returnTool: (data: ReturnRequest) =>
    apiCall<{ status: string; contractId: number; message: string }>({
      url: "/api/rent/return",
      method: "POST",
      data,
    }),
};
