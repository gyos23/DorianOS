import React, { useState } from "react";
import { fmt } from "../../utils/formatters.js";
import { StatCard } from "../layout/StatCard.jsx";
import { DebtCharts } from "./DebtCharts.jsx";
import { AmortizationTable } from "./AmortizationTable.jsx";
import { AccountsTable } from "./AccountsTable.jsx";

export default function DebtPayoffTab({
  debts,
  updateDebt,
  strategy,
  setStrategy,
  extraPayment,
  setExtraPayment,
  schedule,
  accounts,
  debtMonthly,
  totalDebt,
  totalInterestPaid,
  payoffMonths,
  payoffDate,
  breakeven,
  neverPaidOff,
  syncDebts,
  debtSyncStatus,
  t,
}) {
  const [activeDebtTab, setActiveDebtTab] = useState("chart");

  const chartData = schedule.filter(
    (_, i) => i % Math.max(1, Math.floor(schedule.length / 60)) === 0 || i === schedule.length - 1
  );

  return (
    <div>
      {/* Stat bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          borderBottom: `1px solid ${t.border2}`,
        }}
      >
        <StatCard
          label="Total Debt"
          value={fmt(totalDebt)}
          sub="current balance"
          color={t.danger}
        />
        <StatCard
          label="Payoff Date"
          value={
            neverPaidOff
              ? "Never"
              : payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          }
          sub={neverPaidOff ? "min payments don't cover interest" : `${payoffMonths} months`}
          color={neverPaidOff ? t.danger : t.accent}
        />
        <StatCard
          label="Total Interest"
          value={neverPaidOff ? `${fmt(totalInterestPaid)}+` : fmt(totalInterestPaid)}
          sub={neverPaidOff ? "debt is growing, not shrinking" : "cost of carrying debt"}
          color={t.warning}
        />
        <StatCard
          label="Monthly Payment"
          value={fmt(debtMonthly)}
          sub={`${fmt(breakeven)} min + ${fmt(extraPayment)} extra`}
          color={t.accentSub}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "14px 24px",
          borderBottom: `1px solid ${t.border2}`,
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
          background: t.surface,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 9,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              marginBottom: 8,
              fontWeight: 500,
            }}
          >
            Strategy
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              ["avalanche", "Avalanche"],
              ["snowball", "Snowball"],
              ["equal", "Equal Split"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={`btn ${strategy === v ? "active" : ""}`}
                onClick={() => setStrategy(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                fontWeight: 500,
              }}
            >
              Extra Monthly{" "}
              <span style={{ textTransform: "none", letterSpacing: "normal" }}>
                (on top of {fmt(breakeven)} min to hold steady)
              </span>
            </span>
            <span
              style={{
                fontSize: 15,
                color: t.accent,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(extraPayment)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={extraPayment}
            onChange={(e) => setExtraPayment(+e.target.value)}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: t.textFaint,
              marginTop: 3,
            }}
          >
            <span>$0</span>
            <span>$5,000</span>
          </div>
        </div>

        <div
          style={{
            padding: "10px 16px",
            background: t.dangerBg,
            border: `1px solid ${t.dangerBd}`,
            borderRadius: 8,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              marginBottom: 3,
              fontWeight: 500,
            }}
          >
            ↓ Feeds Cash Flow
          </div>
          <div style={{ color: t.danger, fontWeight: 600 }}>{fmt(debtMonthly)}/mo on the 1st</div>
        </div>

        <button
          className="btn"
          onClick={syncDebts}
          disabled={debtSyncStatus === "loading"}
          style={{
            marginLeft: "auto",
            opacity: debtSyncStatus === "loading" ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {debtSyncStatus === "loading"
            ? "Syncing…"
            : debtSyncStatus === "done"
            ? "✓ Synced"
            : debtSyncStatus === "error"
            ? "✕ Error"
            : "↻ Sync Balances"}
        </button>
      </div>

      {/* Sub-tabs */}
      <div
        style={{
          borderBottom: `1px solid ${t.border2}`,
          padding: "0 24px",
          display: "flex",
          background: t.surface,
        }}
      >
        {["chart", "schedule", "accounts"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeDebtTab === tab ? "active" : ""}`}
            onClick={() => setActiveDebtTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px" }}>
        {activeDebtTab === "chart" && (
          <DebtCharts chartData={chartData} debts={debts} accounts={accounts} t={t} />
        )}
        {activeDebtTab === "schedule" && (
          <AmortizationTable schedule={schedule} totalDebt={totalDebt} t={t} />
        )}
        {activeDebtTab === "accounts" && (
          <AccountsTable
            debts={debts}
            accounts={accounts}
            updateDebt={updateDebt}
            totalDebt={totalDebt}
            totalInterestPaid={totalInterestPaid}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
