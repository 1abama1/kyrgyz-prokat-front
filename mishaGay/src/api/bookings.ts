import { apiCall } from "./client";
import { BookingDto, CreateBookingRequest } from "../types/booking.types";

export const bookingsAPI = {
  createBooking: (data: CreateBookingRequest) =>
    apiCall<BookingDto>({
      url: "/api/bookings",
      method: "POST",
      data,
    }),

  cancelBooking: (id: string) =>
    apiCall<BookingDto>({
      url: `/api/bookings/${id}/cancel`,
      method: "POST",
    }),

  getByTemplate: (templateId: string) =>
    apiCall<BookingDto[]>({
      url: `/api/bookings/template/${templateId}`,
    }),
};
