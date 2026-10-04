import React, { useState, useMemo } from "react";
import { fmt } from "../../utils/formatters.js";
import { PILLARS, getPillar } from "../../data/priorities.js";
import { ofDueLabel } from "../../utils/dates.js";
import { ScenarioSimulator } from "../cashflow/ScenarioSimulator.jsx";
import { SubscriptionLeakRadar } from "../cashflow/SubscriptionLeakRadar.jsx";
import { usePersistentState } from "../../hooks/usePersistentState.js";
import { getBridgeUrl } from "../../utils/config.js";

import { CADENCES, WEEKLY_STEPS, MONTHLY_STEPS, QUARTERLY_STEPS } from "../../data/reviewSteps.js";

export default function ReviewTab({
  ofTasks = [],
  ofProjects = [],
  fetchOFProjects,
  completeTask,
  toggleFlag,
  onCreateTask,
  priorities = [],
  setPriorities,
  pillars = PILLARS,
  setPillars,
  startBal,
  checkingBal,
  totalCashBal,
  runwayBasis = "checking",
  setRunwayBasis,
  debts = [],
  strategy = "avalanche",
  extraPayment = 500,
  debtMonthly = 0,
  payoffDate,
  forecasts,
  cashZeroDate,
  lmData = [],
  cfBudget = 6500,
  onNavigate,
  t,
}) {
  const [cadence, setCadence] = usePersistentState("review.activeCadence", "weekly");
  const [activeStep, setActiveStep] = useState("inbox");

  // Weekly review state
  const [weeklyNotes, setWeeklyNotes] = usePersistentState("review.weeklyNotes", {
    win: "",
    blocker: "",
    topCommitment1: "5 high-quality role applications per weekday",
    topCommitment2: "Drive newsletter subscriber growth for planner launch",
    topCommitment3: "Maintain runway discipline and weekly Lunch Money review",
  });
  const [weeklyCompleted, setWeeklyCompleted] = usePersistentState("review.completedSteps", {
    inbox: false,
    pillars: false,
    finance: false,
    simulator: false,
    commitments: false,
  });

  // Monthly review state
  const [monthlyNotes, setMonthlyNotes] = usePersistentState("review.monthlyNotes", {
    spendObservations: "",
    subscriptionsToCancel: "",
    nextMonthBudget: 6500,
    nextMonthFocus: "",
  });
  const [monthlyCompleted, setMonthlyCompleted] = usePersistentState("review.monthlyCompleted", {
    budget: false,
    recurring: false,
    debt_pace: false,
    priority_review: false,
    monthly_plan: false,
  });

  // Quarterly review state
  const [quarterlyNotes, setQuarterlyNotes] = usePersistentState("review.quarterlyNotes", {
    quarterTheme: "Sustainable Cash Flow & Career Inflection",
    pillarReflections: "",
    majorWins: "",
    lessonsLearned: "",
    nextQuarterNorthStar: "",
  });
  const [quarterlyCompleted, setQuarterlyCompleted] = usePersistentState("review.quarterlyCompleted", {
    pillar_audit: false,
    quarterly_retro: false,
    wealth_horizon: false,
    rebalance_pillars: false,
    new_okrs: false,
  });

  const [reviewHistory, setReviewHistory] = usePersistentState("review.history", []);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [taskInputs, setTaskInputs] = useState({});

  // AI Executive Digest state
  const [aiDigest, setAiDigest] = usePersistentState("review.aiDigest", null);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState(false);
  const [digestError, setDigestError] = useState(null);

  const generateWeeklyDigest = async () => {
    setIsGeneratingDigest(true);
    setDigestError(null);
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/digest/weekly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ofTasks,
          startBal,
          runwayBasis,
          cfBudget,
          debts,
          debtMonthly,
          priorities,
          weeklyNotes,
        }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to generate digest");
      setAiDigest(data);
    } catch (err) {
      console.error("Generate weekly digest failed:", err.message);
      setDigestError(err.message || "Failed to reach bridge or generate digest");
    } finally {
      setIsGeneratingDigest(false);
    }
  };

  const autoFillCommitments = () => {
    if (!aiDigest || !aiDigest.recommendedCommitments) return;
    const recs = aiDigest.recommendedCommitments;
    setWeeklyNotes((prev) => ({
      ...prev,
      topCommitment1: recs[0]?.commitment || prev.topCommitment1,
      topCommitment2: recs[1]?.commitment || prev.topCommitment2,
      topCommitment3: recs[2]?.commitment || prev.topCommitment3,
    }));
  };

  // Helper step configs
  const currentSteps = useMemo(() => {
    if (cadence === "monthly") return MONTHLY_STEPS;
    if (cadence === "quarterly") return QUARTERLY_STEPS;
    return WEEKLY_STEPS;
  }, [cadence]);

  const currentCompleted = useMemo(() => {
    if (cadence === "monthly") return monthlyCompleted;
    if (cadence === "quarterly") return quarterlyCompleted;
    return weeklyCompleted;
  }, [cadence, monthlyCompleted, quarterlyCompleted, weeklyCompleted]);

  const setCompletedForCadence = (stepId) => {
    if (cadence === "monthly") {
      setMonthlyCompleted((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
    } else if (cadence === "quarterly") {
      setQuarterlyCompleted((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
    } else {
      setWeeklyCompleted((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
    }
  };

  const handleCadenceChange = (newCadence) => {
    setCadence(newCadence);
    if (newCadence === "monthly") setActiveStep("budget");
    else if (newCadence === "quarterly") setActiveStep("pillar_audit");
    else setActiveStep("inbox");
  };

  // Tasks analysis
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

  // Helper to get linked tasks for a priority
  const getPriorityTasks = (p) => {
    if (!p.ofProject) return [];
    const projName = p.ofProject.toLowerCase().trim();
    return ofTasks.filter((t) => {
      const tp = (t.project || "").toLowerCase().trim();
      return tp === projName || tp.includes(projName) || projName.includes(tp);
    });
  };

  const handleArchiveAndReset = () => {
    const entry = {
      id: `rev-${cadence}-${Date.now()}`,
      cadence,
      date: new Date().toISOString().split("T")[0],
      completedAt: new Date().toISOString(),
      notes: cadence === "monthly" ? { ...monthlyNotes } : cadence === "quarterly" ? { ...quarterlyNotes } : { ...weeklyNotes },
      cashSnapshot: startBal,
      runwayBasis,
    };
    setReviewHistory((prev) => [entry, ...prev.slice(0, 50)]);

    if (cadence === "monthly") {
      setMonthlyCompleted({ budget: false, recurring: false, debt_pace: false, priority_review: false, monthly_plan: false });
      setMonthlyNotes((p) => ({ ...p, spendObservations: "", subscriptionsToCancel: "" }));
      setActiveStep("budget");
    } else if (cadence === "quarterly") {
      setQuarterlyCompleted({ pillar_audit: false, quarterly_retro: false, wealth_horizon: false, rebalance_pillars: false, new_okrs: false });
      setQuarterlyNotes((p) => ({ ...p, majorWins: "", lessonsLearned: "" }));
      setActiveStep("pillar_audit");
    } else {
      setWeeklyCompleted({ inbox: false, pillars: false, finance: false, simulator: false, commitments: false });
      setWeeklyNotes((p) => ({ ...p, win: "", blocker: "" }));
      setActiveStep("inbox");
    }
  };

  const completedCount = Object.values(currentCompleted).filter(Boolean).length;
  const isCadenceDone = completedCount === currentSteps.length;
  const activePillarsList = Object.values(pillars || PILLARS);

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
      {/* Header & Cadence Switcher */}
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
              Review & Planning Cockpit
            </h1>
          </div>
          <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
            Multi-cadence executive cockpit for Weekly sprints, Monthly operations, and Quarterly strategic vision.
          </div>
        </div>

        {/* Cadence Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", background: t.surface2, padding: 3, borderRadius: 8, border: `1px solid ${t.border2}` }}>
            {CADENCES.map((c) => {
              const isSelected = cadence === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleCadenceChange(c.id)}
                  style={{
                    background: isSelected ? t.surface : "transparent",
                    color: isSelected ? t.accent : t.textSub,
                    border: isSelected ? `1px solid ${t.border2}` : "1px solid transparent",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {reviewHistory.length > 0 && (
            <button
              className="btn"
              onClick={() => setShowHistoryModal(true)}
              style={{ fontSize: 11, padding: "5px 10px", color: t.textDim }}
            >
              📜 Archive ({reviewHistory.length})
            </button>
          )}

          <button
            className={`btn ${isCadenceDone ? "active" : ""}`}
            onClick={handleArchiveAndReset}
            style={{ fontSize: 11, padding: "5px 12px" }}
          >
            {isCadenceDone ? "✓ Archive & Reset" : "Reset Review"}
          </button>
        </div>
      </div>

      {/* Cadence Description & Progress Banner */}
      <div
        style={{
          background: isCadenceDone ? "rgba(16, 185, 129, 0.1)" : t.surface,
          border: `1px solid ${isCadenceDone ? "rgba(16, 185, 129, 0.3)" : t.border2}`,
          borderRadius: 10,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{isCadenceDone ? "🎉" : CADENCES.find((c) => c.id === cadence)?.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: isCadenceDone ? "#10B981" : t.text }}>
              {isCadenceDone
                ? `${CADENCES.find((c) => c.id === cadence)?.label} Complete!`
                : `${CADENCES.find((c) => c.id === cadence)?.label} (${CADENCES.find((c) => c.id === cadence)?.period})`}
            </div>
            <div style={{ fontSize: 11, color: t.textDim, marginTop: 1 }}>
              {cadence === "weekly" && "Sprint execution, inbox zero, Sunday runway pulse, and 3 top weekly commitments."}
              {cadence === "monthly" && "30-day budget actuals, recurring subscription audits, and monthly priority pacing."}
              {cadence === "quarterly" && "90-day pillar rebalancing, updating life pillars, and SMART OKR goal setting."}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>Step Progress:</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: isCadenceDone ? "#10B981" : t.text,
              background: isCadenceDone ? "#10B98118" : t.surface2,
              padding: "3px 10px",
              borderRadius: 12,
              border: `1px solid ${isCadenceDone ? "#10B98140" : t.border2}`,
            }}
          >
            {completedCount} / {currentSteps.length} Steps
          </span>
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${currentSteps.length}, 1fr)`,
          gap: 8,
          background: t.surface,
          padding: 6,
          borderRadius: 10,
          border: `1px solid ${t.border2}`,
        }}
      >
        {currentSteps.map((step) => {
          const isSelected = activeStep === step.id;
          const isDone = currentCompleted[step.id];

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

      {/* ─────────────────── CADENCE 1: WEEKLY REVIEW & PLAN ─────────────────── */}
      {cadence === "weekly" && (
        <>
          {/* Step 1: Task Velocity & Inbox */}
          {activeStep === "inbox" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>📥 Inbox Triage & Sprint Velocity</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Triage incoming OmniFocus tasks and achieve Inbox Zero.</div>
                </div>
                <button className={`btn ${weeklyCompleted.inbox ? "active" : ""}`} onClick={() => setCompletedForCadence("inbox")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {weeklyCompleted.inbox ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Inbox Items Pending</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: inboxTasks.length === 0 ? "#10B981" : t.warning }}>
                    {inboxTasks.length === 0 ? "0 (Inbox Zero! 🎉)" : inboxTasks.length}
                  </div>
                </div>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Flagged Priority</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: t.danger }}>{flaggedTasks.length}</div>
                </div>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Total Open Actions</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: t.text }}>{ofTasks.length}</div>
                </div>
              </div>

              {inboxTasks.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {inboxTasks.map((task) => (
                    <div key={task.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={() => completeTask?.(task.id)} style={{ width: 18, height: 18, borderRadius: "50%", border: `1.5px solid ${t.border3}`, background: "transparent", cursor: "pointer", color: t.accent }}>✓</button>
                        <span style={{ fontSize: 13, color: t.text }}>{task.name}</span>
                      </div>
                      <a href={`omnifocus:///task/${task.id}`} style={{ fontSize: 11, color: t.textDim, textDecoration: "none" }}>Process in OF ↗</a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#10B981", fontSize: 13, fontWeight: 600, padding: "8px 0" }}>✨ Great work! Your OmniFocus inbox is completely clear.</div>
              )}

              {/* Stale Projects & Milestone Pacing Audit */}
              {ofProjects && ofProjects.length > 0 && (
                <div style={{ borderTop: `1px solid ${t.border2}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: t.textSub, textTransform: "uppercase", letterSpacing: ".08em" }}>
                        Active Projects Pacing & Stale Alert Audit
                      </div>
                      <div style={{ fontSize: 10, color: t.textDim }}>
                        Flagging projects with no modifications in &ge;14 days and open tasks pending.
                      </div>
                    </div>
                    {fetchOFProjects && (
                      <button
                        onClick={() => fetchOFProjects()}
                        className="btn"
                        style={{ fontSize: 10, padding: "3px 8px" }}
                      >
                        ↻ Refresh OF Projects
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                    {ofProjects.map((p) => (
                      <div
                        key={p.id || p.name}
                        style={{
                          background: p.isStale ? t.dangerBg + "44" : t.surface2,
                          border: `1px solid ${p.isStale ? t.dangerBd : t.border}`,
                          borderRadius: 8,
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 9, color: t.textDim, marginTop: 2 }}>
                              {p.completedTasks}/{p.totalTasks} tasks ({p.completionRate}%)
                            </div>
                          </div>
                          {p.isStale && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#f59e0b",
                                background: "#f59e0b22",
                                border: "1px solid #f59e0b44",
                                padding: "2px 5px",
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            >
                              ⚠️ Stale ({p.daysSinceActivity}d)
                            </span>
                          )}
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: "100%", height: 4, background: t.border, borderRadius: 2, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${p.completionRate}%`,
                              height: "100%",
                              background: p.isStale ? "#f59e0b" : "#10B981",
                              borderRadius: 2,
                            }}
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9, color: t.textDim }}>
                          <span>{p.remainingTasks} remaining</span>
                          {p.dueDate ? (
                            <span style={{ color: t.accent, fontWeight: 600 }}>
                              Target: {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          ) : (
                            <span>{p.daysSinceActivity !== null ? `${p.daysSinceActivity}d ago` : "recent"}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: 5-Pillar Ventures & Open Tasks */}
          {activeStep === "pillars" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>🎯 5-Pillar Ventures & Open Execution Tasks</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Review current priority milestones and the open execution tasks driving them.</div>
                </div>
                <button className={`btn ${weeklyCompleted.pillars ? "active" : ""}`} onClick={() => setCompletedForCadence("pillars")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {weeklyCompleted.pillars ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                {activePriorities.map((p) => {
                  const pillar = getPillar(pillars, p.pillar);
                  const linked = getPriorityTasks(p);
                  const taskInput = taskInputs[p.id] || "";

                  return (
                    <div key={p.id} style={{ background: t.surface2, border: `1px solid ${t.border2}`, borderLeft: `3px solid ${pillar.color}`, borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: pillar.color, textTransform: "uppercase" }}>{pillar.icon} {pillar.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.text }}>{p.currentValue} / {p.targetValue} {p.unit}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{p.title}</div>

                      {/* Open Tasks List */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, background: t.surface, padding: 8, borderRadius: 6, border: `1px solid ${t.border3}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: t.textDim, textTransform: "uppercase" }}>
                          Open Action Tasks ({linked.length})
                        </div>
                        {linked.slice(0, 3).map((task) => (
                          <div key={task.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: t.text, padding: "3px 0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                              <button type="button" onClick={() => completeTask?.(task.id)} style={{ width: 14, height: 14, borderRadius: "50%", border: `1px solid ${t.border3}`, background: "none", cursor: "pointer", color: t.accent, padding: 0, fontSize: 8 }}>✓</button>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.name}</span>
                            </div>
                            {task.dueDate && <span style={{ fontSize: 9, color: t.textDim, flexShrink: 0 }}>📅 {task.dueDate}</span>}
                          </div>
                        ))}
                        {linked.length === 0 && (
                          <div style={{ fontSize: 10, color: t.textDim, fontStyle: "italic" }}>No open tasks in project.</div>
                        )}

                        {/* Inline quick-add task under priority */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!taskInput.trim()) return;
                            onCreateTask?.({ name: taskInput.trim(), project: p.ofProject || `🎯 ${p.title}` });
                            setTaskInputs((prev) => ({ ...prev, [p.id]: "" }));
                          }}
                          style={{ display: "flex", gap: 4, marginTop: 4 }}
                        >
                          <input
                            type="text"
                            placeholder="+ Add task…"
                            value={taskInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTaskInputs((prev) => ({ ...prev, [p.id]: val }));
                            }}
                            style={{ flex: 1, padding: "3px 6px", fontSize: 10, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 4, color: t.text }}
                          />
                          <button type="submit" disabled={!taskInput.trim()} className="btn active" style={{ fontSize: 9, padding: "2px 6px" }}>Add</button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Sunday Runway Pulse */}
          {activeStep === "finance" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>💰 Sunday Runway & Cash Verification</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Audit liquid reserves, checking balance vs total income available, and projected burn.</div>
                </div>
                <button className={`btn ${weeklyCompleted.finance ? "active" : ""}`} onClick={() => setCompletedForCadence("finance")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {weeklyCompleted.finance ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              {/* Basis selector banner in review */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: t.surface2, padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border2}`, flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>
                  Runway Calculation Basis: <span style={{ color: t.accent }}>{runwayBasis === "total" ? "Total Liquid Available" : "Checking Account Only"}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={`btn ${runwayBasis === "checking" ? "active" : ""}`}
                    onClick={() => setRunwayBasis?.("checking")}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    Checking: {fmt(checkingBal ?? startBal)}
                  </button>
                  <button
                    type="button"
                    className={`btn ${runwayBasis === "total" ? "active" : ""}`}
                    onClick={() => setRunwayBasis?.("total")}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    Total Available: {fmt(totalCashBal ?? (startBal * 2.5))}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Active Cash Pool</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981", marginTop: 2 }}>{fmt(startBal)}</div>
                </div>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>End of Month Forecast</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: (forecasts?.eom || 0) >= 0 ? t.text : t.danger, marginTop: 2 }}>{fmt(forecasts?.eom || 0)}</div>
                </div>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Zero-Balance Horizon</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: cashZeroDate ? t.warning : "#10B981", marginTop: 4 }}>
                    {cashZeroDate ? `Zero on ${cashZeroDate}` : "Runway Safe (>60d)"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Simulator */}
          {activeStep === "simulator" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ScenarioSimulator startBal={startBal} debts={debts} strategy={strategy} extraPayment={extraPayment} debtMonthly={debtMonthly} t={t} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className={`btn ${weeklyCompleted.simulator ? "active" : ""}`} onClick={() => setCompletedForCadence("simulator")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {weeklyCompleted.simulator ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Weekly Commitments Plan */}
          {activeStep === "commitments" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>🚀 Next Week Focal Commitments</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Define the 3 non-negotiable execution commitments for the upcoming week.</div>
                </div>
                <button className={`btn ${weeklyCompleted.commitments ? "active" : ""}`} onClick={() => setCompletedForCadence("commitments")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {weeklyCompleted.commitments ? "✓ Review Complete" : "Mark Review Complete"}
                </button>
              </div>

              {/* AI Executive Weekly Digest */}
              <div
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: t.text }}>
                      AI Executive Weekly Digest
                    </span>
                  </div>
                  <button
                    className="btn"
                    disabled={isGeneratingDigest}
                    onClick={generateWeeklyDigest}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {isGeneratingDigest ? "Generating Digest…" : "✨ Generate AI Digest"}
                  </button>
                </div>

                {digestError && (
                  <div style={{ fontSize: 11, color: t.danger, padding: "4px 0" }}>
                    ⚠️ {digestError}
                  </div>
                )}

                {aiDigest && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 700 }}>
                        Executive Synthesis ({aiDigest.source || "bridge"})
                      </div>
                      {(aiDigest.executiveSummary || []).map((bullet, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: t.textSub, lineHeight: 1.4 }}>
                          • {bullet}
                        </div>
                      ))}
                    </div>

                    {aiDigest.burnAudit && (
                      <div style={{ fontSize: 11, color: t.accentSub, background: t.surface, padding: "8px 10px", borderRadius: 6, border: `1px solid ${t.border2}` }}>
                        <strong>Burn & Runway Health:</strong> {aiDigest.burnAudit}
                      </div>
                    )}

                    {aiDigest.recommendedCommitments && aiDigest.recommendedCommitments.length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px dashed ${t.border}`, paddingTop: 8 }}>
                        <div style={{ fontSize: 11, color: t.textDim }}>
                          Recommended commitments generated from strategic context.
                        </div>
                        <button
                          onClick={autoFillCommitments}
                          className="btn"
                          style={{ fontSize: 10, padding: "3px 8px", background: t.accent + "22", borderColor: t.accent, color: t.accent }}
                        >
                          Auto-fill 3 Commitments Below ↵
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>⚪️ Forward / Career Commitment (Priority 1)</label>
                  <input type="text" value={weeklyNotes.topCommitment1} onChange={(e) => setWeeklyNotes((p) => ({ ...p, topCommitment1: e.target.value }))} style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>🔴 Freedom / Venture Commitment (Priority 2)</label>
                  <input type="text" value={weeklyNotes.topCommitment2} onChange={(e) => setWeeklyNotes((p) => ({ ...p, topCommitment2: e.target.value }))} style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>🟢 Finance & Operations Commitment (Priority 3)</label>
                  <input type="text" value={weeklyNotes.topCommitment3} onChange={(e) => setWeeklyNotes((p) => ({ ...p, topCommitment3: e.target.value }))} style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                  <div>
                    <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>🏆 Major Win of the Week</label>
                    <textarea rows={2} value={weeklyNotes.win} onChange={(e) => setWeeklyNotes((p) => ({ ...p, win: e.target.value }))} style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>🚧 Blocker / Adjustment</label>
                    <textarea rows={2} value={weeklyNotes.blocker} onChange={(e) => setWeeklyNotes((p) => ({ ...p, blocker: e.target.value }))} style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─────────────────── CADENCE 2: MONTHLY REVIEW & PLAN ─────────────────── */}
      {cadence === "monthly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activeStep === "budget" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>📊 Monthly Budget vs Actuals Reconcile</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Audit total month spending against the target monthly cap (${fmt(cfBudget)}).</div>
                </div>
                <button className={`btn ${monthlyCompleted.budget ? "active" : ""}`} onClick={() => setCompletedForCadence("budget")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {monthlyCompleted.budget ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Monthly Budget Limit</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: t.text, marginTop: 2 }}>{fmt(cfBudget)}</div>
                </div>
                <div style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}` }}>
                  <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>End of Month Cash</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: (forecasts?.eom || 0) >= 0 ? "#10B981" : t.danger, marginTop: 2 }}>{fmt(forecasts?.eom || 0)}</div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>Monthly Spend Observations & Anomalies</label>
                <textarea
                  rows={3}
                  value={monthlyNotes.spendObservations}
                  onChange={(e) => setMonthlyNotes((p) => ({ ...p, spendObservations: e.target.value }))}
                  placeholder="Where did money leak? Were there unexpected expenses or travel charges?"
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }}
                />
              </div>
            </div>
          )}

          {activeStep === "recurring" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>🔄 Recurring Subscriptions Audit</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Review recurring SaaS, tools, and subscriptions to eliminate unnecessary burn.</div>
                </div>
                <button className={`btn ${monthlyCompleted.recurring ? "active" : ""}`} onClick={() => setCompletedForCadence("recurring")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {monthlyCompleted.recurring ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              <SubscriptionLeakRadar
                lmData={lmData}
                onFlagForCancel={(payee, amt) => {
                  setMonthlyNotes((p) => {
                    const current = p.subscriptionsToCancel || "";
                    const addition = `• ${payee} ($${amt})`;
                    if (current.includes(payee)) return p;
                    return {
                      ...p,
                      subscriptionsToCancel: current ? `${current}\n${addition}` : addition,
                    };
                  });
                }}
                t={t}
              />

              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>Subscriptions to Cancel or Downgrade</label>
                <textarea
                  rows={3}
                  value={monthlyNotes.subscriptionsToCancel}
                  onChange={(e) => setMonthlyNotes((p) => ({ ...p, subscriptionsToCancel: e.target.value }))}
                  placeholder="List subscriptions identified for cancellation this month…"
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }}
                />
              </div>
            </div>
          )}

          {activeStep === "debt_pace" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>💳 Debt Elimination Velocity & Avalanche Milestone</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Review debt freedom date ({payoffDate ? payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}) and minimum payments.</div>
                </div>
                <button className={`btn ${monthlyCompleted.debt_pace ? "active" : ""}`} onClick={() => setCompletedForCadence("debt_pace")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {monthlyCompleted.debt_pace ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>
              <div style={{ fontSize: 13, color: t.textSub }}>Current monthly debt allocation: <strong>{fmt(debtMonthly)}/mo</strong> with <strong>{strategy}</strong> strategy.</div>
            </div>
          )}

          {activeStep === "priority_review" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>🎯 Monthly Milestone Pacing</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Check monthly progress across active priority metrics and adjust targets.</div>
                </div>
                <button className={`btn ${monthlyCompleted.priority_review ? "active" : ""}`} onClick={() => setCompletedForCadence("priority_review")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {monthlyCompleted.priority_review ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {activePriorities.map((p) => {
                  const pil = getPillar(pillars, p.pillar);
                  return (
                    <div key={p.id} style={{ background: t.surface2, padding: 12, borderRadius: 8, border: `1px solid ${t.border2}`, borderLeft: `3px solid ${pil.color}` }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>Current: {p.currentValue} / {p.targetValue} {p.unit}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeStep === "monthly_plan" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>📝 Next Month Operational Focus</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Lock in your 30-day budget target and focal theme.</div>
                </div>
                <button className={`btn ${monthlyCompleted.monthly_plan ? "active" : ""}`} onClick={() => setCompletedForCadence("monthly_plan")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {monthlyCompleted.monthly_plan ? "✓ Review Complete" : "Mark Review Complete"}
                </button>
              </div>
              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>Primary 30-Day Focus Statement</label>
                <textarea
                  rows={3}
                  value={monthlyNotes.nextMonthFocus}
                  onChange={(e) => setMonthlyNotes((p) => ({ ...p, nextMonthFocus: e.target.value }))}
                  placeholder="e.g. Complete 50 role applications, finalize planner production, preserve checking runway above $5k..."
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────── CADENCE 3: QUARTERLY REVIEW & PLAN ─────────────────── */}
      {cadence === "quarterly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activeStep === "pillar_audit" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>🏛️ 90-Day Life Pillar Balance Audit</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Evaluate balance across your life domains. Did any pillar get neglected?</div>
                </div>
                <button className={`btn ${quarterlyCompleted.pillar_audit ? "active" : ""}`} onClick={() => setCompletedForCadence("pillar_audit")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {quarterlyCompleted.pillar_audit ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {activePillarsList.map((p) => (
                  <div key={p.id} style={{ background: t.surface2, border: `1px solid ${t.border2}`, borderTop: `3px solid ${p.color}`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: p.color }}>{p.icon} {p.name}</div>
                    <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>{p.description}</div>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>Pillar Health Reflections</label>
                <textarea
                  rows={3}
                  value={quarterlyNotes.pillarReflections}
                  onChange={(e) => setQuarterlyNotes((p) => ({ ...p, pillarReflections: e.target.value }))}
                  placeholder="Which pillars flourished? Which ones fell behind and need dedicated focus this quarter?"
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }}
                />
              </div>
            </div>
          )}

          {activeStep === "quarterly_retro" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>🏆 Quarterly Priorities Retro & Closeout</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Close out completed priorities, evaluate stalled goals, and capture strategic lessons.</div>
                </div>
                <button className={`btn ${quarterlyCompleted.quarterly_retro ? "active" : ""}`} onClick={() => setCompletedForCadence("quarterly_retro")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {quarterlyCompleted.quarterly_retro ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>Major Quarterly Wins & Milestones Hit</label>
                  <textarea rows={3} value={quarterlyNotes.majorWins} onChange={(e) => setQuarterlyNotes((p) => ({ ...p, majorWins: e.target.value }))} style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>Strategic Lessons Learned</label>
                  <textarea rows={3} value={quarterlyNotes.lessonsLearned} onChange={(e) => setQuarterlyNotes((p) => ({ ...p, lessonsLearned: e.target.value }))} style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, resize: "vertical" }} />
                </div>
              </div>
            </div>
          )}

          {activeStep === "wealth_horizon" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>📈 90-Day Wealth & Runway Horizon</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Analyze total runway extension and cumulative debt reduction trajectory.</div>
                </div>
                <button className={`btn ${quarterlyCompleted.wealth_horizon ? "active" : ""}`} onClick={() => setCompletedForCadence("wealth_horizon")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {quarterlyCompleted.wealth_horizon ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>
              <div style={{ fontSize: 13, color: t.textSub }}>Current runway is informed by <strong>{runwayBasis === "total" ? "Total Available Liquid Cash" : "Checking Operating Cash"}</strong> ({fmt(startBal)}).</div>
            </div>
          )}

          {activeStep === "rebalance_pillars" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>⚖️ Update & Rebalance Life Pillars</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Refine your life pillar names, vision statements, icons, and colors for the new quarter.</div>
                </div>
                <button className={`btn ${quarterlyCompleted.rebalance_pillars ? "active" : ""}`} onClick={() => setCompletedForCadence("rebalance_pillars")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {quarterlyCompleted.rebalance_pillars ? "✓ Marked Complete" : "Mark Step Complete"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button className="btn active" onClick={() => onNavigate?.("priorities")} style={{ fontSize: 12, padding: "6px 14px" }}>
                  🏛️ Open Pillars Hub to Update Pillars & Priorities →
                </button>
              </div>
            </div>
          )}

          {activeStep === "new_okrs" && (
            <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>🎯 Next Quarter Priorities & North Star Theme</h3>
                  <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>Establish your guiding theme and set the 3-5 SMART priorities for the next 90 days.</div>
                </div>
                <button className={`btn ${quarterlyCompleted.new_okrs ? "active" : ""}`} onClick={() => setCompletedForCadence("new_okrs")} style={{ fontSize: 11, padding: "4px 10px" }}>
                  {quarterlyCompleted.new_okrs ? "✓ Review Complete" : "Mark Review Complete"}
                </button>
              </div>

              <div>
                <label style={{ fontSize: 11, color: t.textDim, fontWeight: 600, textTransform: "uppercase" }}>90-Day North Star Theme</label>
                <input
                  type="text"
                  value={quarterlyNotes.nextQuarterNorthStar}
                  onChange={(e) => setQuarterlyNotes((p) => ({ ...p, nextQuarterNorthStar: e.target.value }))}
                  placeholder="e.g. Q4 Execution Surge: Permanent PM Role Signed & 300 Planners Shipped"
                  style={{ width: "100%", padding: "8px 12px", marginTop: 4, background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 6, color: t.text, fontSize: 14 }}
                />
              </div>
            </div>
          )}
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>
                📜 Archived Reviews ({reviewHistory.length})
              </h3>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: "none", border: "none", fontSize: 20, color: t.textDim, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reviewHistory.map((h) => (
                <div key={h.id} style={{ background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: t.accent }}>
                    <span>{h.cadence ? h.cadence.toUpperCase() : "WEEKLY"} REVIEW</span>
                    <span style={{ color: t.textDim, fontWeight: 400 }}>{h.date}</span>
                  </div>
                  {h.notes?.win && <div style={{ fontSize: 11, color: t.text, marginTop: 4 }}><strong>Win:</strong> {h.notes.win}</div>}
                  {h.notes?.topCommitment1 && <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}><strong>Priority 1:</strong> {h.notes.topCommitment1}</div>}
                  {h.notes?.nextQuarterNorthStar && <div style={{ fontSize: 11, color: t.text, marginTop: 2 }}><strong>North Star:</strong> {h.notes.nextQuarterNorthStar}</div>}
                </div>
              ))}
              {reviewHistory.length === 0 && <div style={{ textAlign: "center", color: t.textDim, padding: 16 }}>No archived reviews yet.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
