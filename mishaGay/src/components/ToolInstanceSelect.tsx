import Select, { StylesConfig } from "react-select";
import type { ToolInstance } from "../types/tool.types";

interface ToolInstanceSelectProps {
  tools: ToolInstance[];
  value?: number | null;
  onChange: (toolId: number | null) => void;
  placeholder?: string;
  className?: string;
  isDisabled?: boolean;
}

type ToolOption = {
  value: number;
  label: string;
  tool: ToolInstance;
  isDisabled: boolean;
};

const statusConfig: Record<ToolInstance["status"], { color: string; bg: string; icon: string; text: string }> = {
  AVAILABLE: { color: "#16A34A", bg: "#F0FDF4", icon: "●", text: "Доступен" },
  RENTED: { color: "#DC2626", bg: "#FEF2F2", icon: "●", text: "В аренде" },
  BOOKED: { color: "#7C3AED", bg: "#F5F3FF", icon: "●", text: "Забронирован" },
  BROKEN: { color: "#D97706", bg: "#FFFBEB", icon: "●", text: "Сломан" },
  OVERDUE: { color: "#DC2626", bg: "#FEF2F2", icon: "●", text: "Просрочен" },
  IN_REPAIR: { color: "#D97706", bg: "#FFFBEB", icon: "●", text: "В ремонте" },
  DECOMMISSIONED: { color: "#64748B", bg: "#F1F5F9", icon: "●", text: "Списан" },
  LOST: { color: "#64748B", bg: "#F1F5F9", icon: "●", text: "Утерян" },
  WRITTEN_OFF: { color: "#64748B", bg: "#F1F5F9", icon: "●", text: "Списан (Брак)" }
};

const selectStyles: StylesConfig<ToolOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderWidth: "1.5px",
    borderColor: state.isFocused ? "#2563EB" : "#E2E8F0",
    borderRadius: 10,
    background: state.isDisabled ? "#F8FAFC" : "#FFFFFF",
    boxShadow: "none",
    transition: "border-color .2s, background .2s",
    "&:hover": {
      borderColor: state.isFocused ? "#2563EB" : "#CBD5E1",
      background: state.isFocused ? "#FFFFFF" : "#F8FAFC"
    }
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 10,
    border: "1px solid #E2E8F0",
    boxShadow: "0 8px 24px rgba(0,0,0,.10)",
    overflow: "hidden",
    zIndex: 9999,
    animation: "selectMenuAppear .15s ease"
  }),
  menuList: (base) => ({
    ...base,
    padding: 4,
  }),
  option: (base, state) => ({
    ...base,
    padding: "8px 12px",
    borderRadius: 6,
    margin: "2px 0",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    background: state.isSelected
      ? "#2563EB"
      : state.isFocused
        ? "#EFF6FF"
        : "transparent",
    color: state.isSelected ? "#fff" : state.isDisabled ? "#94A3B8" : "#0F172A",
    transition: "background .12s ease",
    "&:active": {
      background: state.isDisabled ? "transparent" : "#BFDBFE"
    }
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "#E2E8F0",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "#2563EB" : "#94A3B8",
    transition: "color .18s ease, transform .2s ease",
    transform: state.selectProps.menuIsOpen ? "rotate(180deg)" : "none",
    "&:hover": { color: "#475569" }
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "#94A3B8",
    "&:hover": { color: "#DC2626" }
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94A3B8",
    fontSize: 14
  }),
  singleValue: (base) => ({
    ...base,
    color: "#0F172A",
  }),
  valueContainer: (base) => ({
    ...base,
    padding: "2px 14px",
  }),
  input: (base) => ({
    ...base,
    color: "#0F172A"
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999
  })
};

export const ToolInstanceSelect = ({
  tools,
  value = null,
  onChange,
  placeholder = "Выберите экземпляр",
  className,
  isDisabled = false
}: ToolInstanceSelectProps) => {
  const options: ToolOption[] = tools.map((tool) => ({
    value: tool.id,
    label: `${tool.name} (#${tool.instanceNumber ?? tool.id})`,
    tool,
    isDisabled: tool.status !== "AVAILABLE"
  }));

  const selectedOption = options.find((opt) => opt.value === value) ?? null;

  return (
    <Select<ToolOption, false>
      options={options}
      value={selectedOption}
      className={className}
      classNamePrefix="custom-select"
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable
      isSearchable={true}
      onChange={(option) => onChange(option?.value ?? null)}
      isOptionDisabled={(option) => option.isDisabled}
      formatOptionLabel={(option, { context }) => {
        const t = option.tool;
        const cfg = statusConfig[t.status];

        // Compact view for the selected value to avoid huge input height
        if (context === "value") {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 14, fontWeight: 600 }}>
                {t.name} (№{t.instanceNumber ?? t.id})
              </strong>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 6px",
                borderRadius: 6,
                background: cfg.bg,
                color: cfg.color,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {cfg.text}
              </span>
            </div>
          );
        }

        // Detailed view for the dropdown menu
        return (
          <div style={{ padding: "3px 0" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8
            }}>
              <strong style={{ fontSize: 13.5, fontWeight: 600 }}>
                {t.name} (№{t.instanceNumber ?? t.id})
              </strong>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 8px",
                borderRadius: 999,
                background: cfg.bg,
                color: cfg.color,
                fontSize: 11.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                letterSpacing: ".01em"
              }}>
                <span style={{ fontSize: 8 }}>{cfg.icon}</span>
                {cfg.text}
              </span>
            </div>

            <div style={{
              display: "flex",
              gap: 12,
              marginTop: 4,
              fontSize: 12,
              opacity: 0.8
            }}>
              <span>ИНВ: {t.inventoryNumber}</span>
            </div>

            <div style={{
              display: "flex",
              gap: 12,
              marginTop: 2,
              fontSize: 12,
              opacity: 0.8
            }}>
              <span><strong style={{ fontWeight: 600 }}>{t.dailyRentalPrice ?? t.dailyPrice}</strong> / сутки</span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span>Залог: <strong style={{ fontWeight: 600 }}>{t.depositAmount ?? t.deposit}</strong></span>
            </div>
          </div>
        );
      }}
      styles={selectStyles}
      menuPortalTarget={document.body}
    />
  );
};
