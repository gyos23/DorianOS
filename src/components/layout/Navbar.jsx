import React from "react";
import { THEMES } from "../../data/themes.js";
import { fmt } from "../../utils/formatters.js";

const NAV_ITEMS = [
  ["today", "★ Today"],
  ["review", "🔄 Review"],
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
  runwayBasis = "checking",
  setRunwayBasis,
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
        paddingRight: 14,
        position: "sticky",
        top: 0,
        zIndex: 50,
        gap: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans',sans-serif",
          fontSize: 15,
          fontWeight: 800,
          color: t.accent,
          letterSpacing: "-0.02em",
          padding: "0 16px",
          borderRight: `1px solid ${t.border2}`,
          height: "100%",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        DORIAN OS
      </div>

      {/* Nav items container */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          overflowX: "auto",
          scrollbarWidth: "none",
          flexShrink: 1,
          minWidth: 0,
        }}
      >
        {NAV_ITEMS.map(([s, label]) => (
          <button
            key={s}
            className={`nav-btn ${section === s ? "active" : ""}`}
            onClick={() => setSection(s)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Metrics & Theme Controls */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {[
          { label: "Debt/mo", value: fmt(debtMonthly), color: t.danger },
          {
            label: "Debt-free",
            value: (() => {
              const d = payoffDate instanceof Date ? payoffDate : (payoffDate ? new Date(payoffDate) : null);
              if (d && !isNaN(d.getTime())) {
                return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
              }
              return stalled ? "Never" : "30+ yrs";
            })(),
            color: t.accent,
          },
          {
            label: `Cash (${runwayBasis === "total" ? "Total" : "Check"})`,
            value: fmt(todayEOD),
            color: t.accentSub,
            clickable: true,
            onClick: () => setRunwayBasis?.(runwayBasis === "total" ? "checking" : "total"),
            title: `Click to toggle basis: currently ${runwayBasis === "total" ? "Total Liquid Cash" : "Checking Cash"}`,
          },
          {
            label: "FX Rates",
            value: "€/£ → $",
            color: t.textDim,
            title: "Multi-currency accounts (Wise EUR, Irish accounts, etc.) automatically normalized to USD runway",
          },
        ].map((s) => (
          <div
            key={s.label}
            onClick={s.onClick}
            title={s.title}
            style={{
              textAlign: "right",
              cursor: s.clickable ? "pointer" : "default",
              userSelect: "none",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            <div
              style={{
                fontSize: 8.5,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                marginBottom: 2,
                whiteSpace: "nowrap",
                fontWeight: 600,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: s.color,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
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
            paddingLeft: 10,
            borderLeft: `1px solid ${t.border2}`,
            marginLeft: 2,
            flexShrink: 0,
          }}
        >
          {Object.entries(THEMES).map(([key, th]) => (
            <button
              key={key}
              className={`theme-pill ${themeName === key ? "active" : ""}`}
              onClick={() => setThemeName(key)}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              <span>{th.icon}</span>
              <span style={{ fontSize: 9.5 }}>{th.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

