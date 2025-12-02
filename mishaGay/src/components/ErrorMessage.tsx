import { FC } from "react";

interface ErrorMessageProps {
  error: string | null;
  onClose?: () => void;
}

export const ErrorMessage: FC<ErrorMessageProps> = ({ error, onClose }) => {
  if (!error) return null;
  
  return (
    <div style={{
      background: "#fee",
      border: "1px solid #fcc",
      padding: "12px",
      borderRadius: "4px",
      margin: "10px 0"
    }}>
      <strong>Ошибка:</strong> {error}
      {onClose && (
        <button onClick={onClose} style={{float: "right"}}>✕</button>
      )}
    </div>
  );
};

