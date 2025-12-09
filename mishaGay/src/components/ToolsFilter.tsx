import { ToolStatus } from "../types/tool.types";

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
    <div className="tools-filter">
      <select
        value={status ?? ""}
        onChange={e =>
          onChange({ status: e.target.value as ToolStatus || undefined, categoryId })
        }
      >
        <option value="">Все статусы</option>
        <option value="AVAILABLE">Свободные</option>
        <option value="RENTED">В аренде</option>
        <option value="OVERDUE">Просроченные</option>
      </select>

      <select
        value={categoryId ?? ""}
        onChange={e =>
          onChange({ status, categoryId: e.target.value ? Number(e.target.value) : undefined })
        }
      >
        <option value="">Все категории</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
};

