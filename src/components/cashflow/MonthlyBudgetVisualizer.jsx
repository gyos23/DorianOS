import React, { useMemo } from "react";
import { fmt } from "../../utils/formatters.js";
import { usePersistentState } from "../../hooks/usePersistentState.js";

export function MonthlyBudgetVisualizer({
  lmData = [],
  debts = [],
  debtMonthly = 1031,
  t,
}) {
  // 1. Inflow and Category allocations (saved persistently)
  const [budgetPlan, setBudgetPlan] = usePersistentState("cashflow.budgetPlan", {
    monthlyIncome: 6500,
    bills: 1850,
    debt: debtMonthly || 1031,
    needs: 1200,
    wants: 800,
    savings: 500,
  });

  // Calculate actual recurring bills from Lunch Money if available
  const detectedLMBills = useMemo(() => {
    if (!Array.isArray(lmData)) return 0;
    // sum negative recurring items that occur monthly or are active
    const monthlyTotal = lmData
      .filter((item) => item.amount && item.amount < 0)
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    return Math.round(monthlyTotal);
  }, [lmData]);

  const updateField = (field, value) => {
    setBudgetPlan((prev) => ({
      ...prev,
      [field]: Math.max(0, parseFloat(value) || 0),
    }));
  };

  const syncFromData = () => {
    setBudgetPlan((prev) => ({
      ...prev,
      debt: debtMonthly || prev.debt,
      bills: detectedLMBills > 0 ? detectedLMBills : prev.bills,
    }));
  };

  // Calculations
  const income = budgetPlan.monthlyIncome || 0;
  const totalAllocated =
    budgetPlan.bills +
    budgetPlan.debt +
    budgetPlan.needs +
    budgetPlan.wants +
    budgetPlan.savings;

  const remaining = income - totalAllocated;
  const isOverBudget = remaining < 0;
  const percentAllocated = income > 0 ? Math.round((totalAllocated / income) * 100) : 0;
  const overAmount = Math.abs(remaining);

  // SVG Radial Gauge Math
  const size = 220;
  const strokeWidth = 18;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  // Clamp visual stroke to 100% of circle, but change color when >100%
  const visualPercent = Math.min(100, percentAllocated);
  const strokeDashoffset = circumference - (visualPercent / 100) * circumference;

  // Breakdown percentages of income
  const pctOfIncome = (amt) => (income > 0 ? Math.round((amt / income) * 100) : 0);

  // Category Colors
  const BUCKETS = [
    { id: "bills", label: "Fixed Bills & Subs", amt: budgetPlan.bills, color: "#38BDF8", desc: "Rent, utilities, software" },
    { id: "debt", label: "Debt Payoff", amt: budgetPlan.debt, color: "#F59E0B", desc: "Credit cards, loans" },
    { id: "needs", label: "Essential Needs", amt: budgetPlan.needs, color: "#10B981", desc: "Groceries, fuel, health" },
    { id: "wants", label: "Discretionary Wants", amt: budgetPlan.wants, color: "#A855F7", desc: "Dining out, lifestyle" },
    { id: "savings", label: "Buffer & Savings", amt: budgetPlan.savings, color: "#6366F1", desc: "Emergency cash floor" },
  ];

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${isOverBudget ? t.danger : t.border2}`,
        borderRadius: 14,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxShadow: isOverBudget
          ? "0 0 20px rgba(239, 68, 68, 0.18)"
          : "0 4px 16px rgba(0,0,0,0.06)",
        transition: "all 0.25s ease",
      }}
    >
      {/* Header & Income Control */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 16,
          borderBottom: `1px solid ${t.border2}`,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>⭕</span>
            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 17,
                fontWeight: 800,
                color: t.text,
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              Monthly Budget Capacity & "Living Within Means" Circle
            </h2>
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 3 }}>
            Zero-based monthly ceiling. Every dollar is assigned until remaining buffer reaches zero.
          </div>
        </div>

        {/* Income Envelope Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              background: t.surface2,
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${t.border2}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>
              Monthly Inflow:
            </span>
            <span style={{ fontSize: 14, color: "#10B981", fontWeight: 700 }}>$</span>
            <input
              type="number"
              value={budgetPlan.monthlyIncome}
              onChange={(e) => updateField("monthlyIncome", e.target.value)}
              style={{
                width: 90,
                background: "transparent",
                border: "none",
                fontSize: 15,
                fontWeight: 800,
                color: t.text,
                padding: 0,
                outline: "none",
              }}
            />
          </div>

          <button
            className="btn"
            onClick={syncFromData}
            title="Auto-sync bills from Lunch Money and Debt from Payoff plan"
            style={{ fontSize: 11, padding: "6px 10px", color: t.accent }}
          >
            ↻ Auto-Sync Real Totals
          </button>
        </div>
      </div>

      {/* Main Visual Section: Circle + Status Alert */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 28,
          alignItems: "center",
        }}
      >
        {/* Radial Circle Gauge */}
        <div
          style={{
            position: "relative",
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            {/* Background Track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={t.surface2}
              strokeWidth={strokeWidth}
            />

            {/* Filled Progress Arc */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={isOverBudget ? "#EF4444" : percentAllocated >= 95 ? "#F59E0B" : t.accent}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.4s ease, stroke 0.3s ease",
              }}
            />
          </svg>

          {/* Center Readout */}
          <div
            style={{
              position: "absolute",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                fontWeight: 700,
                color: isOverBudget ? t.danger : t.textDim,
              }}
            >
              {isOverBudget ? "Over Budget" : "Remaining Buffer"}
            </div>

            <div
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 22,
                fontWeight: 800,
                color: isOverBudget ? t.danger : "#10B981",
                marginTop: 2,
                letterSpacing: "-0.02em",
              }}
            >
              {isOverBudget ? `-${fmt(overAmount)}` : `+${fmt(remaining)}`}
            </div>

            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isOverBudget ? t.danger : t.textMuted,
                marginTop: 3,
              }}
            >
              {percentAllocated}% of income
            </div>
          </div>
        </div>

        {/* Right Status Banner & Capacity Bar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Living Beyond Means Alert Banner */}
          {isOverBudget ? (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>🚨</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#EF4444" }}>
                  Living Beyond Means Warning (-{fmt(overAmount)} Deficit)
                </div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 3, lineHeight: 1.5 }}>
                  Your planned expenses claim <strong>{percentAllocated}%</strong> of your monthly income.
                  Reduce Discretionary Wants or adjust extra debt velocity to bring total allocations back under the $
                  {fmt(income)} ceiling.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>✅</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#10B981" }}>
                  Living Within Means ({fmt(remaining)} Unallocated Margin)
                </div>
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 3, lineHeight: 1.5 }}>
                  All obligations are fully funded within your ${fmt(income)} inflow envelope.
                  You have a <strong>{100 - percentAllocated}% buffer</strong> ($
                  {fmt(remaining)}) available for savings or unexpected expenses.
                </div>
              </div>
            </div>
          )}

          {/* Multi-segment Stacked Horizontal Capacity Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.textDim }}>
              <span>Total Obligations: <strong>{fmt(totalAllocated)}</strong></span>
              <span>Income Ceiling: <strong>{fmt(income)}</strong></span>
            </div>

            <div
              style={{
                width: "100%",
                height: 12,
                background: t.surface2,
                borderRadius: 6,
                overflow: "hidden",
                display: "flex",
                border: `1px solid ${t.border2}`,
              }}
            >
              {BUCKETS.map((b) => {
                const widthPct = income > 0 ? Math.min(100, (b.amt / income) * 100) : 0;
                if (widthPct <= 0) return null;
                return (
                  <div
                    key={b.id}
                    title={`${b.label}: ${fmt(b.amt)} (${Math.round(widthPct)}%)`}
                    style={{
                      width: `${widthPct}%`,
                      height: "100%",
                      background: b.color,
                      transition: "width 0.3s ease",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Adjustable Sliders */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          paddingTop: 16,
          borderTop: `1px solid ${t.border2}`,
        }}
      >
        {BUCKETS.map((b) => {
          const pct = pctOfIncome(b.amt);

          return (
            <div
              key={b.id}
              style={{
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderTop: `3px solid ${b.color}`,
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>{b.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: b.color }}>{pct}%</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: t.textDim }}>$</span>
                <input
                  type="number"
                  value={b.amt}
                  onChange={(e) => updateField(b.id, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "4px 8px",
                    background: t.surface,
                    border: `1px solid ${t.border3}`,
                    borderRadius: 5,
                    color: t.text,
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(b.amt * 1.5, income * 0.8 || 3000)}
                step={25}
                value={b.amt}
                onChange={(e) => updateField(b.id, e.target.value)}
                style={{ accentColor: b.color }}
              />

              <div style={{ fontSize: 9, color: t.textDim, lineHeight: 1.3 }}>{b.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
