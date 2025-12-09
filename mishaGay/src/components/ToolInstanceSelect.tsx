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

const statusColor: Record<ToolInstance["status"], string> = {
  AVAILABLE: "green",
  RENTED: "red",
  BROKEN: "orange"
};

const selectStyles: StylesConfig<ToolOption, false> = {
  option: (base) => ({ ...base, padding: 8 }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 })
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
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable
      onChange={(option) => onChange(option?.value ?? null)}
      isOptionDisabled={(option) => option.isDisabled}
      formatOptionLabel={(option) => {
        const t = option.tool;
        const statusText =
          t.status === "AVAILABLE"
            ? "✔ Доступен"
            : t.status === "RENTED"
              ? "❌ Занят"
              : "⚠️ Сломан";

        return (
          <div style={{ padding: "4px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {t.name} (№{t.instanceNumber ?? t.id})
              </strong>
              <span style={{ color: statusColor[t.status] }}>{statusText}</span>
            </div>

            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              ИНВ: {t.inventoryNumber} | Арт: {t.article}
            </div>

            <div style={{ fontSize: "12px", opacity: 0.8 }}>
              Цена: {t.dailyPrice} / сутки | Залог: {t.deposit}
            </div>
          </div>
        );
      }}
      styles={selectStyles}
      menuPortalTarget={document.body}
    />
  );
};

