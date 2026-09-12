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

  const [lastReviewDate, setLastReviewDate] = usePersistentState("review.lastReviewDate", null);
  const [reviewHistory, setReviewHistory] = usePersistentState("review.history", []);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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
    setCompletedSteps((prev) => {
      const next = { ...prev, [stepId]: !prev[stepId] };
      // if this makes all steps true, record review date
      if (Object.values(next).every(Boolean) && !lastReviewDate) {
        setLastReviewDate(new Date().toISOString().split("T")[0]);
      }
      return next;
    });
  };

  const handleStartNewReview = (confirmFirst = false) => {
    if (
      confirmFirst &&
      !window.confirm("Start a new review session? This will archive your current notes and reset the 5-step checklist.")
    ) {
      return;
    }

    // Archive current session
    const completedCount = Object.values(completedSteps).filter(Boolean).length;
    if (completedCount > 0 || weeklyNotes.win || weeklyNotes.blocker) {
      const entry = {
        id: "rev-" + Date.now(),
        date: lastReviewDate || new Date().toISOString().split("T")[0],
        completedAt: new Date().toISOString(),
        weeklyNotes: { ...weeklyNotes },
        prioritiesSnapshot: priorities.map((p) => ({
          id: p.id,
          title: p.title,
          pillar: p.pillar,
          currentValue: p.currentValue,
          targetValue: p.targetValue,
          unit: p.unit,
        })),
        cashSnapshot: startBal,
      };
      setReviewHistory((prev) => [entry, ...prev.slice(0, 51)]);
    }

    // Reset checklist
    setCompletedSteps({
      inbox: false,
      pillars: false,
      finance: false,
      simulator: false,
      commitments: false,
    });

    // Reset weekly win & blocker (keep commitments as starting base)
    setWeeklyNotes((prev) => ({
      ...prev,
      win: "",
      blocker: "",
    }));

    setLastReviewDate(new Date().toISOString().split("T")[0]);
    setActiveStep("inbox");
  };

  const deleteHistoryEntry = (id) => {
    setReviewHistory((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAllHistory = () => {
    if (window.confirm("Clear all archived weekly reviews?")) {
      setReviewHistory([]);
      setShowHistoryModal(false);
    }
  };

  const handleUpdatePriority = (updated) => {
    setPriorities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const isAllDone = completedCount === REVIEW_STEPS.length;

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

        {/* Step Progress & Reset Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {reviewHistory.length > 0 && (
            <button
              className="btn"
              onClick={() => setShowHistoryModal(true)}
              style={{ fontSize: 11, padding: "4px 8px", color: t.textDim }}
            >
              📜 Past Reviews ({reviewHistory.length})
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>Progress:</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: isAllDone ? "#10B981" : t.text,
                background: isAllDone ? "#10B98118" : t.surface2,
                padding: "3px 8px",
                borderRadius: 12,
                border: `1px solid ${isAllDone ? "#10B98140" : t.border2}`,
              }}
            >
              {completedCount} / {REVIEW_STEPS.length} Completed
            </span>
          </div>

          <button
            className={`btn ${isAllDone ? "active" : ""}`}
            onClick={() => handleStartNewReview(completedCount > 0 && !isAllDone)}
            title="Archive current review and reset checklist for a new week"
            style={{
              fontSize: 11,
              padding: "5px 12px",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>🔄</span>
            <span>{isAllDone ? "Start New Review" : "Reset Review"}</span>
          </button>
        </div>
      </div>

      {/* Completed Celebration & Next Week Reset Banner */}
      {isAllDone && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: 10,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🎉</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#10B981" }}>
                Weekly Review Complete!
              </div>
              <div style={{ fontSize: 11, color: t.textSub, marginTop: 2 }}>
                All 5 steps finished. When you're ready for your next review session, click to archive notes and start fresh.
              </div>
            </div>
          </div>

          <button
            className="btn active"
            onClick={() => handleStartNewReview(false)}
            style={{ fontSize: 12, padding: "6px 14px" }}
          >
            🔄 Archive & Start Fresh Review
          </button>
        </div>
      )}

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

      {/* Review History Modal */}
      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20,
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 14,
              width: "100%",
              maxWidth: 600,
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                  📜 Past Weekly Reviews ({reviewHistory.length})
                </h3>
                {reviewHistory.length > 0 && (
                  <button
                    className="btn"
                    onClick={clearAllHistory}
                    style={{ fontSize: 10, padding: "2px 8px", color: t.danger }}
                    title="Clear all archived history"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, color: t.textDim, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {reviewHistory.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    background: t.surface2,
                    border: `1px solid ${t.border2}`,
                    borderRadius: 10,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>Week of {rev.date}</span>
                      <span style={{ fontSize: 10, color: t.textDim }}>
                        Completed {new Date(rev.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteHistoryEntry(rev.id)}
                      title="Delete this review entry"
                      style={{
                        background: "none",
                        border: "none",
                        color: t.textDim,
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "2px 6px",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.color = t.danger)}
                      onMouseOut={(e) => (e.currentTarget.style.color = t.textDim)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Win & Blocker */}
                  {(rev.weeklyNotes?.win || rev.weeklyNotes?.blocker) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {rev.weeklyNotes?.win && (
                        <div style={{ background: t.surface, padding: 10, borderRadius: 6, border: `1px solid ${t.border3}`, fontSize: 11 }}>
                          <div style={{ fontWeight: 700, color: "#10B981", marginBottom: 2 }}>🏆 Major Win</div>
                          <div style={{ color: t.text }}>{rev.weeklyNotes.win}</div>
                        </div>
                      )}
                      {rev.weeklyNotes?.blocker && (
                        <div style={{ background: t.surface, padding: 10, borderRadius: 6, border: `1px solid ${t.border3}`, fontSize: 11 }}>
                          <div style={{ fontWeight: 700, color: t.warning, marginBottom: 2 }}>🚧 Blocker / Solution</div>
                          <div style={{ color: t.textSub }}>{rev.weeklyNotes.blocker}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Weekly Commitments */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, background: t.surface, padding: 10, borderRadius: 6, border: `1px solid ${t.border3}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em" }}>
                      Weekly Commitments
                    </div>
                    {rev.weeklyNotes?.topCommitment1 && (
                      <div style={{ fontSize: 11, color: t.text }}>
                        <span style={{ color: "#94A3B8", fontWeight: 700 }}>⚪️ Forward: </span>
                        {rev.weeklyNotes.topCommitment1}
                      </div>
                    )}
                    {rev.weeklyNotes?.topCommitment2 && (
                      <div style={{ fontSize: 11, color: t.text }}>
                        <span style={{ color: "#EF4444", fontWeight: 700 }}>🔴 Freedom: </span>
                        {rev.weeklyNotes.topCommitment2}
                      </div>
                    )}
                    {rev.weeklyNotes?.topCommitment3 && (
                      <div style={{ fontSize: 11, color: t.text }}>
                        <span style={{ color: "#22C55E", fontWeight: 700 }}>🟢 Finance: </span>
                        {rev.weeklyNotes.topCommitment3}
                      </div>
                    )}
                  </div>

                  {/* Priority Metrics Snapshot */}
                  {Array.isArray(rev.prioritiesSnapshot) && rev.prioritiesSnapshot.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: t.textDim, textTransform: "uppercase", marginBottom: 4 }}>
                        Metrics at Review Time
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {rev.prioritiesSnapshot.map((ps) => (
                          <div
                            key={ps.id}
                            style={{
                              fontSize: 10,
                              background: t.surface,
                              border: `1px solid ${t.border3}`,
                              borderRadius: 4,
                              padding: "3px 8px",
                              color: t.text,
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{ps.title}: </span>
                            <span style={{ color: t.accent }}>{ps.currentValue} / {ps.targetValue} {ps.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {reviewHistory.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: t.textDim, fontSize: 12 }}>
                  No archived reviews yet. Complete your 5 steps and click Start New Review to archive.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
