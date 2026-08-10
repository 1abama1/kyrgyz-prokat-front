import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { templatesAPI } from "../api/templates";
import { bookingsAPI } from "../api/bookings";
import { clientsAPI } from "../api/clients";
import { TemplateFullDto } from "../types/inventory.types";
import { BookingDto } from "../types/booking.types";
import { Client } from "../types/client.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { toolStatusLabel, getToolStatusClass } from "../utils/toolStatus";
import { StyledSelect } from "../components/StyledSelect";
import { DatePicker } from "../components/DatePicker";
import "../styles/tools.css";

export const TemplateCardPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [template, setTemplate] = useState<TemplateFullDto | null>(null);
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Booking Form State
  const [bookingClientId, setBookingClientId] = useState<string>("");
  const [bookingStartDate, setBookingStartDate] = useState<Date | null>(null);
  const [bookingStartTime, setBookingStartTime] = useState<string>("10:00");
  const [bookingEndDate, setBookingEndDate] = useState<Date | null>(null);
  const [bookingEndTime, setBookingEndTime] = useState<string>("10:00");
  const [bookingComment, setBookingComment] = useState<string>("");
  const [creatingBooking, setCreatingBooking] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("ID модели не указан");
      setLoading(false);
      return;
    }
    loadData(id);
    clientsAPI.getAll().then(setClients).catch(() => {});
  }, [id]);

  const loadData = async (templateId: string) => {
    try {
      setLoading(true);
      setError(null);
      const tmpl = await templatesAPI.getFull(templateId);
      setTemplate(tmpl);
      const bks = await bookingsAPI.getByTemplate(templateId);
      setBookings(bks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки модели");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!id) return;
    if (!bookingClientId || !bookingStartDate || !bookingEndDate) {
      setError("Заполните клиента, начало и окончание брони");
      return;
    }
    try {
      setCreatingBooking(true);
      setError(null);

      const startYMD = `${bookingStartDate.getFullYear()}-${String(bookingStartDate.getMonth() + 1).padStart(2, '0')}-${String(bookingStartDate.getDate()).padStart(2, '0')}`;
      const endYMD = `${bookingEndDate.getFullYear()}-${String(bookingEndDate.getMonth() + 1).padStart(2, '0')}-${String(bookingEndDate.getDate()).padStart(2, '0')}`;

      await bookingsAPI.createBooking({
        templateId: id,
        clientId: Number(bookingClientId),
        startDateTime: `${startYMD}T${bookingStartTime}`,
        endDateTime: `${endYMD}T${bookingEndTime}`,
        comment: bookingComment,
      });

      setBookingClientId("");
      setBookingStartDate(null);
      setBookingStartTime("10:00");
      setBookingEndDate(null);
      setBookingEndTime("10:00");
      setBookingComment("");
      // Reload
      await loadData(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка создания брони");
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm("Отменить эту бронь?")) return;
    try {
      await bookingsAPI.cancelBooking(bookingId);
      if (id) await loadData(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка отмены брони");
    }
  };

  if (loading) {
    return <Layout><div className="tools-loading"><p>Загрузка...</p></div></Layout>;
  }

  if (!template) {
    return <Layout><ErrorMessage error="Модель не найдена" onClose={() => {}} /></Layout>;
  }

  return (
    <Layout>
      <div className="tools-page">
        <ErrorMessage error={error} onClose={() => setError(null)} />
        
        <div className="tool-card-header">
          <h1 className="tools-page-title">Модель: {template.name}</h1>
        </div>

        <div className="tool-card-info">
          <div className="tool-card-section">
            <h3 className="tool-card-section-title">Экземпляры ({template.tools.length})</h3>
            {template.tools.length === 0 ? (
              <p style={{ color: "#666" }}>Нет экземпляров</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                    <th style={{ padding: "8px" }}>№</th>
                    <th style={{ padding: "8px" }}>Инвентарный №</th>
                    <th style={{ padding: "8px" }}>Статус</th>
                    <th style={{ padding: "8px" }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {template.tools.map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px" }}>{idx + 1}</td>
                      <td style={{ padding: "8px" }}>{t.inventoryNumber}</td>
                      <td style={{ padding: "8px" }}>
                        <span className={getToolStatusClass(t.status as any)}>
                          {toolStatusLabel(t.status as any)}
                        </span>
                      </td>
                      <td style={{ padding: "8px" }}>
                        <button
                          onClick={() => navigate(`/tools/${t.id}`)}
                          style={{
                            background: "transparent",
                            border: "1px solid #2563eb",
                            color: "#2563eb",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="tool-card-section">
            <h3 className="tool-card-section-title">Бронирования</h3>
            
            <div style={{ background: "#f9fafb", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
              <h4>Создать бронь</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Клиент</label>
                  <StyledSelect
                    options={clients.map(c => ({ value: c.id, label: `${c.fullName} ${c.whatsappPhone ? `(${c.whatsappPhone})` : ""}` }))}
                    value={bookingClientId}
                    onChange={(val) => setBookingClientId(val ? String(val) : "")}
                    placeholder="Выберите клиента"
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Начало</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <DatePicker
                      value={bookingStartDate}
                      onChange={setBookingStartDate}
                      placeholder="Дата"
                      style={{ flex: 1, display: "block" }}
                    />
                    <input
                      type="time"
                      className="datepicker-input"
                      style={{ width: "100px" }}
                      value={bookingStartTime}
                      onChange={(e) => setBookingStartTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Окончание</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <DatePicker
                      value={bookingEndDate}
                      onChange={setBookingEndDate}
                      placeholder="Дата"
                      style={{ flex: 1, display: "block" }}
                    />
                    <input
                      type="time"
                      className="datepicker-input"
                      style={{ width: "100px" }}
                      value={bookingEndTime}
                      onChange={(e) => setBookingEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "14px" }}>Комментарий</label>
                  <input
                    type="text"
                    value={bookingComment}
                    onChange={(e) => setBookingComment(e.target.value)}
                    placeholder="Необязательно"
                    style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <button
                    className="btn-primary"
                    onClick={handleCreateBooking}
                    disabled={creatingBooking || !bookingClientId || !bookingStartDate || !bookingEndDate}
                  >
                    {creatingBooking ? "Создание..." : "Создать бронь"}
                  </button>
                </div>
              </div>
            </div>

            {bookings.length === 0 ? (
              <p style={{ color: "#666" }}>Нет активных броней</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                    <th style={{ padding: "8px" }}>Клиент</th>
                    <th style={{ padding: "8px" }}>Начало</th>
                    <th style={{ padding: "8px" }}>Окончание</th>
                    <th style={{ padding: "8px" }}>Статус</th>
                    <th style={{ padding: "8px" }}>Комментарий</th>
                    <th style={{ padding: "8px" }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: "8px", fontWeight: "bold" }}>{b.clientName}</td>
                      <td style={{ padding: "8px" }}>{new Date(b.startDateTime).toLocaleString()}</td>
                      <td style={{ padding: "8px" }}>{new Date(b.endDateTime).toLocaleString()}</td>
                      <td style={{ padding: "8px" }}>
                        <span style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          background: b.status === "ACTIVE" ? "#dcfce7" : b.status === "CANCELLED" ? "#fee2e2" : "#f3f4f6",
                          color: b.status === "ACTIVE" ? "#166534" : b.status === "CANCELLED" ? "#991b1b" : "#374151"
                        }}>
                          {b.status === "ACTIVE" ? "Активна" : b.status === "CANCELLED" ? "Отменена" : "Завершена"}
                        </span>
                      </td>
                      <td style={{ padding: "8px" }}>{b.comment || "—"}</td>
                      <td style={{ padding: "8px" }}>
                        {b.status === "ACTIVE" && (
                          <button
                            onClick={() => handleCancelBooking(b.id)}
                            style={{
                              background: "transparent",
                              border: "1px solid #dc2626",
                              color: "#dc2626",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                          >
                            Отменить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
