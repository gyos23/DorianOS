import React from "react";
import { fmt } from "../../utils/formatters.js";
import { CATEGORY_COLORS } from "../../data/cashflow.js";

export function DayDetailPanel({
  selectedDay,
  selStats,
  selCharges,
  setAddModal,
  removeCharge,
  t,
}) {
  if (!selectedDay || !selStats) return null;

  return (
    <div
      style={{
        width: 272,
        borderLeft: `1px solid ${t.border2}`,
        padding: 18,
        flexShrink: 0,
        background: t.surface,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 16 }}>
        {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          {
            label: "Cash Bal",
            value: fmt(selStats.balance),
            color: selStats.balance >= 0 ? t.accent : t.danger,
          },
          {
            label: "Bgt Left",
            value: fmt(selStats.budgetRemaining),
            color: selStats.budgetRemaining >= 0 ? t.accentSub : t.danger,
          },
          { label: "Income", value: fmt(selStats.income), color: t.accent },
          { label: "Expenses", value: fmt(selStats.expenses), color: t.danger },
        ].map((s) => (
          <div key={s.label} className="side-stat">
            <div
              style={{
                fontSize: 9,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: s.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: t.textDim,
          textTransform: "uppercase",
          letterSpacing: ".1em",
          marginBottom: 8,
        }}
      >
        Charges
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {selCharges.length === 0 && (
          <div style={{ fontSize: 12, color: t.textDim, padding: "8px 0" }}>
            No charges this day.
          </div>
        )}
        {selCharges.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 10px",
              background: c._isDebtPayment ? t.dangerBg : t.surface2,
              border: `1px solid ${c._isDebtPayment ? t.dangerBd : t.border}`,
              borderRadius: 7,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  CATEGORY_COLORS[c.type === "income" ? "income" : c.category] || t.accent,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  color: t.textSub,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                }}
              >
                {c.payee}
              </div>
              <div style={{ fontSize: 9, color: t.textDim }}>
                {c._isDebtPayment ? "⚡ payoff calc" : c.category}
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: c.type === "income" ? t.accent : t.danger,
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {c.type === "income" ? "+" : "−"}
              {fmt(c.amount)}
            </div>
            {c.source !== "lunchmoney" && !c._isDebtPayment && (
              <button
                onClick={() => removeCharge(c.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: t.textDim,
                  cursor: "pointer",
                  fontSize: 17,
                  lineHeight: 1,
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className="btn"
        style={{ width: "100%", marginTop: 14, textAlign: "center" }}
        onClick={() => setAddModal(selectedDay)}
      >
        + Add Charge
      </button>
    </div>
  );
}
