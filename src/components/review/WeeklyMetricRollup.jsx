import React, { useMemo, useState } from "react";
import { generateMetricInsights } from "../../utils/metricInsights.js";

export function WeeklyMetricRollup({
  priorities = [],
  progressHistory = [],
  setProgressHistory,
  startBal = 4952,
  checkingBal = 4952,
  runwayDays = 60,
  monthlyBurn = 6500,
  cashZeroDate = null,
  debts = [],
  payoffDate = null,
  ofTasks = [],
  ofProjects = [],
  t,
}) {
  const [filterPriority, setFilterPriority] = useState("all");

  const totalDebt = useMemo(() => debts.reduce((sum, d) => sum + (d.balance || 0), 0), [debts]);
  const completedTasks = useMemo(() => ofTasks.filter((t) => t.completed).length, [ofTasks]);
  const stalledCount = useMemo(() => {
    return priorities.filter((p) => {
      if (p.status !== "active") return false;
      const target = (p.ofProject || "").toLowerCase().trim();
      const proj = ofProjects.find((pr) => (pr.name || "").toLowerCase().trim() === target);
      return proj?.isStale || proj?.stale;
    }).length;
  }, [priorities, ofProjects]);

  const { rollup, insights, strategicFocus } = useMemo(() => {
    return generateMetricInsights({
      priorities,
      progressHistory,
      financials: {
        startBal,
        checkingBal,
        runwayDays,
        monthlyBurn,
        cashZeroDate,
        totalDebt,
        payoffDate,
      },
      ofStats: {
        totalTasks: ofTasks.length,
        completedTasks,
        stalledCount,
      },
    });
  }, [priorities, progressHistory, startBal, checkingBal, runwayDays, monthlyBurn, cashZeroDate, totalDebt, payoffDate, ofTasks.length, completedTasks, stalledCount]);

  const filteredHistory = useMemo(() => {
    if (filterPriority === "all") return progressHistory;
    return progressHistory.filter((h) => h.priorityId === filterPriority);
  }, [progressHistory, filterPriority]);

  const handleDeleteHistory = (id) => {
    if (confirm("Remove this progress memory from history?")) {
      setProgressHistory?.((prev) => prev.filter((h) => h.id !== id));
    }
  };

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border2}`,
        borderRadius: 12,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🧠</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text, letterSpacing: "-0.01em" }}>
              Automated Metric Rollup & Strategic Intelligence
            </h3>
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
              Synthesizing cross-pillar velocity, runway leverage, and permanent weekly progress memories.
            </div>
          </div>
        </div>

        <div
          style={{
            background: `${t.accent}14`,
            border: `1px solid ${t.accent}30`,
            borderRadius: 8,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            color: t.accent,
          }}
        >
          {progressHistory.length} Weekly Cycles Logged
        </div>
      </div>

      {/* Strategic Focus Recommendation Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${t.accent}12 0%, ${t.surface2} 100%)`,
          border: `1px solid ${t.accent}40`,
          borderLeft: `4px solid ${t.accent}`,
          borderRadius: 8,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 20 }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: t.accent, letterSpacing: ".06em" }}>
            Highest-Leverage Strategic Focus for this Sprint
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginTop: 2 }}>
            {strategicFocus}
          </div>
        </div>
      </div>

      {/* KPI Metric Rollup Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {/* Forward Rollup */}
        <div style={{ background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
            <span>⚪️ Forward (Role Search)</span>
            <span>{rollup.forward.percent}%</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginTop: 4 }}>
            {rollup.forward.current} <span style={{ fontSize: 12, color: t.textDim, fontWeight: 500 }}>/ {rollup.forward.target} apps/wk</span>
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>
            {rollup.forward.totalLogged} total apps across {rollup.forward.historyCount} logged weeks (avg {rollup.forward.avgPerWeek}/wk)
          </div>
        </div>

        {/* Freedom Rollup */}
        <div style={{ background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#EF4444", fontWeight: 700, textTransform: "uppercase" }}>
            <span>🔴 Freedom (300 Planners)</span>
            <span>{rollup.freedom.percent}%</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginTop: 4 }}>
            {rollup.freedom.current} <span style={{ fontSize: 12, color: t.textDim, fontWeight: 500 }}>/ {rollup.freedom.target} shipped</span>
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>
            {rollup.freedom.remaining} units to go · Pacing needed: <strong>~{rollup.freedom.pacingNeededPerWeek}/wk</strong>
          </div>
        </div>

        {/* Finance Rollup */}
        <div style={{ background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#22C55E", fontWeight: 700, textTransform: "uppercase" }}>
            <span>🟢 Finance (Runway)</span>
            <span>{rollup.finance.runwayDays} Days</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginTop: 4 }}>
            ${rollup.finance.checkingBal.toLocaleString()} <span style={{ fontSize: 12, color: t.textDim, fontWeight: 500 }}>liquid</span>
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>
            Burn: ${rollup.finance.dailyBurn}/day · Shield to {rollup.finance.cashZeroDate || "Dec 31"}
          </div>
        </div>

        {/* OmniFocus Execution Rollup */}
        <div style={{ background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3B82F6", fontWeight: 700, textTransform: "uppercase" }}>
            <span>⚡ Execution Momentum</span>
            <span>{rollup.execution.stalledCount === 0 ? "Fluid" : `${rollup.execution.stalledCount} Bottlenecks`}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginTop: 4 }}>
            {rollup.execution.totalTasks} <span style={{ fontSize: 12, color: t.textDim, fontWeight: 500 }}>open actions</span>
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>
            Linked to 5 pillars with real-time bridge sync
          </div>
        </div>
      </div>

      {/* Derived Metric Insights */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
          💡 Derived Metric Insights
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {insights.map((ins) => {
            const badgeColor =
              ins.badgeType === "success" ? "#10B981" : ins.badgeType === "warning" ? "#F59E0B" : t.accent;

            return (
              <div
                key={ins.id}
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                    {ins.title}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: `${badgeColor}18`,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}30`,
                      textTransform: "uppercase",
                    }}
                  >
                    {ins.badge}
                  </span>
                </div>

                <div style={{ fontSize: 11.5, color: t.textSub, lineHeight: 1.45 }}>
                  {ins.summary}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: t.accent,
                    background: `${t.accent}0D`,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: `1px solid ${t.accent}20`,
                    marginTop: 2,
                  }}
                >
                  ⚡ <strong>Action:</strong> {ins.takeaway}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Logged Weekly Memories Trail */}
      <div style={{ marginTop: 6, borderTop: `1px solid ${t.border2}`, paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>📜</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: t.text }}>
              Weekly Progress Memories Log ({filteredHistory.length})
            </span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            {["all", "p-forward-role", "p-freedom-planners"].map((filter) => (
              <button
                key={filter}
                className={`btn ${filterPriority === filter ? "active" : ""}`}
                onClick={() => setFilterPriority(filter)}
                style={{ fontSize: 10, padding: "3px 8px" }}
              >
                {filter === "all" ? "All Priorities" : filter === "p-forward-role" ? "Forward Role" : "300 Planners"}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div
            style={{
              background: t.surface2,
              border: `1px dashed ${t.border2}`,
              borderRadius: 8,
              padding: "24px 16px",
              textAlign: "center",
              color: t.textDim,
              fontSize: 12,
            }}
          >
            No weekly progress memories logged yet. When you complete a week on any goal, click <strong>"Log Week Progress"</strong> on the priority card to preserve your accomplishments and lessons!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredHistory.map((mem) => {
              const isHit = mem.percent >= 100;

              return (
                <div
                  key={mem.id}
                  style={{
                    background: t.surface2,
                    border: `1px solid ${t.border2}`,
                    borderLeft: `4px solid ${isHit ? "#10B981" : t.accent}`,
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                        {mem.priorityTitle}
                      </span>
                      <span style={{ fontSize: 10, color: t.textDim }}>
                        • {mem.weekLabel}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: isHit ? "#10B98118" : `${t.accent}18`,
                          color: isHit ? "#10B981" : t.accent,
                        }}
                      >
                        {mem.valueAchieved} / {mem.targetValue} {mem.unit} ({mem.percent}%)
                      </span>
                      <button
                        onClick={() => handleDeleteHistory(mem.id)}
                        title="Delete entry"
                        style={{ background: "none", border: "none", color: t.textDim, fontSize: 13, cursor: "pointer", padding: "0 2px" }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {mem.reflection && (
                    <div style={{ fontSize: 11.5, color: t.textSub, background: t.surface, padding: "6px 10px", borderRadius: 6 }}>
                      💭 <strong>Memory / Takeaway:</strong> {mem.reflection}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, fontSize: 10, color: t.textDim }}>
                    <span>🏷️ {mem.highlightTag || "Progress logged"}</span>
                    {mem.metricsSnapshot?.runwayDays && <span>🛡️ Runway at time: {mem.metricsSnapshot.runwayDays}d</span>}
                    <span>📅 Logged on {mem.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
