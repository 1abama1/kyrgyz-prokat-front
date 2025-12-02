import { FC } from "react";

interface Props {
  error: any;
  onClose?: () => void;
}

const resolveMessage = (error: any): string => {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.error) return error.error;
  return "Неизвестная ошибка";
};

const ErrorAlert: FC<Props> = ({ error, onClose }) => {
  if (!error) return null;

  const message = resolveMessage(error);

  return (
    <div
      className="alert alert-danger"
      style={{
        background: "#fdecea",
        border: "1px solid #f5c2c7",
        color: "#b71c1c",
        padding: "12px 14px",
        borderRadius: 6,
        position: "relative",
        marginBottom: 16
      }}
    >
      <strong>Ошибка:</strong> {message}
      {error.code && (
        <div>
          <strong>Код:</strong> {error.code}
        </div>
      )}
      {typeof error.status !== "undefined" && (
        <div>
          <strong>Статус:</strong> {error.status}
        </div>
      )}
      {error.timestamp && (
        <div>
          <strong>Время:</strong> {error.timestamp}
        </div>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 16,
            color: "#b71c1c"
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;

