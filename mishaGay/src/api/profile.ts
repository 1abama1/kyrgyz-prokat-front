import { apiCall } from "./client";

export interface UserProfile {
  id: number;
  fullName: string;
  birthDate: string | null;
  residentialAddress: string | null;
  registeredAddress: string | null;
  email: string | null;
  phone: string | null;
  consentPersonalData: boolean;
  consentPrivacyPolicy: boolean;
  consentUserAgreement: boolean;
  simpleMode: boolean;
}

export const profileAPI = {
  getMe: () => apiCall<UserProfile>("/api/profile/me")
};
