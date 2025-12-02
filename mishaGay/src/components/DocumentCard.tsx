import { FC } from "react";
import { Document } from "../types/document.types";
import { formatDate, formatCurrency } from "../utils/formatters";

interface DocumentCardProps {
  document: Document;
  onClick?: (id: number) => void;
}

export const DocumentCard: FC<DocumentCardProps> = ({ document, onClick }) => {
  return (
    <div 
      onClick={() => onClick?.(document.id)}
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.2s"
      }}
      onMouseEnter={(e) => {
        if (onClick) e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <h3>Договор №{document.contractNumber}</h3>
      <p><strong>Клиент:</strong> {document.clientName}</p>
      <p><strong>Инструмент:</strong> {document.toolName}</p>
      <p><strong>Цена:</strong> {formatCurrency(document.price)}</p>
      <p><strong>Статус:</strong> 
        <span style={{
          background: document.status === "ACTIVE" ? "#c8e6c9" : "#ffcdd2",
          padding: "4px 8px",
          borderRadius: "4px",
          marginLeft: "8px",
          fontSize: "12px"
        }}>
          {document.status === "ACTIVE" ? "Активен" : "Закрыт"}
        </span>
      </p>
      <p><strong>Создан:</strong> {formatDate(document.createdAt)}</p>
      {document.closedAt && (
        <p><strong>Закрыт:</strong> {formatDate(document.closedAt)}</p>
      )}
    </div>
  );
};

