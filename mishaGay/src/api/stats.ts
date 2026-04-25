import { apiCall } from "./client";

export interface StatsSummary {
  activeContracts: number;
  availableTools: number;
  rentedTools: number;
  brokenTools: number;
  revenueToday: number;
  revenueMonth: number;
}

export const statsAPI = {
  getSummary: () => apiCall<StatsSummary>("/api/stats/summary")
};
