import React from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fmt, fmtFull } from "../../utils/formatters.js";
import { DEBT_COLORS } from "../../data/debts.js";

function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border2}`,
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 12,
        boxShadow: `0 8px 24px rgba(0,0,0,.25)`,
      }}
    >
      <div style={{ color: t.accentSub, fontWeight: 600, marginBottom: 6, fontSize: 11 }}>
        Month {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          <span style={{ color: t.textMuted }}>{p.name}: </span>
          {fmt(p.value)}
        </div>
      ))}
    </div>
  );
}

export function DebtCharts({ chartData, debts, accounts, t }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: t.textDim,
          textTransform: "uppercase",
          letterSpacing: ".12em",
          marginBottom: 12,
          fontWeight: 500,
        }}
      >
        Total Debt Drawdown
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.accent} stopOpacity={0.2} />
              <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
          <XAxis
            dataKey="month"
            stroke={t.chartAxis}
            tick={{ fill: t.textDim, fontSize: 10 }}
            tickFormatter={(v) => `M${v}`}
          />
          <YAxis
            stroke={t.chartAxis}
            tick={{ fill: t.textDim, fontSize: 10 }}
            tickFormatter={(v) => fmt(v)}
            width={78}
          />
          <Tooltip content={<ChartTooltip t={t} />} />
          <Area
            type="monotone"
            dataKey="totalRemaining"
            name="Total Remaining"
            stroke={t.accent}
            fill="url(#dg)"
            strokeWidth={2.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontSize: 10,
            color: t.textDim,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            marginBottom: 12,
            fontWeight: 500,
          }}
        >
          Per Card
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
            <XAxis
              dataKey="month"
              stroke={t.chartAxis}
              tick={{ fill: t.textDim, fontSize: 10 }}
              tickFormatter={(v) => `M${v}`}
            />
            <YAxis
              stroke={t.chartAxis}
              tick={{ fill: t.textDim, fontSize: 10 }}
              tickFormatter={(v) => fmt(v)}
              width={78}
            />
            <Tooltip content={<ChartTooltip t={t} />} />
            <Legend wrapperStyle={{ fontSize: 11, color: t.textMuted }} />
            {debts
              .filter((d) => d.balance > 0)
              .map((d, i) => (
                <Line
                  key={d.id}
                  type="monotone"
                  dataKey={d.name}
                  stroke={DEBT_COLORS[i % DEBT_COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontSize: 10,
            color: t.textDim,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            marginBottom: 10,
            fontWeight: 500,
          }}
        >
          Payoff Order
        </div>
        {[...accounts]
          .filter((a) => a.paidOffMonth)
          .sort((a, b) => a.paidOffMonth - b.paidOffMonth)
          .map((a, i) => {
            const pd = new Date();
            pd.setMonth(pd.getMonth() + a.paidOffMonth);
            return (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  background: t.surface,
                  borderRadius: 8,
                  border: `1px solid ${t.border2}`,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 11, color: t.textFaint, width: 24, fontWeight: 600 }}>
                  #{i + 1}
                </span>
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background:
                      DEBT_COLORS[
                        debts.findIndex((dd) => dd.id === a.id) % DEBT_COLORS.length
                      ],
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 13, color: t.textSub, fontWeight: 500 }}>
                  {a.name}
                </span>
                <span style={{ fontSize: 12, color: t.textMuted }}>Month {a.paidOffMonth}</span>
                <span style={{ fontSize: 12, color: t.textDim }}>
                  {pd.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <span style={{ fontSize: 11, color: t.danger }}>
                  ({fmtFull(a.totalInterest)} int.)
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
