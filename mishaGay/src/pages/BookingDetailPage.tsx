import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { bookingsAPI } from "../api/bookings";
import { BookingDto } from "../types/booking.types";
import { ErrorMessage } from "../components/ErrorMessage";
import "../styles/tools.css";

export const BookingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadBooking(id);
    }
  }, [id]);

  const loadBooking = async (bookingId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingsAPI.getById(bookingId);
      if (!data) {
        throw new Error("Бронирование не найдено");
      }
      
      const bookingDto: BookingDto = {
        ...data,
        templateName: data.templateName || "Неизвестный инструмент",
        createdAt: data.createdAt || data.startDateTime,
      };
      
      setBooking(bookingDto);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки данных бронирования");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !window.confirm("Вы уверены, что хотите отменить эту бронь?")) return;
    try {
      await bookingsAPI.cancelBooking(booking.id);
      await loadBooking(booking.id);
    } catch (err: any) {
      setError(err.message || "Ошибка при отмене брони");
    }
  };

  if (loading) {
    return <Layout><div className="tools-loading"><p>Загрузка...</p></div></Layout>;
  }

  if (!booking) {
    return (
      <Layout>
        <div className="tools-page">
          <ErrorMessage error={error || "Бронирование не найдено"} onClose={() => setError(null)} />
          <button className="btn btn-secondary" onClick={() => navigate("/bookings")}>Вернуться к списку</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tools-page">
        <div className="tools-page-header">
          <h1 className="tools-page-title">Детали бронирования</h1>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate("/bookings")}
          >
            Назад к списку
          </button>
        </div>

        <ErrorMessage error={error} onClose={() => setError(null)} />

        <div style={{ background: "white", padding: "24px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", maxWidth: "800px" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", borderBottom: "1px solid #eee", paddingBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>Бронь от {new Date(booking.createdAt || booking.startDateTime).toLocaleDateString()}</h2>
              <div style={{ color: "#666" }}>ID: {booking.id}</div>
            </div>
            <span style={{
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: "500",
              background: booking.status === "ACTIVE" ? "#dcfce7" : booking.status === "CANCELLED" ? "#fee2e2" : "#f3f4f6",
              color: booking.status === "ACTIVE" ? "#166534" : booking.status === "CANCELLED" ? "#991b1b" : "#374151"
            }}>
              {booking.status === "ACTIVE" ? "Активна" : booking.status === "CANCELLED" ? "Отменена" : "Завершена"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>Информация о клиенте</h3>
              <div style={{ marginBottom: "8px" }}><span style={{ color: "#6b7280" }}>ФИО:</span> <strong>{booking.clientName}</strong></div>
              {booking.clientPhone && (
                <div><span style={{ color: "#6b7280" }}>Телефон:</span> <strong>{booking.clientPhone}</strong></div>
              )}
            </div>
            
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>Информация об инструменте</h3>
              <div style={{ marginBottom: "8px" }}><span style={{ color: "#6b7280" }}>Наименование:</span> <strong>{booking.templateName}</strong></div>
              <div><span style={{ color: "#6b7280" }}>Экземпляр №:</span> <strong>{booking.toolInstanceNumber ?? booking.toolInstanceId}</strong></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px", padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
            <div>
              <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "4px" }}>Начало аренды</div>
              <div style={{ fontWeight: "600", fontSize: "16px" }}>{new Date(booking.startDateTime).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: "13px", marginBottom: "4px" }}>Окончание аренды</div>
              <div style={{ fontWeight: "600", fontSize: "16px" }}>{new Date(booking.endDateTime).toLocaleString()}</div>
            </div>
          </div>

          {booking.comment && (
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", color: "#374151" }}>Комментарий</h3>
              <div style={{ padding: "12px", background: "#f3f4f6", borderRadius: "4px", color: "#4b5563" }}>
                {booking.comment}
              </div>
            </div>
          )}

          {booking.status === "ACTIVE" && (
            <div style={{ marginTop: "32px", borderTop: "1px solid #eee", paddingTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleCancelBooking}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "6px",
                  fontWeight: "500",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                Отменить бронь
              </button>
            </div>
          )}
          
        </div>
      </div>
    </Layout>
  );
};
