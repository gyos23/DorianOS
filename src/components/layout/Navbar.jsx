import React from "react";
import { THEMES } from "../../data/themes.js";
import { fmt } from "../../utils/formatters.js";

const NAV_ITEMS = [
  ["today", "★ Today"],
  ["priorities", "🎯 Priorities"],
  ["payoff", "💳 Debt Payoff"],
  ["cashflow", "📅 Cash Flow"],
  ["tasks", "✅ Tasks"],
  ["insights", "🧠 Insights"],
];

export function Navbar({
  section,
  setSection,
  debtMonthly,
  payoffDate,
  stalled,
  todayEOD,
  themeName,
  setThemeName,
  t,
}) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${t.border2}`,
        display: "flex",
        alignItems: "center",
        height: 54,
        background: t.surface,
        paddingRight: 16,
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 16,
          fontWeight: 800,
          color: t.accent,
          letterSpacing: "-0.02em",
          padding: "0 20px",
          borderRight: `1px solid ${t.border2}`,
          height: "100%",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        DORIAN OS
      </div>

      {NAV_ITEMS.map(([s, label]) => (
        <button
          key={s}
          className={`nav-btn ${section === s ? "active" : ""}`}
          onClick={() => setSection(s)}
        >
          {label}
        </button>
      ))}

      <div style={{ marginLeft: "auto", display: "flex", gap: 18, alignItems: "center" }}>
        {[
          { label: "Debt/mo", value: fmt(debtMonthly), color: t.danger },
          {
            label: "Debt-free",
            value: payoffDate
              ? payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
              : stalled
              ? "Never"
              : "30+ yrs",
            color: t.accent,
          },
          { label: "Cash today", value: fmt(todayEOD), color: t.accentSub },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 1,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: s.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </div>
          </div>
        ))}

        {/* Theme switcher */}
        <div
          style={{
            display: "flex",
            gap: 4,
            paddingLeft: 14,
            borderLeft: `1px solid ${t.border2}`,
            marginLeft: 4,
          }}
        >
          {Object.entries(THEMES).map(([key, th]) => (
            <button
              key={key}
              className={`theme-pill ${themeName === key ? "active" : ""}`}
              onClick={() => setThemeName(key)}
            >
              <span>{th.icon}</span>
              <span style={{ fontSize: 10 }}>{th.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
