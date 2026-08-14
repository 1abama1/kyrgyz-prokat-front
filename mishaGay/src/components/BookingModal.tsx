import { FC, useEffect, useState } from "react";
import { bookingsAPI } from "../api/bookings";
import { ErrorMessage } from "./ErrorMessage";
import { DatePicker } from "./DatePicker";
import "../styles/tools.css";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  toolInstanceId: number;
  toolInstanceNumber?: number;
  templateId: string;
  templateName: string;
}

export const BookingModal: FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  toolInstanceId,
  toolInstanceNumber,
  templateId,
  templateName,
}) => {
  const [clientName, setClientName] = useState<string>("");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setClientName("");
      setClientPhone("");
      setStartDate(new Date());
      setEndDate(null);
      setComment("");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!clientName.trim() || !startDate || !endDate) {
      setError("Пожалуйста, заполните все обязательные поля (ФИО, Даты)");
      return;
    }

    if (startDate >= endDate) {
      setError("Дата начала должна быть раньше даты окончания");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await bookingsAPI.createBooking({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        templateId,
        toolInstanceId,
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        comment
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || "Ошибка при создании бронирования");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content" style={contentStyle}>
        <h2>Забронировать инструмент</h2>
        <p>Модель: <strong>{templateName}</strong></p>
        <p>Экземпляр: <strong>№{toolInstanceNumber ?? toolInstanceId}</strong></p>

        <ErrorMessage error={error} onClose={() => setError(null)} />

        <div style={{ marginTop: 20 }}>
          <label>ФИО клиента *</label>
          <input
            type="text"
            className="form-input"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            placeholder="Введите ФИО"
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <label>Номер телефона</label>
          <input
            type="text"
            className="form-input"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "5px" }}
            placeholder="Введите номер телефона"
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <label>Дата начала *</label>
          <DatePicker
            value={startDate}
            onChange={(date) => setStartDate(date)}
            placeholder="Выберите дату начала"
            style={{ marginTop: "5px" }}
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <label>Дата окончания *</label>
          <DatePicker
            value={endDate}
            onChange={(date) => setEndDate(date)}
            minDate={startDate || undefined}
            placeholder="Выберите дату окончания"
            style={{ marginTop: "5px" }}
            placement="top"
          />
        </div>

        <div style={{ marginTop: 15 }}>
          <label>Комментарий</label>
          <textarea
            className="form-input"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{ width: "100%", padding: "8px", marginTop: "5px", minHeight: "80px" }}
            placeholder="Необязательно"
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Отмена
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Бронируем..." : "Забронировать"}
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
  padding: "20px"
};

const contentStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: "24px",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "560px",
  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
  position: "relative",
  margin: "auto",
};
