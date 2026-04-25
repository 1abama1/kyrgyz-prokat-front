import { ToolStatus } from "../types/tool.types";
 
type BadgeConfig = { bg: string; color: string; label: string; dot: string; };
 
const STATUS_MAP: Record<string, BadgeConfig> = {
  AVAILABLE: { bg: "#DCFCE7", color: "#15803D", dot: "#22C55E", label: "Доступен"      },
  RENTED:    { bg: "#DBEAFE", color: "#1D4ED8", dot: "#3B82F6", label: "В аренде"      },
  BROKEN:    { bg: "#FEF9C3", color: "#A16207", dot: "#EAB308", label: "Сломан"        },
  OVERDUE:   { bg: "#FEE2E2", color: "#B91C1C", dot: "#EF4444", label: "Просрочен"     },
  SERVICE:   { bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B", label: "Обслуживание"  },
  LOST:      { bg: "#F1F5F9", color: "#475569", dot: "#94A3B8", label: "Утрачен"       },
};
 
export const ToolStatusBadge = ({ status }: { status: ToolStatus | string }) => {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.AVAILABLE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 700, letterSpacing: ".02em",
      flexShrink: 0,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
};
