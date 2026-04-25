import { FC } from "react";
 
interface ErrorMessageProps {
  error: string | null;
  onClose?: () => void;
}
 
export const ErrorMessage: FC<ErrorMessageProps> = ({ error, onClose }) => {
  if (!error) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      background: "#FEF2F2", border: "1px solid #FECACA",
      borderRadius: 10, padding: "13px 16px", marginBottom: 16,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠️</span>
      <p style={{ margin: 0, color: "#991B1B", fontSize: 13.5, fontWeight: 500, flex: 1 }}>{error}</p>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#DC2626", fontSize: 18, lineHeight: 1, padding: 0,
            flexShrink: 0, fontWeight: 700,
          }}
        >×</button>
      )}
    </div>
  );
};
