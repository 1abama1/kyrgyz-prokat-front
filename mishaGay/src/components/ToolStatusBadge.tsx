import { ToolStatus } from "../types/tool.types";

type BadgeConfig = {
  color: string;
  label: string;
  icon: string;
};

const STATUS_MAP: Record<string, BadgeConfig> = {
  AVAILABLE: { color: "green", label: "Доступен", icon: "🟢" },
  RENTED: { color: "red", label: "Занят", icon: "🔴" },
  BROKEN: { color: "orange", label: "Сломан", icon: "🟡" },
  OVERDUE: { color: "#e11d48", label: "Просрочен", icon: "⏰" },
  SERVICE: { color: "#f59e0b", label: "Обслуживание", icon: "🛠" },
  LOST: { color: "#6b7280", label: "Утрачен", icon: "⚫" }
};

export const ToolStatusBadge = ({ status }: { status: ToolStatus | string }) => {
  const item = STATUS_MAP[status] ?? STATUS_MAP.AVAILABLE;

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: `${item.color}20`,
        color: item.color,
        display: "inline-flex",
        alignItems: "center",
        gap: 6
      }}
    >
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </span>
  );
};

