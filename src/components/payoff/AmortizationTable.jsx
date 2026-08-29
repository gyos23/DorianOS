import React from "react";
import { fmtFull } from "../../utils/formatters.js";

export function AmortizationTable({ schedule, totalDebt, t }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${t.border2}` }}>
            {["Month", "Date", "Payment", "Interest", "Principal", "Balance"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 14px",
                  textAlign: "right",
                  color: t.textDim,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  fontWeight: 500,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedule.map((row, i) => {
            const prev = i > 0 ? schedule[i - 1].totalRemaining : totalDebt;
            const pd = new Date();
            pd.setMonth(pd.getMonth() + row.month);
            return (
              <tr
                key={row.month}
                className="debt-row"
                style={{ borderBottom: `1px solid ${t.border}` }}
              >
                <td style={{ padding: "8px 14px", color: t.textDim, textAlign: "right" }}>
                  {row.month}
                </td>
                <td style={{ padding: "8px 14px", color: t.textMuted, textAlign: "right" }}>
                  {pd.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </td>
                <td style={{ padding: "8px 14px", color: t.textSub, textAlign: "right" }}>
                  {fmtFull(row.monthlyBudget)}
                </td>
                <td style={{ padding: "8px 14px", color: t.danger, textAlign: "right" }}>
                  {fmtFull(row.totalInterest)}
                </td>
                <td style={{ padding: "8px 14px", color: t.accent, textAlign: "right" }}>
                  {fmtFull(prev - row.totalRemaining)}
                </td>
                <td
                  style={{
                    padding: "8px 14px",
                    color: t.text,
                    textAlign: "right",
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmtFull(row.totalRemaining)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
