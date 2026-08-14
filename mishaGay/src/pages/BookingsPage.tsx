import { useEffect, useState, useMemo } from "react";
import { Layout } from "../components/Layout";
import { bookingsAPI } from "../api/bookings";
import { BookingDto } from "../types/booking.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { useSearchParams } from "react-router-dom";
import "../styles/tools.css";

export const BookingsPage = () => {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchParams] = useSearchParams();
  const highlightedBookingId = searchParams.get("id");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingsAPI.getAllBookings();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки бронирований");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm("Вы уверены, что хотите отменить эту бронь?")) return;
    try {
      await bookingsAPI.cancelBooking(id);
      await loadBookings();
    } catch (err: any) {
      setError(err.message || "Ошибка при отмене брони");
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchQuery = 
        b.clientName.toLowerCase().includes(q) ||
        (b.clientPhone && b.clientPhone.toLowerCase().includes(q)) ||
        b.templateName.toLowerCase().includes(q) ||
        (b.comment && b.comment.toLowerCase().includes(q));
        
      return matchStatus && matchQuery;
    });
  }, [bookings, searchQuery, statusFilter]);

  if (loading) {
    return <Layout><div className="tools-loading"><p>Загрузка...</p></div></Layout>;
  }

  return (
    <Layout>
      <div className="tools-page">
        <div className="tools-page-header">
          <h1 className="tools-page-title">Бронирования</h1>
        </div>

        <ErrorMessage error={error} onClose={() => setError(null)} />

        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Поиск по ФИО, телефону, модели, комментарию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, maxWidth: "500px" }}
          />
          
          <select 
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "200px" }}
          >
            <option value="ALL">Все статусы</option>
            <option value="ACTIVE">Активные</option>
            <option value="COMPLETED">Завершенные</option>
            <option value="CANCELLED">Отмененные</option>
          </select>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="tools-empty">
            <p>Бронирования не найдены.</p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f9fafb" }}>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Клиент</th>
                  <th style={{ padding: "12px 16px" }}>Инструмент</th>
                  <th style={{ padding: "12px 16px" }}>Начало</th>
                  <th style={{ padding: "12px 16px" }}>Окончание</th>
                  <th style={{ padding: "12px 16px" }}>Статус</th>
                  <th style={{ padding: "12px 16px" }}>Комментарий</th>
                  <th style={{ padding: "12px 16px" }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const isHighlighted = b.id === highlightedBookingId;
                  return (
                    <tr 
                      key={b.id} 
                      style={{ 
                        borderBottom: "1px solid #eee",
                        backgroundColor: isHighlighted ? "#eff6ff" : "transparent"
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "bold" }}>{b.clientName}</div>
                        {b.clientPhone && <div style={{ fontSize: "12px", color: "#666" }}>{b.clientPhone}</div>}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div>{b.templateName}</div>
                        <div style={{ fontSize: "12px", color: "#666" }}>Экз. №{b.toolInstanceNumber ?? b.toolInstanceId}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>{new Date(b.startDateTime).toLocaleString()}</td>
                      <td style={{ padding: "12px 16px" }}>{new Date(b.endDateTime).toLocaleString()}</td>
                      <td style={{ padding: "12px 16px" }}>
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
                      <td style={{ padding: "12px 16px", maxWidth: "200px" }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={b.comment || ""}>
                          {b.comment || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};
