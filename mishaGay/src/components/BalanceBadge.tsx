interface BalanceBadgeProps {
  value: number;
}

// Простая цветовая индикация баланса: красный <0, жёлтый <200, зелёный >=200
export const BalanceBadge = ({ value }: BalanceBadgeProps) => {
  let background = "#16a34a"; // зелёный

  if (value < 0) {
    background = "#dc2626"; // красный
  } else if (value < 200) {
    background = "#f59e0b"; // жёлтый
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 10px",
        borderRadius: 999,
        fontWeight: 600,
        fontSize: 13,
        color: "#fff",
        background,
        minWidth: 72,
        textAlign: "center",
      }}
    >
      {value.toFixed(2)} сом
    </span>
  );
};

