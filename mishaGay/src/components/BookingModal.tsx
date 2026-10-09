import { FC, useEffect, useState, useMemo, KeyboardEvent as ReactKeyboardEvent } from "react";
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
  dailyRentalPrice?: number;
  depositAmount?: number;
}

const PRESET_HOURS = [1, 2, 3, 4, 6, 12, 24];

export const BookingModal: FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  toolInstanceId,
  toolInstanceNumber,
  templateId,
  templateName,
  dailyRentalPrice = 0,
  depositAmount = 0,
}) => {
  const [clientName, setClientName] = useState<string>("" );
  const [clientPhone, setClientPhone] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [hours, setHours] = useState<number>(1);
  const [isCustomHours, setIsCustomHours] = useState<boolean>(false);
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ clientName?: string; startDate?: string }>({});

  useEffect(() => {
    if (isOpen) {
      setClientName("");
      setClientPhone("");
      setStartDate(new Date());
      setHours(1);
      setIsCustomHours(false);
      setComment("");
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Время окончания
  const endDate = useMemo(() => {
    if (!startDate || isNaN(hours) || hours <= 0) return null;
    return new Date(startDate.getTime() + hours * 3_600_000);
  }, [startDate, hours]);

  // Проверка даты в прошлом (с допуском 5 минут)
  const isPastDate = useMemo(() => {
    if (!startDate) return false;
    return startDate.getTime() < Date.now() - 5 * 60 * 1000;
  }, [startDate]);

  // Расчет примерной стоимости аренды
  const estimatedCost = useMemo(() => {
    if (!dailyRentalPrice || hours <= 0) return 0;
    if (hours >= 24) {
      const days = Math.ceil(hours / 24);
      return days * dailyRentalPrice;
    }
    // Пропорциональный или дневной расчёт
    return Math.round((dailyRentalPrice / 24) * hours);
  }, [dailyRentalPrice, hours]);

  const handleSubmit = async () => {
    const errors: { clientName?: string; startDate?: string } = {};
    if (!clientName.trim()) {
      errors.clientName = "Пожалуйста, укажите ФИО клиента";
    }
    if (!startDate) {
      errors.startDate = "Пожалуйста, выберите дату и время начала";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    setError(null);

    try {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localISO = `${startDate!.getFullYear()}-${pad(startDate!.getMonth() + 1)}-${pad(
        startDate!.getDate()
      )}T${pad(startDate!.getHours())}:${pad(startDate!.getMinutes())}:${pad(startDate!.getSeconds())}`;

      await bookingsAPI.createBooking({
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        templateId,
        toolInstanceId,
        startDateTime: localISO,
        hours: Math.max(1, hours || 1),
        comment: comment.trim(),
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Ошибка при создании бронирования";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay booking-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-content booking-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="booking-modal-header">
          <div className="booking-modal-header-titles">
            <h2 id="booking-title" className="booking-modal-title">
              Забронировать инструмент
            </h2>
            <div className="booking-modal-meta">
              <span>
                Модель: <strong>{templateName}</strong>
              </span>
              <span> · </span>
              <span>
                Экземпляр: <strong>№{toolInstanceNumber ?? toolInstanceId}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            className="booking-modal-close"
            onClick={onClose}
            aria-label="Закрыть модальное окно"
          >
            ×
          </button>
        </div>

        <ErrorMessage error={error} onClose={() => setError(null)} />

        {/* Сводка стоимости и залога (если известны) */}
        {(dailyRentalPrice > 0 || depositAmount > 0) && (
          <div className="booking-price-preview">
            {depositAmount > 0 && (
              <span className="booking-price-item">
                Залог: <strong>{depositAmount.toLocaleString("ru-RU")} сом</strong>
              </span>
            )}
            {depositAmount > 0 && dailyRentalPrice > 0 && <span className="booking-price-divider">·</span>}
            {dailyRentalPrice > 0 && (
              <span className="booking-price-item">
                Расчёт аренды: <strong>~{estimatedCost.toLocaleString("ru-RU")} сом</strong>
                {hours < 24 && <span className="booking-price-rate"> ({dailyRentalPrice} сом/сутки)</span>}
              </span>
            )}
          </div>
        )}

        <div className="booking-form">
          <div className="form-group">
            <label htmlFor="booking-client-name" className="form-label">
              ФИО клиента <span className="required-star">*</span>
            </label>
            <input
              id="booking-client-name"
              type="text"
              autoFocus
              className={`form-input ${fieldErrors.clientName ? "input-has-error" : ""}`}
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                if (fieldErrors.clientName) {
                  setFieldErrors((prev) => ({ ...prev, clientName: undefined }));
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Иванов Иван Иванович"
            />
            {fieldErrors.clientName && (
              <span className="form-field-error">{fieldErrors.clientName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="booking-client-phone" className="form-label">
              Номер телефона
            </label>
            <input
              id="booking-client-phone"
              type="tel"
              className="form-input"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="+996 (700) 12-34-56"
            />
          </div>

          <div className="form-group">
            <label htmlFor="booking-start-date" className="form-label">
              Дата и время начала <span className="required-star">*</span>
            </label>
            <div className="booking-datetime-row">
              <DatePicker
                value={startDate}
                onChange={(date) => {
                  if (startDate) {
                    date.setHours(startDate.getHours());
                    date.setMinutes(startDate.getMinutes());
                  } else {
                    date.setHours(9, 0, 0, 0);
                  }
                  setStartDate(date);
                  if (fieldErrors.startDate) {
                    setFieldErrors((prev) => ({ ...prev, startDate: undefined }));
                  }
                }}
                placeholder="Выберите дату начала"
                className={fieldErrors.startDate ? "input-has-error" : ""}
                style={{ flex: 1 }}
              />
              <input
                type="time"
                className="form-input booking-time-input"
                value={
                  startDate
                    ? `${startDate.getHours().toString().padStart(2, "0")}:${startDate
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")}`
                    : ""
                }
                onChange={(e) => {
                  if (!startDate) return;
                  const [timeHStr, timeMStr] = (e.target.value || "").split(":");
                  const parsedH = parseInt(timeHStr, 10);
                  const parsedM = parseInt(timeMStr, 10);
                  if (!isNaN(parsedH) && !isNaN(parsedM)) {
                    const newDate = new Date(startDate);
                    newDate.setHours(parsedH);
                    newDate.setMinutes(parsedM);
                    setStartDate(newDate);
                  }
                }}
                disabled={!startDate}
              />
            </div>
            {fieldErrors.startDate && (
              <span className="form-field-error">{fieldErrors.startDate}</span>
            )}
            {isPastDate && (
              <span className="form-field-warning">
                ⚠ Внимание: выбранное время уже прошло
              </span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Период аренды <span className="required-star">*</span>
            </label>
            <div className="booking-hours-chips">
              {PRESET_HOURS.map((h) => {
                const isSelected = !isCustomHours && hours === h;
                const label = h === 24 ? "24 ч (1 сут)" : `${h} ч`;
                return (
                  <button
                    key={h}
                    type="button"
                    className={`booking-hour-chip ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      setIsCustomHours(false);
                      setHours(h);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                className={`booking-hour-chip ${isCustomHours ? "active" : ""}`}
                onClick={() => setIsCustomHours(true)}
              >
                Свой вариант
              </button>
            </div>

            {isCustomHours && (
              <div className="booking-custom-hours">
                <input
                  type="number"
                  min={1}
                  max={720}
                  className="form-input"
                  value={hours || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setHours(isNaN(val) ? 0 : val);
                  }}
                  placeholder="Количество часов"
                  style={{ width: "160px" }}
                />
                <span className="booking-custom-hours-unit">часов</span>
              </div>
            )}

            {endDate && (
              <p className="booking-form-hint">
                🕒 Вернуть до{" "}
                <strong>
                  {endDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </strong>
                {" ("}
                {endDate.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                })}
                {")"}
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="booking-comment" className="form-label">
              Комментарий
            </label>
            <textarea
              id="booking-comment"
              className="form-input booking-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительные пожелания или примечания (необязательно)"
            />
          </div>
        </div>

        <div className="booking-modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Отмена
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Бронируем..." : "Забронировать"}
          </button>
        </div>
      </div>
    </div>
  );
};
