import { apiCall } from "./client";
import { BookingDto, CreateBookingRequest } from "../types/booking.types";
import { networkStore } from "../store/networkStore";
import { db } from "../db/db";

export const bookingsAPI = {
  createBooking: async (data: CreateBookingRequest) => {
    if (networkStore.isOffline) {
      const localId = crypto.randomUUID();
      const localBooking: BookingDto = {
        id: localId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        templateId: data.templateId,
        templateName: "Забронировано (офлайн)",
        toolInstanceId: data.toolInstanceId,
        startDateTime: data.startDateTime,
        endDateTime: new Date(new Date(data.startDateTime).getTime() + (data.hours || 1) * 3600000).toISOString(),
        status: "ACTIVE",
        comment: data.comment,
        createdAt: new Date().toISOString(),
      };
      await db.bookings.put(localBooking);
      return localBooking;
    }
    const created = await apiCall<BookingDto>({
      url: "/api/bookings",
      method: "POST",
      data,
    });
    if (created) {
      db.bookings.put(created).catch(() => {});
    }
    return created;
  },

  cancelBooking: async (id: string) => {
    if (networkStore.isOffline) {
      await db.bookings.update(id, { status: "CANCELLED" });
      return { id, status: "CANCELLED" } as BookingDto;
    }
    const res = await apiCall<BookingDto>({
      url: `/api/bookings/${id}/cancel`,
      method: "POST",
    });
    if (res) {
      db.bookings.update(id, { status: "CANCELLED" }).catch(() => {});
    }
    return res;
  },

  getAllBookings: async () => {
    if (networkStore.isOffline) {
      return (await db.bookings.toArray()) as BookingDto[];
    }
    const list = await apiCall<BookingDto[]>({
      url: "/api/bookings",
    });
    if (Array.isArray(list) && list.length > 0) {
      db.bookings.bulkPut(list).catch(() => {});
    }
    return list;
  },

  getByTemplate: async (templateId: string) => {
    if (networkStore.isOffline) {
      const all = await db.bookings.toArray();
      return all.filter((b: any) => String(b.templateId) === String(templateId)) as BookingDto[];
    }
    const list = await apiCall<BookingDto[]>({
      url: `/api/bookings/template/${templateId}`,
    });
    if (Array.isArray(list) && list.length > 0) {
      db.bookings.bulkPut(list).catch(() => {});
    }
    return list;
  },

  getByToolInstance: async (toolInstanceId: number) => {
    if (networkStore.isOffline) {
      const all = await db.bookings.toArray();
      return all.filter((b: any) => b.toolInstanceId === toolInstanceId) as BookingDto[];
    }
    const list = await apiCall<BookingDto[]>({
      url: `/api/bookings/tool/${toolInstanceId}`,
    });
    if (Array.isArray(list) && list.length > 0) {
      db.bookings.bulkPut(list).catch(() => {});
    }
    return list;
  },
};
