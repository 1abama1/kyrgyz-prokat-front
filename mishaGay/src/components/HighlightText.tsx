import { FC } from "react";

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

export const HighlightText: FC<HighlightTextProps> = ({ text, query, className }) => {
  if (!text) return null;
  if (!query || !query.trim()) {
    return <span className={className}>{text}</span>;
  }

  const safeQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${safeQuery})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={index} className="tree-search-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};
