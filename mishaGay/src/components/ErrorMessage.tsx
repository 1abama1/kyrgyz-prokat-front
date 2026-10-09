import { FC, useEffect, useRef } from "react";

interface ErrorMessageProps {
  error: string | null;
  onClose?: () => void;
  className?: string;
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ error, onClose, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error) {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

  if (!error) return null;

  return (
    <div
      ref={containerRef}
      role="alert"
      aria-live="assertive"
      className={`error-message-banner ${className}`.trim()}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "var(--danger-light, #FEF2F2)",
        border: "1px solid #FECACA",
        borderRadius: "var(--r, 10px)",
        padding: "13px 16px",
        marginBottom: 16,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--danger, #DC2626)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 2 }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p
        style={{
          margin: 0,
          color: "var(--danger-hover, #991B1B)",
          fontSize: 13.5,
          fontWeight: 500,
          flex: 1,
          lineHeight: 1.5,
        }}
      >
        {error}
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть сообщение об ошибке"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--danger, #DC2626)",
            fontSize: 20,
            lineHeight: 1,
            padding: "0 4px",
            flexShrink: 0,
            fontWeight: 700,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

export const SuccessMessage: FC<{ message: string | null; onClose?: () => void }> = ({
  message,
  onClose,
}) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--success-light, #F0FDF4)",
        border: "1px solid #BBF7D0",
        borderRadius: "var(--r, 10px)",
        padding: "12px 16px",
        marginBottom: 16,
        color: "var(--success, #16A34A)",
        fontSize: 13.5,
        fontWeight: 600,
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть сообщение об успехе"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "currentColor",
            fontSize: 18,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};
