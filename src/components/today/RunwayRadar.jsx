import React, { useMemo } from "react";
import { fmt } from "../../utils/formatters.js";
import { dateKey, addDays } from "../../utils/dates.js";
import { CATEGORY_COLORS } from "../../data/cashflow.js";

export function RunwayRadar({
  startBal,
  forecasts,
  cashZeroDate,
  lmData,
  onNavigateCashflow,
  t,
}) {
  const today = new Date();
  const todayKey = dateKey(today);

  // Compute upcoming 7-day transactions
  const next7DaysCharges = useMemo(() => {
    const end = addDays(today, 7);
    const endKey = dateKey(end);

    const relevant = lmData
      .filter((c) => c.date && c.date >= todayKey && c.date <= endKey)
      .sort((a, b) => a.date.localeCompare(b.date));

    return relevant;
  }, [lmData, todayKey]);

  const upcomingTotals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const c of next7DaysCharges) {
      if (c.type === "income") income += c.amount || 0;
      else expenses += c.amount || 0;
    }
    return { income, expenses, net: income - expenses };
  }, [next7DaysCharges]);

  // Calculate days of runway until cash zero
  const daysUntilZero = useMemo(() => {
    if (!cashZeroDate) return null;
    const zero = new Date(cashZeroDate + "T12:00:00");
    const now = new Date(todayKey + "T12:00:00");
    const diffTime = zero.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [cashZeroDate, todayKey]);

  const runwayStatus = useMemo(() => {
    if (daysUntilZero === null) return { text: "60+ Days (Safe)", color: t.accent, bg: t.accentBg };
    if (daysUntilZero > 45) return { text: `${daysUntilZero} Days (Healthy)`, color: t.accent, bg: t.accentBg };
    if (daysUntilZero > 25) return { text: `${daysUntilZero} Days (Watchlist)`, color: t.warning, bg: "#FEF3C720" };
    return { text: `${daysUntilZero} Days (Cliff Risk)`, color: t.danger, bg: t.dangerBg };
  }, [daysUntilZero, t]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: t.surface,
        border: `1px solid ${t.border2}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⏱️</span>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: t.text,
              letterSpacing: "-0.01em",
            }}
          >
            Cash Runway & 7-Day Liquidity
          </span>
        </div>
        <button
          className="btn"
          onClick={onNavigateCashflow}
          style={{ fontSize: 11, padding: "3px 10px", color: t.textDim }}
        >
          Open Cash Flow →
        </button>
      </div>

      {/* Runway Meter Card */}
      <div
        style={{
          padding: 14,
          background: runwayStatus.bg,
          border: `1px solid ${runwayStatus.color}30`,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              fontWeight: 600,
            }}
          >
            Cash Runway
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: runwayStatus.color, marginTop: 2 }}>
            {runwayStatus.text}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: t.textDim }}>Projected EOD</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: forecasts?.eod >= 0 ? t.accent : t.danger,
              marginTop: 2,
            }}
          >
            {forecasts?.eod != null ? fmt(forecasts.eod) : fmt(startBal)}
          </div>
        </div>
      </div>

      {/* 3-Point Forecast Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {[
          { label: "End of Day", value: forecasts?.eod, sub: "today" },
          { label: "End of Week", value: forecasts?.eow, sub: forecasts?.eowLabel || "this week" },
          { label: "End of Month", value: forecasts?.eom, sub: forecasts?.eomLabel || "this month" },
        ].map((f) => (
          <div
            key={f.label}
            style={{
              background: t.surface2,
              border: `1px solid ${t.border2}`,
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
              {f.label}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: f.value >= 0 ? t.text : t.danger,
                marginTop: 2,
              }}
            >
              {f.value != null ? fmt(f.value) : "—"}
            </div>
            <div style={{ fontSize: 9, color: t.textDim, marginTop: 1 }}>{f.sub}</div>
          </div>
        ))}
      </div>

      {/* Next 7 Days Liquidity Feed */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Next 7 Days ({next7DaysCharges.length} items)
          </span>
          <div style={{ fontSize: 10, display: "flex", gap: 8 }}>
            <span style={{ color: t.accent }}>+{fmt(upcomingTotals.income)}</span>
            <span style={{ color: t.danger }}>−{fmt(upcomingTotals.expenses)}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflowY: "auto" }}>
          {next7DaysCharges.slice(0, 7).map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: CATEGORY_COLORS[c.type === "income" ? "income" : c.category] || t.accent,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: t.textDim, fontSize: 10, width: 68, flexShrink: 0 }}>
                {c.date ? new Date(c.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" }) : ""}
              </span>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: t.text,
                  fontWeight: 500,
                }}
              >
                {c.payee}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: c.type === "income" ? t.accent : t.danger,
                  flexShrink: 0,
                }}
              >
                {c.type === "income" ? "+" : "−"}{fmt(c.amount)}
              </span>
            </div>
          ))}

          {next7DaysCharges.length === 0 && (
            <div style={{ fontSize: 12, color: t.textDim, textAlign: "center", padding: "12px 0" }}>
              No bills or income scheduled in the next 7 days.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
