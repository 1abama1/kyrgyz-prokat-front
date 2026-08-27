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
      // Обновляем статус инструмента в кеше
      if (data.toolInstanceId) {
        await db.tools.update(data.toolInstanceId, { status: "BOOKED" });
      }
      return localBooking;
    }
    const created = await apiCall<BookingDto>({
      url: "/api/bookings",
      method: "POST",
      data,
    });
    if (created) {
      db.bookings.put(created).catch(() => {});
      // Обновляем статус инструмента в кеше сразу после создания брони
      if (data.toolInstanceId) {
        db.tools.update(data.toolInstanceId, { status: "BOOKED" }).catch(() => {});
      }
    }
    return created;
  },

  cancelBooking: async (id: string) => {
    if (networkStore.isOffline) {
      const booking = await db.bookings.get(id);
      await db.bookings.update(id, { status: "CANCELLED" });
      // Возвращаем статус инструмента в AVAILABLE
      if (booking?.toolInstanceId) {
        await db.tools.update(booking.toolInstanceId, { status: "AVAILABLE" });
      }
      return { id, status: "CANCELLED" } as BookingDto;
    }
    const res = await apiCall<BookingDto>({
      url: `/api/bookings/${id}/cancel`,
      method: "POST",
    });
    if (res) {
      const booking = await db.bookings.get(id);
      db.bookings.update(id, { status: "CANCELLED" }).catch(() => {});
      // Возвращаем статус инструмента в AVAILABLE
      if (booking?.toolInstanceId) {
        db.tools.update(booking.toolInstanceId, { status: "AVAILABLE" }).catch(() => {});
      }
    }
    return res;
  },

  deleteBooking: async (id: string) => {
    if (networkStore.isOffline) {
      await db.bookings.delete(id);
      return;
    }
    await apiCall({
      url: `/api/bookings/${id}`,
      method: "DELETE",
    });
    db.bookings.delete(id).catch(() => {});
  },

  getAllBookings: async () => {
    if (networkStore.isOffline) {
      return (await db.bookings.toArray()) as BookingDto[];
    }
    try {
      const list = await apiCall<BookingDto[]>({
        url: "/api/bookings",
      });
      if (Array.isArray(list) && list.length > 0) {
        db.bookings.bulkPut(list).catch(() => {});
      }
      return list;
    } catch (e: any) {
      console.warn("Failed to fetch bookings, falling back to offline", e);
      networkStore.setManualOffline(true);
      return (await db.bookings.toArray()) as BookingDto[];
    }
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

  getById: async (id: string) => {
    if (networkStore.isOffline) {
      return await db.bookings.get(id);
    }
    const res = await apiCall<BookingDto>({
      url: `/api/bookings/${id}`,
    });
    if (res) {
      db.bookings.put(res).catch(() => {});
    }
    return res;
  },
};
