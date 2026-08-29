import React from "react";

export function StatCard({ label, value, sub, color, style = {} }) {
  return (
    <div className="stat-card" style={style}>
      <div
        style={{
          fontSize: 9,
          color: "var(--theme-textDim)",
          textTransform: "uppercase",
          letterSpacing: ".12em",
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          color,
          letterSpacing: "-0.03em",
          marginBottom: 4,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--theme-textMuted)" }}>{sub}</div>}
    </div>
  );
}
