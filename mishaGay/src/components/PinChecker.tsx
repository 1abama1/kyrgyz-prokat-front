import { useState } from "react";
import { helperAPI } from "../api/helpers";
import type { SotKgDebtorInfo, SotKgCase } from "../types/helper.types";

// ─── Утилиты ────────────────────────────────────────────────────────────────

function formatSum(sum: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "KGS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(sum);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type DebtorState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "found"; data: SotKgDebtorInfo };

// ─── Статус-бейдж дела ───────────────────────────────────────────────────────

function CaseStatusBadge({ name }: { name: string }) {
  const isActive = name === "В производстве";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        background: isActive ? "#DCFCE7" : "#F1F5F9",
        color: isActive ? "#15803D" : "#64748B",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "currentColor",
          display: "inline-block",
          opacity: 0.7,
        }}
      />
      {name}
    </span>
  );
}

// ─── Карточка одного дела ────────────────────────────────────────────────────

function CaseCard({ c, index }: { c: SotKgCase; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        border: "1.5px solid var(--border)",
        borderRadius: "var(--r)",
        overflow: "hidden",
        background: "var(--surface)",
      }}
    >
      {/* Заголовок-аккордеон */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "10px 14px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: open ? "var(--brand-light)" : "var(--surface-2)",
          borderBottom: open ? "1.5px solid var(--border)" : "none",
          transition: "background 0.15s ease",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--brand)",
            }}
          >
            #{index + 1} {c.case_number}
          </span>
          <CaseStatusBadge name={c.case_status.name} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {c.court.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: c.is_paid ? "var(--success)" : "var(--danger)",
            }}
          >
            {formatSum(c.sum)}
          </span>
          <span
            style={{
              transform: open ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            ▶
          </span>
        </div>
      </div>

      {/* Детали */}
      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Строки инфо */}
          <InfoGrid
            rows={[
              ["Категория", c.claim_category.name],
              ["Взыскатели", c.claimants.map((cl) => cl.name).join(", ")],
              ["Код оплаты", c.payment_code ?? "—"],
              ["Дата создания", formatDate(c.created_at)],
              ["Оплачено", c.is_paid ? "✅ Да" : "❌ Нет"],
              ["Сбор оплачен", c.fee_is_paid ? "✅ Да" : "❌ Нет"],
            ]}
          />

          {/* Исполнитель */}
          <div
            style={{
              marginTop: 4,
              padding: "10px 12px",
              background: "var(--surface-2)",
              borderRadius: "var(--r-sm)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              Судебный исполнитель
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              {c.executor.full_name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3, display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span>📞 {c.executor.phone_number}</span>
              <span>✉️ {c.executor.email}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Вспомогательная сетка ────────────────────────────────────────────────────

function InfoGrid({ rows }: { rows: [string, string][] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "4px 14px",
        fontSize: 13,
      }}
    >
      {rows.map(([label, value]) => (
        <>
          <span key={`l-${label}`} style={{ color: "var(--text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
            {label}:
          </span>
          <span key={`v-${label}`} style={{ color: "var(--text-primary)" }}>
            {value || "—"}
          </span>
        </>
      ))}
    </div>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

interface PinCheckerProps {
  /** Если передан — поле ввода скрыто, используется этот ПИН */
  initialPin?: string;
  /** Показывать ли поле ввода (по умолчанию true) */
  showInput?: boolean;
}

export function PinChecker({ initialPin, showInput = true }: PinCheckerProps) {
  const [pin, setPin] = useState(initialPin ?? "");
  const [state, setState] = useState<DebtorState>({ kind: "idle" });

  const handleCheck = async (overridePin?: string) => {
    const pinToCheck = (overridePin ?? pin).trim();
    if (!pinToCheck || pinToCheck.length !== 14) return;

    setState({ kind: "loading" });
    try {
      const data = await helperAPI.getDebtorInfo(pinToCheck);
      if (data === null) {
        setState({ kind: "not_found" });
      } else {
        setState({ kind: "found", data });
      }
    } catch (err: any) {
      setState({ kind: "error", message: err?.message || "Ошибка запроса" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleCheck();
  };

  const isLoading = state.kind === "loading";
  const canCheck = pin.trim().length === 14 && !isLoading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h4
        style={{
          margin: 0,
          fontSize: "0.95rem",
          color: "var(--text-primary)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        🔍 Проверка ПИН на portal.sot.kg
      </h4>

      {/* Поле ввода */}
      {showInput && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Введите ПИН (14 цифр)"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 14);
                setPin(val);
                setState({ kind: "idle" });
              }}
              onKeyDown={handleKeyDown}
              maxLength={14}
              inputMode="numeric"
              style={{
                flex: 1,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.12em",
                fontSize: 15,
              }}
            />
            <button
              onClick={() => handleCheck()}
              disabled={!canCheck}
              className="btn-primary"
              style={{ whiteSpace: "nowrap", minWidth: 130 }}
            >
              {isLoading ? "Загрузка..." : "Проверить ПИН"}
            </button>
          </div>
          <div
            style={{
              fontSize: 12,
              textAlign: "right",
              color: pin.length === 14 ? "var(--success)" : "var(--text-muted)",
            }}
          >
            {pin.length} / 14 цифр
          </div>
        </>
      )}

      {/* Кнопка для initialPin (без поля ввода) */}
      {!showInput && initialPin && (
        <button
          onClick={() => handleCheck(initialPin)}
          disabled={isLoading}
          className="btn-secondary"
          style={{ fontSize: 13, alignSelf: "flex-start" }}
        >
          {isLoading ? "Загрузка..." : "🔍 Проверить на sot.kg"}
        </button>
      )}

      {/* ── Состояния ── */}

      {state.kind === "loading" && (
        <div style={styles.statusBox("neutral")}>
          <Spinner /> Запрос к portal.sot.kg...
        </div>
      )}

      {state.kind === "not_found" && (
        <div style={styles.statusBox("info")}>
          ℹ️ Должник с ПИН <code style={styles.code}>{pin || initialPin}</code> не найден в базе sot.kg
        </div>
      )}

      {state.kind === "error" && (
        <div style={styles.statusBox("danger")}>
          ❌ {state.message}
        </div>
      )}

      {state.kind === "found" && (
        <DebtorCard data={state.data} />
      )}
    </div>
  );
}

// ─── Карточка должника ────────────────────────────────────────────────────────

function DebtorCard({ data }: { data: SotKgDebtorInfo }) {
  const activeCases = data.case.filter((c) => c.case_status.name === "В производстве");
  const archivedCases = data.case.filter((c) => c.case_status.name !== "В производстве");
  const totalDebt = data.case.reduce((sum, c) => sum + (c.is_paid ? 0 : c.sum), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Шапка */}
      <div
        style={{
          padding: "14px 16px",
          background: "var(--danger-light)",
          border: "1.5px solid var(--danger)",
          borderRadius: "var(--r)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {data.fullname}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            ПИН: {data.pin}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Общий долг (неоплаченный)
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--danger)" }}>
            {formatSum(totalDebt)}
          </div>
        </div>
      </div>

      {/* Счётчики */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatBadge label="Всего дел" value={data.case.length} color="brand" />
        <StatBadge label="В производстве" value={activeCases.length} color="danger" />
        <StatBadge label="Архив" value={archivedCases.length} color="neutral" />
      </div>

      {/* Дела в производстве */}
      {activeCases.length > 0 && (
        <div>
          <SectionTitle>🔴 В производстве ({activeCases.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activeCases.map((c, i) => (
              <CaseCard key={c.case_number} c={c} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Архивные дела */}
      {archivedCases.length > 0 && (
        <div>
          <SectionTitle>📁 Архив ({archivedCases.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {archivedCases.map((c, i) => (
              <CaseCard key={c.case_number} c={c} index={activeCases.length + i} />
            ))}
          </div>
        </div>
      )}

      {/* Ссылка на портал */}
      <a
        href={`https://portal.sot.kg/ru/debtors`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13,
          color: "var(--brand)",
          fontWeight: 600,
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        🌐 Открыть portal.sot.kg →
      </a>
    </div>
  );
}

// ─── Мелкие вспомогатели ─────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: "var(--text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "brand" | "danger" | "neutral";
}) {
  const colorMap = {
    brand: { bg: "var(--brand-light)", text: "var(--brand)", border: "var(--brand-subtle)" },
    danger: { bg: "var(--danger-light)", text: "var(--danger)", border: "#FECACA" },
    neutral: { bg: "var(--surface-2)", text: "var(--text-secondary)", border: "var(--border)" },
  };
  const c = colorMap[color];
  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: "var(--r-sm)",
        border: `1px solid ${c.border}`,
        background: c.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 70,
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 800, color: c.text }}>{value}</span>
      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid var(--border-strong)",
        borderTopColor: "var(--brand)",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}

// ─── Inline стили ─────────────────────────────────────────────────────────────

const styles = {
  statusBox: (variant: "neutral" | "info" | "danger") => {
    const map = {
      neutral: { bg: "var(--surface-2)", border: "var(--border)", color: "var(--text-secondary)" },
      info: { bg: "#EFF6FF", border: "var(--brand-subtle)", color: "var(--brand)" },
      danger: { bg: "var(--danger-light)", border: "var(--danger)", color: "var(--danger)" },
    };
    const m = map[variant];
    return {
      padding: "10px 14px",
      borderRadius: "var(--r)",
      border: `1.5px solid ${m.border}`,
      background: m.bg,
      color: m.color,
      fontSize: 13,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: 8,
    } as const;
  },
  code: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    background: "rgba(0,0,0,0.06)",
    padding: "1px 6px",
    borderRadius: 3,
  } as const,
};
