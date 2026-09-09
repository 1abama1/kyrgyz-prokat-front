import { useEffect, useState, useMemo } from "react";
import { Layout } from "../components/Layout";
import { bookingsAPI } from "../api/bookings";
import { BookingDto } from "../types/booking.types";
import { ErrorMessage } from "../components/ErrorMessage";
import { useSearchParams, useNavigate } from "react-router-dom";
import "../styles/tools.css";

const SkeletonRow = () => (
  <tr>
    {[...Array(6)].map((_, i) => (
      <td key={i} style={{ padding: "12px 16px" }}>
        <div className="skeleton-cell" style={{ width: i === 4 ? 60 : i === 5 ? 80 : "75%" }} />
      </td>
    ))}
  </tr>
);

export const BookingsPage = () => {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
    const now = new Date();
    return bookings.filter(b => {
      const isOverdue = b.status === "ACTIVE" && new Date(b.endDateTime) < now;
      let matchStatus = true;
      if (statusFilter === "ACTIVE") {
        matchStatus = b.status === "ACTIVE" && !isOverdue;
      } else if (statusFilter === "OVERDUE") {
        matchStatus = isOverdue;
      } else if (statusFilter === "COMPLETED") {
        matchStatus = b.status === "COMPLETED";
      } else if (statusFilter === "CANCELLED") {
        matchStatus = b.status === "CANCELLED";
      }

      const q = searchQuery.toLowerCase();
      const matchQuery =
        b.clientName.toLowerCase().includes(q) ||
        (b.clientPhone && b.clientPhone.toLowerCase().includes(q)) ||
        b.templateName.toLowerCase().includes(q);

      return matchStatus && matchQuery;
    });
  }, [bookings, searchQuery, statusFilter]);

  const now = new Date();

  return (
    <Layout>
      <div className="tools-page">
        <div className="tools-page-header">
          <h1 className="tools-page-title">Бронирования</h1>
        </div>

        <ErrorMessage error={error} onClose={() => setError(null)} />

        <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
          <input
            type="text"
            className="form-input"
            placeholder="Поиск по ФИО, телефону, модели..."
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
            <option value="OVERDUE">Просроченные</option>
            <option value="COMPLETED">Завершенные</option>
            <option value="CANCELLED">Отмененные</option>
          </select>
        </div>

        {/* Счётчик результатов */}
        {!loading && (
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Найдено: <b>{filteredBookings.length}</b> из {bookings.length}
          </div>
        )}

        {!loading && filteredBookings.length === 0 ? (
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
                  <th style={{ padding: "12px 16px" }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                  : filteredBookings.map((b) => {
                      const isHighlighted = b.id === highlightedBookingId;
                      const isOverdue = b.status === "ACTIVE" && new Date(b.endDateTime) < now;
                      return (
                        <tr
                          key={b.id}
                          style={{
                            borderBottom: "1px solid #eee",
                            backgroundColor: isHighlighted
                              ? "#eff6ff"
                              : isOverdue
                              ? "#fef2f2"
                              : "transparent",
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
                          <td style={{ padding: "12px 16px" }}>
                            <div>{new Date(b.endDateTime).toLocaleString()}</div>
                            {isOverdue && (
                              <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 600, marginTop: 2 }}>
                                ⚠ Просрочено
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              background: b.status === "ACTIVE"
                                ? (isOverdue ? "#fee2e2" : "#dcfce7")
                                : b.status === "CANCELLED"
                                ? "#fee2e2"
                                : "#f3f4f6",
                              color: b.status === "ACTIVE"
                                ? (isOverdue ? "#991b1b" : "#166534")
                                : b.status === "CANCELLED"
                                ? "#991b1b"
                                : "#374151",
                            }}>
                              {b.status === "ACTIVE"
                                ? (isOverdue ? "Просрочена" : "Активна")
                                : b.status === "CANCELLED"
                                ? "Отменена"
                                : "Завершена"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                onClick={() => navigate(`/bookings/${b.id}`)}
                                style={{
                                  background: "#3b82f6",
                                  border: "none",
                                  color: "white",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                }}
                              >
                                Посмотреть
                              </button>
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
                            </div>
                          </td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};
