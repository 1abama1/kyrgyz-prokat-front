import { ToolStatus } from "../types/ToolList";

export const ToolStatusBadge = ({ status }: { status: ToolStatus }) => {
  let text = "";
  let className = "badge";

  switch (status) {
    case "AVAILABLE":
      text = "Свободен";
      className += " badge-green";
      break;
    case "RENTED":
      text = "В аренде";
      className += " badge-yellow";
      break;
    case "OVERDUE":
      text = "Просрочен";
      className += " badge-red";
      break;
  }

  return <span className={className}>{text}</span>;
};

