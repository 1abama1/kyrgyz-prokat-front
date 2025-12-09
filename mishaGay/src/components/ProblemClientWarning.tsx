interface ProblemClientWarningProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ProblemClientWarning = ({
  open,
  onConfirm,
  onCancel
}: ProblemClientWarningProps) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999
      }}
    >
      <div
        style={{
          background: "white",
          padding: "20px 24px",
          borderRadius: 10,
          width: "360px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
        }}
      >
        <h2 style={{ margin: "0 0 8px" }}>⚠️ Внимание!</h2>
        <p style={{ margin: "0 0 12px" }}>Этот клиент помечен как ПРОБЛЕМНЫЙ.</p>
        <p style={{ margin: "0 0 16px" }}>Продолжить оформление аренды?</p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn-secondary" onClick={onCancel}>
            Отмена
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
};

