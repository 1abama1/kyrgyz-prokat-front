export interface CreateBookingRequest {
  clientName: string;
  clientPhone?: string;
  templateId: string;
  toolInstanceId: number;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  comment?: string;
}

export interface BookingDto {
  id: string;
  clientName: string;
  clientPhone?: string;
  templateId: string;
  templateName: string;
  toolInstanceId: number;
  toolInstanceNumber?: number;
  startDateTime: string;
  endDateTime: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
  comment?: string;
  createdAt: string;
}
