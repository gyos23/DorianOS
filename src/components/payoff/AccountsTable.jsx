import React from "react";
import { fmtFull } from "../../utils/formatters.js";
import { DEBT_COLORS } from "../../data/debts.js";

export function AccountsTable({ debts, accounts, updateDebt, totalDebt, totalInterestPaid, t }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 14 }}>
        Edit any field — updates the forecast and cash flow in real-time.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${t.border2}` }}>
            {["", "Account", "Balance", "APR %", "Min Pmt", "Paid Off", "Int. Cost"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "8px 14px",
                  textAlign: "left",
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
          {debts.map((d, i) => {
            const acc = accounts.find((a) => a.id === d.id);
            const mo = acc?.paidOffMonth;
            const pd = mo ? new Date() : null;
            if (pd) pd.setMonth(pd.getMonth() + mo);
            return (
              <tr
                key={d.id}
                className="debt-row"
                style={{ borderBottom: `1px solid ${t.border}` }}
              >
                <td style={{ padding: "10px 14px" }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: DEBT_COLORS[i % DEBT_COLORS.length],
                    }}
                  />
                </td>
                <td style={{ padding: "10px 14px", color: t.textSub, fontWeight: 500 }}>
                  {d.name}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <input
                    type="number"
                    value={d.balance}
                    step="0.01"
                    onChange={(e) => updateDebt(d.id, "balance", e.target.value)}
                    style={{ width: 105 }}
                  />
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <input
                    type="number"
                    value={d.apr}
                    step="0.01"
                    onChange={(e) => updateDebt(d.id, "apr", e.target.value)}
                    style={{ width: 72 }}
                  />
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <input
                    type="number"
                    value={d.minPayment}
                    step="1"
                    onChange={(e) => updateDebt(d.id, "minPayment", e.target.value)}
                    style={{ width: 72 }}
                  />
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12 }}>
                  {mo ? (
                    <span style={{ color: t.accent }}>
                      {pd.toLocaleDateString("en-US", { month: "short", year: "numeric" })} (M{mo})
                    </span>
                  ) : d.minPayment < (d.balance * d.apr) / 100 / 12 ? (
                    <span
                      style={{ color: t.danger }}
                      title="Min payment is below monthly interest — debt grows each month"
                    >
                      ⚠ min &lt; interest
                    </span>
                  ) : (
                    <span style={{ color: t.textDim }}>—</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px", color: t.danger, fontSize: 12 }}>
                  {acc ? fmtFull(acc.totalInterest) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `2px solid ${t.border2}` }}>
            <td colSpan={2} style={{ padding: "12px 14px", color: t.accent, fontWeight: 600 }}>
              TOTAL
            </td>
            <td
              style={{
                padding: "12px 14px",
                color: t.accent,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtFull(totalDebt)}
            </td>
            <td colSpan={3} />
            <td style={{ padding: "12px 14px", color: t.danger, fontWeight: 700 }}>
              {fmtFull(totalInterestPaid)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
