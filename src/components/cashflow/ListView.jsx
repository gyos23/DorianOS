import React from "react";
import { dateKey } from "../../utils/dates.js";
import { fmt, fmtSigned } from "../../utils/formatters.js";
import { CATEGORY_COLORS } from "../../data/cashflow.js";

export function ListView({
  days,
  runBal,
  visForDay,
  filterCat,
  onDragStart,
  removeCharge,
  setAddModal,
  t,
}) {
  const visibleDays = days.filter((d) => {
    const k = dateKey(d);
    const vis = visForDay(k).filter(
      (c) =>
        filterCat === "All" ||
        c.category === filterCat ||
        (filterCat === "income" && c.type === "income")
    );
    return vis.length > 0 || k === dateKey(new Date());
  });

  return (
    <div style={{ padding: "0 24px 60px", maxWidth: 680, margin: "0 auto" }}>
      {visibleDays.map((d, idx, arr) => {
        const k = dateKey(d);
        const stats = runBal[k];
        const isToday = k === dateKey(new Date());
        const vis = visForDay(k).filter(
          (c) =>
            filterCat === "All" ||
            c.category === filterCat ||
            (filterCat === "income" && c.type === "income")
        );
        const inc = vis.filter((c) => c.type === "income");
        const exp = vis.filter((c) => c.type === "expense");

        return (
          <div key={k} style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 34,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: "50%",
                  marginTop: 20,
                  flexShrink: 0,
                  background: isToday
                    ? t.accent
                    : stats?.net > 0
                    ? t.accentSub
                    : stats?.net < 0
                    ? t.danger
                    : t.border3,
                  border: `2px solid ${isToday ? t.accent : t.border2}`,
                  boxShadow: isToday ? `0 0 8px ${t.accent}66` : undefined,
                }}
              />
              {idx < arr.length - 1 && (
                <div style={{ width: 1, flex: 1, background: t.border2, minHeight: 14 }} />
              )}
            </div>
            <div
              style={{
                flex: 1,
                padding: "14px 0 14px 14px",
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: vis.length ? 10 : 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isToday ? t.accent : t.textSub,
                    }}
                  >
                    {d.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {isToday && (
                    <span
                      style={{
                        fontSize: 9,
                        color: t.accent,
                        textTransform: "uppercase",
                        letterSpacing: ".12em",
                        fontWeight: 700,
                      }}
                    >
                      today
                    </span>
                  )}
                </div>
                {stats && (
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    {stats.net !== 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: stats.net > 0 ? t.accent : t.danger,
                        }}
                      >
                        {fmtSigned(stats.net)}
                      </span>
                    )}
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: stats.balance >= 0 ? t.text : t.danger,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmt(stats.balance)}
                      </div>
                      <div
                        style={{
                          fontSize: 9,
                          color: stats.budgetRemaining >= 0 ? t.textDim : t.danger,
                          fontWeight: 500,
                        }}
                      >
                        bgt {fmt(stats.budgetRemaining)} left
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {vis.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {inc.map((c) => (
                    <div
                      key={c.id}
                      className="list-item income"
                      draggable
                      onDragStart={(e) => onDragStart(e, c)}
                    >
                      <span style={{ fontSize: 11, color: t.accent, fontWeight: 700 }}>↑</span>
                      <span style={{ flex: 1, fontSize: 13, color: t.textSub, fontWeight: 500 }}>
                        {c.payee}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: t.accent,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        +{fmt(c.amount)}
                      </span>
                      {c.source !== "lunchmoney" && (
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
                  {exp.map((c) => (
                    <div
                      key={c.id}
                      className={`list-item ${c._isDebtPayment ? "debt-payment" : ""}`}
                      draggable={!c._isDebtPayment}
                      onDragStart={(e) => !c._isDebtPayment && onDragStart(e, c)}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: CATEGORY_COLORS[c.category] || t.textDim,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: 13, color: t.text }}>
                        {c.payee}
                        {c._isDebtPayment && (
                          <span
                            style={{
                              fontSize: 9,
                              color: t.danger,
                              marginLeft: 6,
                              fontWeight: 600,
                            }}
                          >
                            ⚡ payoff
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 10, color: t.textDim, marginRight: 8 }}>
                        {c.category}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: t.danger,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        −{fmt(c.amount)}
                      </span>
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
                  <button
                    className="btn"
                    style={{ alignSelf: "flex-start", padding: "2px 10px", fontSize: 10, marginTop: 2 }}
                    onClick={() => setAddModal(k)}
                  >
                    + add
                  </button>
                </div>
              )}
              {vis.length === 0 && (
                <button
                  className="btn"
                  style={{ padding: "2px 10px", fontSize: 10 }}
                  onClick={() => setAddModal(k)}
                >
                  + add charge
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
