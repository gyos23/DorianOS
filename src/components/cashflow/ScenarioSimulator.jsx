import React, { useState, useMemo } from "react";
import { fmt } from "../../utils/formatters.js";
import { computeAmortization } from "../../utils/amortization.js";

export function ScenarioSimulator({
  startBal,
  debts,
  strategy = "avalanche",
  extraPayment = 500,
  debtMonthly = 1031,
  t,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Scenario parameters
  const [contractRate, setContractRate] = useState(0); // e.g. 6500 ($/mo)
  const [plannerSales, setPlannerSales] = useState(0); // e.g. 300 units
  const [plannerPrice, setPlannerPrice] = useState(29.99);
  const [simExtraDebt, setSimExtraDebt] = useState(500); // extra monthly towards debt
  const [lifestyleBurnDelta, setLifestyleBurnDelta] = useState(0); // e.g. -300 or +500

  // Baseline calculations
  const baseline = useMemo(() => {
    const res = computeAmortization(debts, strategy, extraPayment);
    const months = res.schedule.length;
    const payoffDate = res.neverPaidOff
      ? null
      : new Date(new Date().setMonth(new Date().getMonth() + months));
    const totalInterest = res.accounts.reduce((s, a) => s + a.totalInterest, 0);
    return {
      months,
      payoffDate,
      totalInterest,
      neverPaidOff: res.neverPaidOff,
      monthlyBudget: res.monthlyBudget,
    };
  }, [debts, strategy, extraPayment]);

  // Simulated calculations
  const simulated = useMemo(() => {
    const simRes = computeAmortization(debts, strategy, simExtraDebt);
    const simMonths = simRes.schedule.length;
    const simPayoffDate = simRes.neverPaidOff
      ? null
      : new Date(new Date().setMonth(new Date().getMonth() + simMonths));
    const simTotalInterest = simRes.accounts.reduce((s, a) => s + a.totalInterest, 0);
    const interestSaved = Math.max(0, baseline.totalInterest - simTotalInterest);
    const monthsSaved = Math.max(0, baseline.months - simMonths);

    // One-time infusion from planners
    const oneTimeInfusion = plannerSales * plannerPrice;

    // Monthly net cash flow delta
    const monthlyNetDelta = contractRate - lifestyleBurnDelta - (simExtraDebt - extraPayment);

    // Simulated runway projection
    const estimatedMonthlyBurn = 4200; // estimated baseline monthly burn
    const adjustedMonthlyBurn = Math.max(500, estimatedMonthlyBurn + lifestyleBurnDelta);
    const effectiveMonthlyDeficitOrSurplus = contractRate - adjustedMonthlyBurn;

    let simRunwayDays = 60;
    if (effectiveMonthlyDeficitOrSurplus >= 0) {
      simRunwayDays = 999; // Infinite / Cashflow positive
    } else {
      const totalAvailableCash = startBal + oneTimeInfusion;
      const dailyBurn = Math.abs(effectiveMonthlyDeficitOrSurplus) / 30;
      simRunwayDays = Math.round(totalAvailableCash / dailyBurn);
    }

    return {
      simMonths,
      simPayoffDate,
      simTotalInterest,
      interestSaved,
      monthsSaved,
      oneTimeInfusion,
      monthlyNetDelta,
      simRunwayDays,
      simMonthlyBudget: simRes.monthlyBudget,
    };
  }, [
    debts,
    strategy,
    simExtraDebt,
    extraPayment,
    contractRate,
    plannerSales,
    plannerPrice,
    lifestyleBurnDelta,
    startBal,
    baseline,
  ]);

  const hasChanges = contractRate > 0 || plannerSales > 0 || simExtraDebt !== extraPayment || lifestyleBurnDelta !== 0;

  const resetScenarios = () => {
    setContractRate(0);
    setPlannerSales(0);
    setSimExtraDebt(extraPayment);
    setLifestyleBurnDelta(0);
  };

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${hasChanges ? t.accent : t.border2}`,
        borderRadius: 12,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: hasChanges ? `0 0 16px ${t.accent}22` : "0 4px 12px rgba(0,0,0,0.06)",
        transition: "all .2s ease",
      }}
    >
      {/* Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 15,
                fontWeight: 800,
                color: t.text,
                letterSpacing: "-0.01em",
              }}
            >
              "What-If" Scenario & Career Inflection Modeler
            </div>
            <div style={{ fontSize: 11, color: t.textDim }}>
              Simulate contract start dates, planner sales infusions, and accelerated debt payoff.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasChanges && (
            <button
              className="btn"
              onClick={resetScenarios}
              style={{ fontSize: 11, padding: "3px 8px", color: t.textDim }}
            >
              Reset Simulation
            </button>
          )}
          <button
            className={`btn ${isOpen ? "active" : ""}`}
            onClick={() => setIsOpen((p) => !p)}
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            {isOpen ? "▲ Hide Controls" : "▼ Open Simulator"}
          </button>
        </div>
      </div>

      {/* Outcome Metric Snapshot Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          padding: 12,
          background: t.surface2,
          borderRadius: 8,
          border: `1px solid ${t.border2}`,
        }}
      >
        {/* Debt Freedom Shift */}
        <div>
          <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
            Debt-Free Horizon
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: hasChanges ? t.accent : t.text }}>
              {simulated.simPayoffDate
                ? simulated.simPayoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                : "Never"}
            </span>
            {hasChanges && simulated.monthsSaved > 0 && (
              <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                ({simulated.monthsSaved} mo faster!)
              </span>
            )}
          </div>
        </div>

        {/* Interest Saved */}
        <div>
          <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
            Interest Savings
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: simulated.interestSaved > 0 ? "#10B981" : t.text, marginTop: 2 }}>
            {simulated.interestSaved > 0 ? `+${fmt(simulated.interestSaved)}` : "$0.00"}
          </div>
        </div>

        {/* Cash Runway Impact */}
        <div>
          <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
            Simulated Cash Runway
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: simulated.simRunwayDays >= 90 ? "#10B981" : t.warning, marginTop: 2 }}>
            {simulated.simRunwayDays >= 999 ? "∞ Cashflow Positive" : `${simulated.simRunwayDays} Days`}
          </div>
        </div>

        {/* Planner Infusion */}
        {simulated.oneTimeInfusion > 0 && (
          <div>
            <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
              Planner Revenue Infusion
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#EF4444", marginTop: 2 }}>
              +{fmt(simulated.oneTimeInfusion)}
            </div>
          </div>
        )}
      </div>

      {/* Simulator Control Sliders */}
      {isOpen && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            paddingTop: 10,
            borderTop: `1px solid ${t.border2}`,
          }}
        >
          {/* 1. New Contract / Role Income */}
          <div
            style={{
              background: t.surface2,
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${t.border2}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                ⚪️ New Role / Contract Income
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#10B981" }}>
                +{fmt(contractRate)}/mo
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={16000}
              step={500}
              value={contractRate}
              onChange={(e) => setContractRate(parseFloat(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.textDim }}>
              <span>$0 (Current)</span>
              <span>$8k/mo</span>
              <span>$16k/mo</span>
            </div>
            <div style={{ fontSize: 10, color: t.textDim }}>
              e.g. Delivery Manager contract (£550/day ≈ $11,500/mo) or permanent base salary.
            </div>
          </div>

          {/* 2. Planner Venture Sales */}
          <div
            style={{
              background: t.surface2,
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${t.border2}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                🔴 Planner Venture Sales
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#EF4444" }}>
                {plannerSales} units (+{fmt(plannerSales * plannerPrice)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={plannerSales}
              onChange={(e) => setPlannerSales(parseInt(e.target.value, 10))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.textDim }}>
              <span>0 units</span>
              <span>150 units</span>
              <span>500 units</span>
            </div>
            <div style={{ fontSize: 10, color: t.textDim }}>
              Target: 300 units @ ${plannerPrice} = {fmt(300 * plannerPrice)} gross revenue.
            </div>
          </div>

          {/* 3. Monthly Debt Payoff Allocation */}
          <div
            style={{
              background: t.surface2,
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${t.border2}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                🟢 Monthly Extra Debt Payment
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>
                +{fmt(simExtraDebt)}/mo
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={3500}
              step={100}
              value={simExtraDebt}
              onChange={(e) => setSimExtraDebt(parseFloat(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.textDim }}>
              <span>$0 (Minimums)</span>
              <span>$1,500/mo</span>
              <span>$3,500/mo</span>
            </div>
            <div style={{ fontSize: 10, color: t.textDim }}>
              Total monthly debt budget will be {fmt(simulated.simMonthlyBudget)}/mo.
            </div>
          </div>

          {/* 4. Lifestyle & Discretionary Burn Shift */}
          <div
            style={{
              background: t.surface2,
              padding: 14,
              borderRadius: 8,
              border: `1px solid ${t.border2}`,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                Discretionary Spend Shift
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: lifestyleBurnDelta <= 0 ? "#10B981" : t.danger }}>
                {lifestyleBurnDelta > 0 ? `+${fmt(lifestyleBurnDelta)}` : fmt(lifestyleBurnDelta)}/mo
              </span>
            </div>
            <input
              type="range"
              min={-1500}
              max={1500}
              step={100}
              value={lifestyleBurnDelta}
              onChange={(e) => setLifestyleBurnDelta(parseFloat(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: t.textDim }}>
              <span>-$1,500 (Cuts)</span>
              <span>$0 (Baseline)</span>
              <span>+$1,500</span>
            </div>
            <div style={{ fontSize: 10, color: t.textDim }}>
              Model tightening recurring subscriptions or temporary lifestyle adjustments.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
