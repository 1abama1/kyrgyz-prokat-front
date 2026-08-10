export interface CreateBookingRequest {
  clientId: number;
  templateId: string;
  startDateTime: string; // ISO 8601
  endDateTime: string;   // ISO 8601
  comment?: string;
}

export interface BookingDto {
  id: string;
  clientId: number;
  clientName: string;
  templateId: string;
  templateName: string;
  startDateTime: string;
  endDateTime: string;
  status: "ACTIVE" | "CANCELLED" | "COMPLETED";
  comment?: string;
  createdAt: string;
}
