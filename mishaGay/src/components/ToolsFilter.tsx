import { ToolStatus } from "../types/tool.types";
import { StyledSelect } from "./StyledSelect";

interface Props {
  status?: ToolStatus;
  categoryId?: number;
  categories: { id: number; name: string }[];
  onChange: (f: { status?: ToolStatus; categoryId?: number }) => void;
}

export const ToolsFilter = ({
  status,
  categoryId,
  categories,
  onChange
}: Props) => {
  return (
    <div className="tools-filter" style={{ display: "flex", gap: 16 }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <StyledSelect
          options={[
            { value: "AVAILABLE", label: "Свободные" },
            { value: "RENTED", label: "В аренде" },
            { value: "OVERDUE", label: "Просроченные" }
          ]}
          value={status ?? ""}
          onChange={(val) => onChange({ status: (val as ToolStatus) || undefined, categoryId })}
          placeholder="Все статусы"
          isClearable
          isSearchable={false}
        />
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <StyledSelect
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          value={categoryId ?? ""}
          onChange={(val) => onChange({ status, categoryId: val ? Number(val) : undefined })}
          placeholder="Все категории"
          isClearable
        />
      </div>
    </div>
  );
};

