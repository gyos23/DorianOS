import React, { useState, useMemo } from "react";
import { fmt } from "../../utils/formatters.js";
import { PILLARS } from "../../data/priorities.js";
import { ofDueLabel } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";
import { ScenarioSimulator } from "../cashflow/ScenarioSimulator.jsx";
import { usePersistentState } from "../../hooks/usePersistentState.js";

const REVIEW_STEPS = [
  { id: "inbox", label: "1. Task Velocity & Inbox", icon: "📥" },
  { id: "pillars", label: "2. 5-Pillar Ventures", icon: "🎯" },
  { id: "finance", label: "3. Sunday Runway Pulse", icon: "💰" },
  { id: "simulator", label: "4. What-If Simulator", icon: "⚡" },
  { id: "commitments", label: "5. Weekly Commitments", icon: "🚀" },
];

export default function WeeklyReviewTab({
  ofTasks = [],
  completeTask,
  toggleFlag,
  priorities = [],
  setPriorities,
  startBal,
  debts,
  strategy,
  extraPayment,
  debtMonthly,
  payoffDate,
  forecasts,
  cashZeroDate,
  onNavigate,
  t,
}) {
  const [activeStep, setActiveStep] = useState("inbox");
  const [weeklyNotes, setWeeklyNotes] = usePersistentState("review.weeklyNotes", {
    win: "",
    blocker: "",
    topCommitment1: "5 high-quality role applications per weekday",
    topCommitment2: "Drive newsletter subscriber growth for planner launch",
    topCommitment3: "Maintain runway discipline and weekly Lunch Money review",
  });

  const [completedSteps, setCompletedSteps] = usePersistentState("review.completedSteps", {
    inbox: false,
    pillars: false,
    finance: false,
    simulator: false,
    commitments: false,
  });

  // Task analysis
  const inboxTasks = useMemo(() => {
    return ofTasks.filter((t) => t.project === "📥 Inbox" || (t.project || "").includes("Inbox"));
  }, [ofTasks]);

  const flaggedTasks = useMemo(() => {
    return ofTasks.filter((t) => t.flagged);
  }, [ofTasks]);

  const activePriorities = useMemo(() => {
    return priorities.filter((p) => p.status === "active");
  }, [priorities]);

  const backlogPriorities = useMemo(() => {
    return priorities.filter((p) => p.status === "paused");
  }, [priorities]);

  const toggleStepDone = (stepId) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const handleUpdatePriority = (updated) => {
    setPriorities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "24px 20px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          paddingBottom: 16,
          borderBottom: `1px solid ${t.border2}`,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🔄</span>
            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                fontSize: 24,
                fontWeight: 800,
                color: t.text,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Executive Weekly Review & Planning Cockpit
            </h1>
          </div>
          <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
            End-of-week retrospective, task triage, Sunday runway audit, and next week focus.
          </div>
        </div>

        {/* Step Progress Pill Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>Review Progress:</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#10B981",
              background: "#10B98118",
              padding: "3px 8px",
              borderRadius: 12,
            }}
          >
            {Object.values(completedSteps).filter(Boolean).length} / {REVIEW_STEPS.length} Completed
          </span>
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${REVIEW_STEPS.length}, 1fr)`,
          gap: 8,
          background: t.surface,
          padding: 6,
          borderRadius: 10,
          border: `1px solid ${t.border2}`,
        }}
      >
        {REVIEW_STEPS.map((step) => {
          const isSelected = activeStep === step.id;
          const isDone = completedSteps[step.id];

          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              style={{
                background: isSelected ? t.surface2 : "transparent",
                border: isSelected ? `1px solid ${t.accent}` : "1px solid transparent",
                borderRadius: 7,
                padding: "8px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: isSelected ? t.accent : t.textMuted,
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                transition: "all .15s ease",
              }}
            >
              <span>{isDone ? "✅" : step.icon}</span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step 1: Task Velocity & Inbox Triage */}
      {activeStep === "inbox" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, margin: 0, color: t.text }}>
                  📥 Inbox Triage & Velocity
                </h3>
                <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
                  Process unprocessed OmniFocus inbox items and clarify next actions.
                </div>
              </div>

              <button
                className={`btn ${completedSteps.inbox ? "active" : ""}`}
                onClick={() => toggleStepDone("inbox")}
                style={{ fontSize: 11, padding: "4px 10px" }}
              >
                {completedSteps.inbox ? "✓ Marked Complete" : "Mark Step Complete"}
              </button>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Inbox Items Pending
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: inboxTasks.length === 0 ? "#10B981" : t.warning }}>
                  {inboxTasks.length === 0 ? "0 (Inbox Zero! 🎉)" : inboxTasks.length}
                </div>
              </div>
              <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Flagged High-Priority
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.danger }}>
                  {flaggedTasks.length}
                </div>
              </div>
              <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Total Open Actions
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>
                  {ofTasks.length}
                </div>
              </div>
            </div>

            {/* Inbox Tasks List */}
            {inboxTasks.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase" }}>
                  Items To Process from Inbox:
                </div>
                {inboxTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: t.surface2,
                      border: `1px solid ${t.border2}`,
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => completeTask?.(task.id)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: `1.5px solid ${t.border3}`,
                          background: "transparent",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          color: t.accent,
                        }}
                      >
                        ✓
                      </button>
                      <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{task.name}</span>
                    </div>
                    <a
                      href={`omnifocus:///task/${task.id}`}
                      style={{ fontSize: 11, color: t.textDim, textDecoration: "none" }}
                    >
                      Process in OF ↗
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "16px 0", color: "#10B981", fontSize: 13, fontWeight: 600 }}>
                ✨ Great work! Your OmniFocus inbox is completely clear.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: 5-Pillar Ventures & Priorities Review */}
      {activeStep === "pillars" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, margin: 0, color: t.text }}>
                  🎯 5-Pillar Ventures & Priorities Audit
                </h3>
                <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
                  Check status, update weekly metric counts, and manage lifecycle shifts (Active / Backlog).
                </div>
              </div>

              <button
                className={`btn ${completedSteps.pillars ? "active" : ""}`}
                onClick={() => toggleStepDone("pillars")}
                style={{ fontSize: 11, padding: "4px 10px" }}
              >
                {completedSteps.pillars ? "✓ Marked Complete" : "Mark Step Complete"}
              </button>
            </div>

            {/* Active Priorities Review Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {activePriorities.map((p) => {
                const pillar = PILLARS[p.pillar] || PILLARS.forward;
                const pct = p.targetValue > 0 ? Math.min(100, Math.round((p.currentValue / p.targetValue) * 100)) : 0;

                return (
                  <div
                    key={p.id}
                    style={{
                      background: t.surface2,
                      border: `1px solid ${t.border2}`,
                      borderLeft: `3px solid ${pillar.color}`,
                      borderRadius: 8,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pillar.color, textTransform: "uppercase" }}>
                        {pillar.icon} {pillar.name}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>
                        {p.currentValue} / {p.targetValue} {p.unit}
                      </span>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{p.title}</div>

                    {/* Progress slider */}
                    <div style={{ width: "100%", height: 5, background: t.border2, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: pillar.color, borderRadius: 3 }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: t.textDim }}>{pct}% complete</span>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn"
                          onClick={() => handleUpdatePriority({ ...p, currentValue: Math.max(0, p.currentValue - 1) })}
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        >
                          −1
                        </button>
                        <button
                          className="btn active"
                          onClick={() => handleUpdatePriority({ ...p, currentValue: p.currentValue + 1 })}
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Backlog Pillars Check */}
            {backlogPriorities.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase", marginBottom: 6 }}>
                  Project Backlog (On Hold):
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {backlogPriorities.map((bp) => {
                    const pillar = PILLARS[bp.pillar] || PILLARS.forward;
                    return (
                      <div
                        key={bp.id}
                        style={{
                          fontSize: 11,
                          padding: "6px 12px",
                          background: t.surface2,
                          border: `1px solid ${t.border2}`,
                          borderRadius: 6,
                          color: t.textMuted,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{pillar.icon}</span>
                        <span>{bp.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Sunday Runway & Financial Pulse */}
      {activeStep === "finance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, margin: 0, color: t.text }}>
                  💰 Sunday Runway & Cash Verification
                </h3>
                <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
                  Audit your weekly burn rate, liquid reserves, and debt payoff trajectory.
                </div>
              </div>

              <button
                className={`btn ${completedSteps.finance ? "active" : ""}`}
                onClick={() => toggleStepDone("finance")}
                style={{ fontSize: 11, padding: "4px 10px" }}
              >
                {completedSteps.finance ? "✓ Marked Complete" : "Mark Step Complete"}
              </button>
            </div>

            {/* Financial Highlights */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div style={{ background: t.surface2, padding: 14, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Liquid Cash (Wise)
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981", marginTop: 2 }}>
                  {fmt(startBal)}
                </div>
              </div>

              <div style={{ background: t.surface2, padding: 14, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  End of Month Forecast
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: (forecasts?.eom || 0) >= 0 ? t.text : t.danger, marginTop: 2 }}>
                  {fmt(forecasts?.eom || 0)}
                </div>
              </div>

              <div style={{ background: t.surface2, padding: 14, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Zero-Balance Horizon
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: cashZeroDate ? t.warning : "#10B981", marginTop: 4 }}>
                  {cashZeroDate ? `Zero on ${cashZeroDate}` : "Runway Safe (>60d)"}
                </div>
              </div>

              <div style={{ background: t.surface2, padding: 14, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Debt Freedom Date
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: t.accent, marginTop: 4 }}>
                  {payoffDate ? payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Calculating…"}
                </div>
              </div>
            </div>

            {/* Sunday Checklist */}
            <div
              style={{
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderRadius: 8,
                padding: 14,
                fontSize: 12,
                color: t.text,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 4, color: t.accent }}>
                ✓ Sunday Financial Ritual (SMART Goal Rule):
              </div>
              <div>• Lunch Money Plaid transactions reviewed & categorized.</div>
              <div>• Minimum CC payments confirmed (AMEX Biz, Apple Card, AMEX Delta).</div>
              <div>• Runway verified against 60-day projected bills. Target: No surprises.</div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: What-If Scenario Simulator */}
      {activeStep === "simulator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ScenarioSimulator
            startBal={startBal}
            debts={debts}
            strategy={strategy}
            extraPayment={extraPayment}
            debtMonthly={debtMonthly}
            t={t}
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className={`btn ${completedSteps.simulator ? "active" : ""}`}
              onClick={() => toggleStepDone("simulator")}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              {completedSteps.simulator ? "✓ Marked Complete" : "Mark Step Complete"}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Next Week Focal Commitments */}
      {activeStep === "commitments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 800, margin: 0, color: t.text }}>
                  🚀 Next Week Focal Commitments
                </h3>
                <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
                  Define the 3 non-negotiable execution commitments for the upcoming week.
                </div>
              </div>

              <button
                className={`btn ${completedSteps.commitments ? "active" : ""}`}
                onClick={() => toggleStepDone("commitments")}
                style={{ fontSize: 11, padding: "4px 10px" }}
              >
                {completedSteps.commitments ? "✓ Review Complete" : "Mark Review Complete"}
              </button>
            </div>

            {/* Commitments Inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>
                  ⚪️ Forward / Career Commitment (Priority 1)
                </label>
                <input
                  type="text"
                  value={weeklyNotes.topCommitment1}
                  onChange={(e) => setWeeklyNotes((p) => ({ ...p, topCommitment1: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>
                  🔴 Freedom / Venture Commitment (Priority 2)
                </label>
                <input
                  type="text"
                  value={weeklyNotes.topCommitment2}
                  onChange={(e) => setWeeklyNotes((p) => ({ ...p, topCommitment2: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>
                  🟢 Finance & Operations Commitment (Priority 3)
                </label>
                <input
                  type="text"
                  value={weeklyNotes.topCommitment3}
                  onChange={(e) => setWeeklyNotes((p) => ({ ...p, topCommitment3: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text }}
                />
              </div>

              {/* Wins & Learnings */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 6 }}>
                <div>
                  <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>
                    🏆 Major Win of the Week
                  </label>
                  <textarea
                    rows={2}
                    value={weeklyNotes.win}
                    onChange={(e) => setWeeklyNotes((p) => ({ ...p, win: e.target.value }))}
                    placeholder="Key milestone hit, interviews landed, or break-through..."
                    style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>
                    🚧 Blocker / Adjustment
                  </label>
                  <textarea
                    rows={2}
                    value={weeklyNotes.blocker}
                    onChange={(e) => setWeeklyNotes((p) => ({ ...p, blocker: e.target.value }))}
                    placeholder="What friction arose and what is the countermeasure?"
                    style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
