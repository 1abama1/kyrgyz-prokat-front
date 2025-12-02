import { FC } from "react";
import { Tool } from "../types/tool.types";
import { toolStatusLabel, getToolStatusClass } from "../utils/toolStatus";
import "../styles/tools.css";

interface ToolCardProps {
  tool: Tool;
  onClick?: (id: number) => void;
}

export const ToolCard: FC<ToolCardProps> = ({ tool, onClick }) => {
  return (
    <div 
      onClick={() => onClick?.(tool.id)}
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
      <h3>{tool.name}</h3>
      <p><strong>Инвентарный номер:</strong> {tool.inventoryNumber || "—"}</p>
      {tool.categoryName && (
        <p><strong>Категория:</strong> {tool.categoryName}</p>
      )}
      {tool.serialNumber && (
        <p><strong>Серийный номер:</strong> {tool.serialNumber}</p>
      )}
      <p>
        <strong>Статус:</strong>{" "}
        <span className={getToolStatusClass(tool.status)}>
          {toolStatusLabel(tool.status)}
        </span>
      </p>
      {tool.deposit && (
        <p><strong>Залог:</strong> {tool.deposit} сом</p>
      )}
    </div>
  );
};

