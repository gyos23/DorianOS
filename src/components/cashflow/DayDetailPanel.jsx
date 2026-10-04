import React from "react";
import { fmt } from "../../utils/formatters.js";
import { CATEGORY_COLORS } from "../../data/cashflow.js";

export function DayDetailPanel({
  selectedDay,
  selStats,
  selCharges,
  setAddModal,
  removeCharge,
  dayTasks = [],
  onCompleteTask,
  onToggleFlag,
  onRescheduleTask,
  t,
}) {
  if (!selectedDay || !selStats) return null;

  return (
    <div
      style={{
        width: 290,
        borderLeft: `1px solid ${t.border2}`,
        padding: 16,
        flexShrink: 0,
        background: t.surface,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        overflowY: "auto",
        maxHeight: "calc(100vh - 160px)",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
        {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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
                fontWeight: 600,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 15,
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

      {/* Scheduled OmniFocus Tasks */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: t.accentSub,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>📋 Tasks Due ({dayTasks.length})</span>
          <span style={{ fontSize: 9, color: t.textDim, fontWeight: 400 }}>OmniFocus</span>
        </div>

        {dayTasks.length === 0 ? (
          <div style={{ fontSize: 11, color: t.textDim, padding: "4px 0" }}>
            No tasks scheduled for this date.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dayTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  background: t.surface2,
                  border: `1px solid ${task.flagged ? t.accent + "66" : t.border}`,
                  borderRadius: 7,
                  padding: "8px 9px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <button
                    onClick={() => onCompleteTask && onCompleteTask(task.id)}
                    title="Mark task completed in OmniFocus"
                    style={{
                      marginTop: 2,
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      border: `1px solid ${t.textDim}`,
                      background: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: t.text,
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      {task.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: t.textDim,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>📁 {task.project || "Inbox"}</span>
                      {task.id && !task.id.startsWith("temp_") && (
                        <a
                          href={`omnifocus:///task/${task.id}`}
                          title="Open in OmniFocus"
                          style={{ color: t.accent, textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          ↗ Open OF
                        </a>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleFlag && onToggleFlag(task.id, !task.flagged)}
                    title={task.flagged ? "Unflag task" : "Flag task"}
                    style={{
                      background: "none",
                      border: "none",
                      color: task.flagged ? "#f59e0b" : t.textDim,
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ★
                  </button>
                </div>
                {onRescheduleTask && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 4,
                      marginTop: 2,
                      borderTop: `1px dashed ${t.border}`,
                      paddingTop: 4,
                    }}
                  >
                    <button
                      onClick={() => onRescheduleTask(task.id, null)}
                      style={{
                        fontSize: 9,
                        background: "none",
                        border: "none",
                        color: t.danger,
                        cursor: "pointer",
                        padding: "1px 4px",
                      }}
                    >
                      Unschedule
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Charges Section */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: t.textDim,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            marginBottom: 6,
          }}
        >
          Charges ({selCharges.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {selCharges.length === 0 && (
            <div style={{ fontSize: 11, color: t.textDim, padding: "4px 0" }}>
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
                    fontSize: 11,
                    color: t.textSub,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                  }}
                  title={
                    c._matchedPayees?.length
                      ? `Matched CC Charges:\n${c._matchedPayees.join("\n")}`
                      : c.payee
                  }
                >
                  {c.payee}
                </div>
                <div style={{ fontSize: 9, color: t.textDim }}>
                  {c._isDebtPayment
                    ? c._reconciled && c._scheduledDebt > 0
                      ? `⚡ Reconciled: $${c._targetDebt} target − $${c._scheduledDebt} CCs`
                      : "⚡ payoff calc"
                    : c.category}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color:
                    c.type === "income"
                      ? t.accent
                      : c.amount === 0
                      ? t.accentSub
                      : t.danger,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.type === "income" ? "+" : c.amount === 0 ? "" : "−"}
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
                    fontSize: 16,
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
      </div>

      <button
        className="btn"
        style={{ width: "100%", marginTop: 4, textAlign: "center" }}
        onClick={() => setAddModal(selectedDay)}
      >
        + Add Charge
      </button>
    </div>
  );
}

