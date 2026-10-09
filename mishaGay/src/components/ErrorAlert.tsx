import { FC } from "react";

interface Props {
  error: unknown;
  onClose?: () => void;
}

const resolveMessage = (error: unknown): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string") return errObj.message;
    if (typeof errObj.error === "string") return errObj.error;
  }
  return "Неизвестная ошибка";
};

const ErrorAlert: FC<Props> = ({ error, onClose }) => {
  if (!error) return null;

  const message = resolveMessage(error);
  const errObj = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="alert alert-danger"
      style={{
        background: "#fdecea",
        border: "1px solid #f5c2c7",
        color: "#b71c1c",
        padding: "12px 14px",
        borderRadius: 6,
        position: "relative",
        marginBottom: 16,
      }}
    >
      <strong>Ошибка:</strong> {message}
      {errObj && errObj.code !== undefined && (
        <div>
          <strong>Код:</strong> {String(errObj.code)}
        </div>
      )}
      {errObj && errObj.status !== undefined && (
        <div>
          <strong>Статус:</strong> {String(errObj.status)}
        </div>
      )}
      {errObj && errObj.timestamp !== undefined && (
        <div>
          <strong>Время:</strong> {String(errObj.timestamp)}
        </div>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть сообщение об ошибке"
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 16,
            color: "#b71c1c",
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
