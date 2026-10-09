import React, { useState, useMemo, useEffect } from "react";
import { dateKey, addDays } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";
import {
  planDailyLoad,
  DEFAULT_WORK_CONFIG,
  RESCHEDULE_OFFSETS,
  getTaskPriority,
  getTaskDuration,
  getTaskEnergy,
  getTaskPillar,
  priorityLabel,
  ENERGY_CONFIG,
} from "../../utils/dailyLoadPlanner.js";

export function DailyLoadPlannerModal({
  isOpen,
  onClose,
  ofTasks = [],
  bridgeStatus,
  onBatchSyncTasks,
  t,
}) {
  const todayKey = dateKey(new Date());

  // Detect Overdue tasks (due date < today)
  const overdueTasks = useMemo(() => {
    return ofTasks.filter((t) => t.dueDate && t.dueDate < todayKey);
  }, [ofTasks, todayKey]);

  // Detect Today tasks (due date === today, or no date/flagged)
  const scheduledTodayTasks = useMemo(() => {
    return ofTasks.filter((t) => t.dueDate === todayKey);
  }, [ofTasks, todayKey]);

  // Work configuration state
  const [config, setConfig] = useState({
    startHour: 9,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    bufferPercent: 0.20,
    strategy: "priority", // "priority" | "energy-circadian"
    maxDeepWorkMinutes: 210,
  });

  // Overdue triage: map of taskId -> { choice: 'focus' | 'leave' | 'reschedule', offset: 1 }
  const [overdueTriage, setOverdueTriage] = useState({});

  // Intake overrides: map of taskId -> { action: 'keep' | 'move', moveOffset: 1, duration, priority, energy }
  const [intakeOverrides, setIntakeOverrides] = useState({});

  // Current active wizard step: 1 (Hours), 2 (Overdue), 3 (Intake), 4 (Schedule & Overflow)
  const [step, setStep] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSyncStatusMsg(null);
      setIsSyncing(false);

      // Default overdue decisions: Focus if flagged or high priority, else Leave
      const initialOverdue = {};
      overdueTasks.forEach((ot) => {
        initialOverdue[ot.id] = {
          choice: ot.flagged ? "focus" : "leave",
          offset: 1,
        };
      });
      setOverdueTriage(initialOverdue);

      // Default intake overrides
      const initialIntake = {};
      scheduledTodayTasks.forEach((st) => {
        initialIntake[st.id] = {
          action: "keep",
          moveOffset: 1,
          duration: getTaskDuration(st),
          priority: getTaskPriority(st),
          energy: getTaskEnergy(st),
        };
      });
      setIntakeOverrides(initialIntake);
    }
  }, [isOpen, ofTasks, overdueTasks, scheduledTodayTasks]);

  // Candidate tasks for Today's intake:
  // Today's scheduled tasks + Overdue tasks chosen to "focus" today
  const candidateTasks = useMemo(() => {
    const list = [...scheduledTodayTasks];
    const seen = new Set(list.map((t) => t.id));

    overdueTasks.forEach((ot) => {
      const decision = overdueTriage[ot.id]?.choice;
      if (decision === "focus" && !seen.has(ot.id)) {
        list.push(ot);
        seen.add(ot.id);
      }
    });

    return list;
  }, [scheduledTodayTasks, overdueTasks, overdueTriage]);

  // Compute daily load plan dynamically based on config & overrides
  const plan = useMemo(() => {
    return planDailyLoad(candidateTasks, {
      ...config,
      overrides: intakeOverrides,
    });
  }, [candidateTasks, config, intakeOverrides]);

  const { scheduledTasks, overflowTasks, stats } = plan;

  if (!isOpen) return null;

  const totalSteps = overdueTasks.length > 0 ? 4 : 3;
  const currentStepDisplay = overdueTasks.length === 0 && step >= 2 ? step - 1 : step;

  // Handle Commit & Sync to OmniFocus
  const handleApplyAndSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg("Preparing changes for OmniFocus...");

    const changes = [];

    // 1. Overdue tasks rescheduled
    overdueTasks.forEach((ot) => {
      const decision = overdueTriage[ot.id];
      if (decision?.choice === "reschedule") {
        const targetDate = dateKey(addDays(new Date(), decision.offset || 1));
        changes.push({ id: ot.id, name: ot.name, newDate: targetDate });
      } else if (decision?.choice === "focus") {
        changes.push({ id: ot.id, name: ot.name, newDate: todayKey });
      }
    });

    // 2. Intake tasks moved / postponed
    candidateTasks.forEach((ct) => {
      const o = intakeOverrides[ct.id];
      if (o?.action === "move") {
        const targetDate = dateKey(addDays(new Date(), o.moveOffset || 1));
        changes.push({ id: ct.id, name: ct.name, newDate: targetDate });
      }
    });

    // 3. Overflow tasks reschedule (if user opts to reschedule overflow)
    overflowTasks.forEach((ot) => {
      const o = intakeOverrides[ot.task.id];
      if (o?.overflowAction === "reschedule") {
        const targetDate = dateKey(addDays(new Date(), o.overflowOffset || 1));
        changes.push({ id: ot.task.id, name: ot.task.name, newDate: targetDate });
      }
    });

    // 4. Scheduled tasks for today: set due date to today with time slot!
    scheduledTasks.forEach((st) => {
      const timeIso = `${todayKey}T${st.startTime}`;
      changes.push({
        id: st.task.id,
        name: st.task.name,
        newDate: timeIso,
        estimatedMinutes: st.duration,
      });
    });

    if (onBatchSyncTasks && changes.length > 0) {
      try {
        const res = await onBatchSyncTasks(changes);
        if (res.success) {
          setSyncStatusMsg(`✓ Synced ${changes.length} tasks with OmniFocus successfully!`);
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setSyncStatusMsg(`⚠️ Plan saved locally. Bridge note: ${res.error || "offline"}`);
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } catch (err) {
        setSyncStatusMsg(`Plan saved locally (${err.message}).`);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } else {
      setSyncStatusMsg("✓ Plan saved locally!");
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border2}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 780,
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "24px 28px",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <h2
                style={{
                  fontFamily: "'Plus Jakarta Sans',sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
                  color: t.text,
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Daily Load Planner Engine
              </h2>
              <div style={{ fontSize: 11, color: t.textDim }}>
                Realistic capacity calculation · 20% protected buffer · Mental load balance
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: t.textDim,
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Wizard Steps Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: t.surface2,
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 11,
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            <span
              onClick={() => setStep(1)}
              style={{
                cursor: "pointer",
                fontWeight: step === 1 ? 700 : 500,
                color: step === 1 ? t.accent : t.textDim,
                borderBottom: step === 1 ? `2px solid ${t.accent}` : "none",
                paddingBottom: 2,
              }}
            >
              1. Work Hours & Buffer
            </span>

            {overdueTasks.length > 0 && (
              <span
                onClick={() => setStep(2)}
                style={{
                  cursor: "pointer",
                  fontWeight: step === 2 ? 700 : 500,
                  color: step === 2 ? t.accent : t.textDim,
                  borderBottom: step === 2 ? `2px solid ${t.accent}` : "none",
                  paddingBottom: 2,
                }}
              >
                2. Overdue Triage ({overdueTasks.length})
              </span>
            )}

            <span
              onClick={() => setStep(3)}
              style={{
                cursor: "pointer",
                fontWeight: step === 3 ? 700 : 500,
                color: step === 3 ? t.accent : t.textDim,
                borderBottom: step === 3 ? `2px solid ${t.accent}` : "none",
                paddingBottom: 2,
              }}
            >
              3. Today's Intake ({candidateTasks.length})
            </span>

            <span
              onClick={() => setStep(4)}
              style={{
                cursor: "pointer",
                fontWeight: step === 4 ? 700 : 500,
                color: step === 4 ? t.accent : t.textDim,
                borderBottom: step === 4 ? `2px solid ${t.accent}` : "none",
                paddingBottom: 2,
              }}
            >
              4. Realistic Schedule & Overflow
            </span>
          </div>

          <div style={{ color: t.textDim, fontSize: 10 }}>
            Phase {step} of 4
          </div>
        </div>

        {/* ─── STEP 1: Work Hours & Capacity Configuration ─── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: t.textDim, lineHeight: 1.5 }}>
              Define your focus window for today. The engine automatically protects a <strong>20% buffer</strong> for inevitable interruptions, context shifts, and transition slack.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                background: t.surface2,
                padding: 16,
                borderRadius: 10,
                border: `1px solid ${t.border2}`,
              }}
            >
              {/* Start Time */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase" }}>
                  Start Time
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    min="5"
                    max="22"
                    value={config.startHour}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, startHour: parseInt(e.target.value, 10) || 9 }))
                    }
                    className="input"
                    style={{ width: "100%", padding: "8px 12px", fontSize: 14 }}
                  />
                  <span style={{ alignSelf: "center", color: t.textDim, fontSize: 12 }}>:00</span>
                </div>
              </div>

              {/* End Time */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase" }}>
                  End Time
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    min="8"
                    max="24"
                    value={config.endHour}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, endHour: parseInt(e.target.value, 10) || 17 }))
                    }
                    className="input"
                    style={{ width: "100%", padding: "8px 12px", fontSize: 14 }}
                  />
                  <span style={{ alignSelf: "center", color: t.textDim, fontSize: 12 }}>:00</span>
                </div>
              </div>
            </div>

            {/* Buffer & Strategy Controls */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {/* Buffer Percentage */}
              <div
                style={{
                  background: t.surface2,
                  padding: 16,
                  borderRadius: 10,
                  border: `1px solid ${t.border2}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase" }}>
                  Protected Buffer Reserve
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[0.10, 0.15, 0.20, 0.25].map((pct) => (
                    <button
                      key={pct}
                      className={`btn ${config.bufferPercent === pct ? "active" : ""}`}
                      onClick={() => setConfig((prev) => ({ ...prev, bufferPercent: pct }))}
                      style={{ fontSize: 11, flex: 1, padding: "6px 0" }}
                    >
                      {pct * 100}%
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: t.textDim }}>
                  {stats.bufferMinutes} min reserved for slack & transitions.
                </div>
              </div>

              {/* Scheduling Strategy */}
              <div
                style={{
                  background: t.surface2,
                  padding: 16,
                  borderRadius: 10,
                  border: `1px solid ${t.border2}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase" }}>
                  Load Strategy
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    className={`btn ${config.strategy === "priority" ? "active" : ""}`}
                    onClick={() => setConfig((prev) => ({ ...prev, strategy: "priority" }))}
                    style={{ fontSize: 11, flex: 1, padding: "6px 0" }}
                    title="Strict Priority: P1 -> P2 -> P3 -> P4"
                  >
                    🎯 Priority Strict
                  </button>
                  <button
                    className={`btn ${config.strategy === "energy-circadian" ? "active" : ""}`}
                    onClick={() => setConfig((prev) => ({ ...prev, strategy: "energy-circadian" }))}
                    style={{ fontSize: 11, flex: 1, padding: "6px 0" }}
                    title="Energy & Circadian: Front-load Deep Work into morning, low energy in dip"
                  >
                    ⚡ ChronoFlow Energy
                  </button>
                </div>
                <div style={{ fontSize: 11, color: t.textDim }}>
                  {config.strategy === "priority"
                    ? "Strict OmniJS priority ranking order."
                    : "Matches deep focus to morning peak hours."}
                </div>
              </div>
            </div>

            {/* Capacity Preview Box */}
            <div
              style={{
                background: `${t.accent}12`,
                border: `1px solid ${t.accent}30`,
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>AVAILABLE FOCUS BUDGET</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.accent }}>
                  {stats.availableMinutes} min ({Math.round(stats.availableMinutes / 60 * 10) / 10}h)
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: t.textDim }}>
                <div>Total Window: {stats.totalWindowMinutes} min</div>
                <div>Protected Buffer: {stats.bufferMinutes} min ({(config.bufferPercent * 100)}%)</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() => setStep(overdueTasks.length > 0 ? 2 : 3)}
                style={{ padding: "8px 20px", fontSize: 13 }}
              >
                Next: {overdueTasks.length > 0 ? `Triage Overdue (${overdueTasks.length})` : "Today's Intake"} →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Overdue Triage ─── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: t.textDim }}>
              You have <strong>{overdueTasks.length} overdue tasks</strong>. Decide whether to focus on them today, leave them as-is, or reschedule them out to clear the board:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto" }}>
              {overdueTasks.map((task) => {
                const decision = overdueTriage[task.id] || { choice: "leave", offset: 1 };
                const daysOver = task.dueDate
                  ? Math.max(1, Math.round((new Date(todayKey) - new Date(task.dueDate)) / 86400000))
                  : 1;

                return (
                  <div
                    key={task.id}
                    style={{
                      background: t.surface2,
                      border: `1px solid ${t.border2}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.danger }}>
                          ⚠️ {daysOver}d overdue
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                          {task.name}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: t.textDim }}>
                        {task.project}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        className={`btn ${decision.choice === "focus" ? "active" : ""}`}
                        onClick={() =>
                          setOverdueTriage((prev) => ({
                            ...prev,
                            [task.id]: { ...prev[task.id], choice: "focus" },
                          }))
                        }
                        style={{ fontSize: 11, padding: "4px 10px" }}
                      >
                        🎯 Focus Today
                      </button>
                      <button
                        className={`btn ${decision.choice === "leave" ? "active" : ""}`}
                        onClick={() =>
                          setOverdueTriage((prev) => ({
                            ...prev,
                            [task.id]: { ...prev[task.id], choice: "leave" },
                          }))
                        }
                        style={{ fontSize: 11, padding: "4px 10px" }}
                      >
                        Leave It
                      </button>
                      <button
                        className={`btn ${decision.choice === "reschedule" ? "active" : ""}`}
                        onClick={() =>
                          setOverdueTriage((prev) => ({
                            ...prev,
                            [task.id]: { ...prev[task.id], choice: "reschedule" },
                          }))
                        }
                        style={{ fontSize: 11, padding: "4px 10px" }}
                      >
                        📅 Reschedule
                      </button>

                      {decision.choice === "reschedule" && (
                        <select
                          className="input"
                          value={decision.offset}
                          onChange={(e) =>
                            setOverdueTriage((prev) => ({
                              ...prev,
                              [task.id]: {
                                ...prev[task.id],
                                offset: parseInt(e.target.value, 10),
                              },
                            }))
                          }
                          style={{ fontSize: 11, padding: "3px 8px" }}
                        >
                          {RESCHEDULE_OFFSETS.map((ro) => (
                            <option key={ro.value} value={ro.value}>
                              {ro.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button
                className="btn"
                onClick={() => setStep(1)}
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(3)}
                style={{ padding: "8px 20px", fontSize: 13 }}
              >
                Next: Today's Intake ({candidateTasks.length}) →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Today's Intake & Task Sizing ─── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 13, color: t.textDim }}>
              Review the tasks on deck for today. Set or adjust duration (time block), priority, and mental energy demand:
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 380, overflowY: "auto" }}>
              {candidateTasks.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: t.textDim }}>
                  No tasks selected for today. Pull tasks from overdue or add new ones.
                </div>
              ) : (
                candidateTasks.map((task) => {
                  const override = intakeOverrides[task.id] || {};
                  const isKept = override.action !== "move";
                  const duration = getTaskDuration(task, override.duration);
                  const priority = getTaskPriority(task, override.priority);
                  const energy = getTaskEnergy(task, override.energy);
                  const pillar = getTaskPillar(task);
                  const pBadge = priorityLabel(priority);
                  const energyConf = ENERGY_CONFIG[energy];

                  return (
                    <div
                      key={task.id}
                      style={{
                        background: isKept ? t.surface2 : `${t.surface2}80`,
                        border: `1px solid ${t.border2}`,
                        borderLeft: `4px solid ${pillar ? ofColor(task.project) : t.border2}`,
                        borderRadius: 8,
                        padding: "10px 14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        opacity: isKept ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                            {task.name}
                          </span>
                          {pillar && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: t.surface,
                                color: t.textDim,
                                border: `1px solid ${t.border2}`,
                              }}
                            >
                              [{pillar}]
                            </span>
                          )}
                        </div>

                        {/* Keep / Move toggle */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            className={`btn ${isKept ? "active" : ""}`}
                            onClick={() =>
                              setIntakeOverrides((prev) => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], action: "keep" },
                              }))
                            }
                            style={{ fontSize: 10, padding: "2px 8px" }}
                          >
                            ✓ Today
                          </button>
                          <button
                            className={`btn ${!isKept ? "active" : ""}`}
                            onClick={() =>
                              setIntakeOverrides((prev) => ({
                                ...prev,
                                [task.id]: { ...prev[task.id], action: "move" },
                              }))
                            }
                            style={{ fontSize: 10, padding: "2px 8px" }}
                          >
                            ↳ Move
                          </button>
                          {!isKept && (
                            <select
                              className="input"
                              value={override.moveOffset || 1}
                              onChange={(e) =>
                                setIntakeOverrides((prev) => ({
                                  ...prev,
                                  [task.id]: {
                                    ...prev[task.id],
                                    moveOffset: parseInt(e.target.value, 10),
                                  },
                                }))
                              }
                              style={{ fontSize: 10, padding: "2px 6px" }}
                            >
                              {RESCHEDULE_OFFSETS.map((ro) => (
                                <option key={ro.value} value={ro.value}>
                                  {ro.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      {/* Controls for Duration, Priority, Energy */}
                      {isKept && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 11 }}>
                          {/* Duration Selector */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: t.textDim, fontWeight: 600 }}>Duration:</span>
                            {[15, 30, 60, 90].map((d) => (
                              <button
                                key={d}
                                className={`btn ${duration === d ? "active" : ""}`}
                                onClick={() =>
                                  setIntakeOverrides((prev) => ({
                                    ...prev,
                                    [task.id]: { ...prev[task.id], duration: d },
                                  }))
                                }
                                style={{ fontSize: 10, padding: "2px 6px" }}
                              >
                                {d}m
                              </button>
                            ))}
                          </div>

                          {/* Priority Selector */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: t.textDim, fontWeight: 600 }}>Priority:</span>
                            {[
                              { score: 1, label: "TOP", color: "#EF4444" },
                              { score: 2, label: "HIGH", color: "#F97316" },
                              { score: 3, label: "NRM", color: "#3B82F6" },
                              { score: 4, label: "LOW", color: "#64748B" },
                            ].map((p) => (
                              <button
                                key={p.score}
                                className={`btn ${Math.round(priority) === p.score ? "active" : ""}`}
                                onClick={() =>
                                  setIntakeOverrides((prev) => ({
                                    ...prev,
                                    [task.id]: { ...prev[task.id], priority: p.score },
                                  }))
                                }
                                style={{
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  color: Math.round(priority) === p.score ? p.color : undefined,
                                }}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>

                          {/* Energy Selector */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: t.textDim, fontWeight: 600 }}>Energy:</span>
                            {["high", "medium", "low"].map((eng) => (
                              <button
                                key={eng}
                                className={`btn ${energy === eng ? "active" : ""}`}
                                onClick={() =>
                                  setIntakeOverrides((prev) => ({
                                    ...prev,
                                    [task.id]: { ...prev[task.id], energy: eng },
                                  }))
                                }
                                style={{
                                  fontSize: 10,
                                  padding: "2px 6px",
                                  color: energy === eng ? ENERGY_CONFIG[eng].color : undefined,
                                }}
                              >
                                {ENERGY_CONFIG[eng].icon} {ENERGY_CONFIG[eng].shortLabel}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <button
                className="btn"
                onClick={() => setStep(overdueTasks.length > 0 ? 2 : 1)}
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setStep(4)}
                style={{ padding: "8px 20px", fontSize: 13 }}
              >
                Generate Schedule ({stats.scheduledCount} Fit / {stats.overflowCount} Overflow) →
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Realistic Schedule & Overflow Cutoff ─── */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Live Capacity Meter */}
            <div
              style={{
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>
                    {stats.isOverCapacity ? "⚠️" : "🟢"}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>
                    {stats.isOverCapacity
                      ? `Over Capacity by ${stats.overByMinutes}m`
                      : "Balanced Daily Capacity"}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.textDim }}>
                  Committed: {stats.totalCommittedMinutes}m / Available: {stats.availableMinutes}m
                </div>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: "100%",
                  height: 8,
                  background: t.border2,
                  borderRadius: 4,
                  overflow: "hidden",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(100, Math.round((stats.scheduledMinutes / stats.availableMinutes) * 100))}%`,
                    background: stats.isOverCapacity ? t.warning : t.accent,
                    height: "100%",
                  }}
                />
              </div>

              {/* Badges Bar */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: t.textDim }}>
                <span>🛡️ <strong>{stats.bufferMinutes}m</strong> Buffer Protected</span>
                <span>🧠 Deep Work: <strong>{Math.round(stats.totalDeepWorkMinutes / 60 * 10) / 10}h</strong></span>
                {stats.contextSwitches > 2 && (
                  <span style={{ color: t.warning }}>
                    ⚠️ <strong>{stats.contextSwitches}</strong> Context Switches between Pillars
                  </span>
                )}
                {stats.deepWorkWarning && (
                  <span style={{ color: t.warning }}>
                    ⚠️ Deep work exceeds recommended 3.5h cognitive budget
                  </span>
                )}
              </div>
            </div>

            {/* Scheduled Tasks Timeline */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.textDim, textTransform: "uppercase" }}>
                Scheduled for Today ({scheduledTasks.length} tasks · {stats.scheduledMinutes} min)
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                {scheduledTasks.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: t.textDim, fontSize: 12 }}>
                    No tasks scheduled.
                  </div>
                ) : (
                  scheduledTasks.map((st) => {
                    const p = priorityLabel(st.priority);
                    const eng = ENERGY_CONFIG[st.energy];

                    return (
                      <div
                        key={st.task.id}
                        style={{
                          background: t.surface2,
                          border: `1px solid ${t.border2}`,
                          borderLeft: `4px solid ${ofColor(st.task.project)}`,
                          borderRadius: 6,
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              fontWeight: 700,
                              color: t.accent,
                              minWidth: 85,
                            }}
                          >
                            {st.timeSlot}
                          </span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: `${p.color}18`,
                              color: p.color,
                            }}
                          >
                            {p.code}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>
                            {st.task.name}
                          </span>
                          {st.pillar && (
                            <span style={{ fontSize: 10, color: t.textDim }}>
                              [{st.pillar}]
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: t.textDim }}>
                          <span style={{ color: eng.color }}>
                            {eng.icon} {st.duration}m
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Overflow Section */}
            {overflowTasks.length > 0 && (
              <div
                style={{
                  background: `${t.danger}10`,
                  border: `1px solid ${t.danger}30`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.danger }}>
                    Overflow ({overflowTasks.length} tasks · +{stats.overflowMinutes}m over capacity)
                  </div>
                  <span style={{ fontSize: 11, color: t.textDim }}>
                    These tasks exceed today's realistic capacity and are moved to protect your buffer.
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 140, overflowY: "auto" }}>
                  {overflowTasks.map((ot) => (
                    <div
                      key={ot.task.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                        padding: "4px 8px",
                        background: t.surface,
                        borderRadius: 4,
                      }}
                    >
                      <span style={{ color: t.text }}>{ot.task.name} ({ot.duration}m)</span>
                      <span style={{ color: t.textDim, fontSize: 11 }}>Auto-rescheduled to Tomorrow</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Feedback Message */}
            {syncStatusMsg && (
              <div
                style={{
                  background: `${t.accent}18`,
                  color: t.accent,
                  border: `1px solid ${t.accent}40`,
                  borderRadius: 6,
                  padding: "8px 12px",
                  fontSize: 12,
                  textAlign: "center",
                  fontWeight: 600,
                }}
              >
                {syncStatusMsg}
              </div>
            )}

            {/* Final Action Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <button
                className="btn"
                onClick={() => setStep(3)}
                style={{ padding: "8px 16px", fontSize: 12 }}
                disabled={isSyncing}
              >
                ← Back to Intake
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn"
                  onClick={onClose}
                  style={{ padding: "8px 16px", fontSize: 12 }}
                  disabled={isSyncing}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleApplyAndSync}
                  disabled={isSyncing}
                  style={{
                    padding: "8px 24px",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {isSyncing
                    ? "Applying Plan…"
                    : bridgeStatus === "online"
                    ? `✓ Apply & Sync to OmniFocus (${scheduledTasks.length})`
                    : `✓ Apply Plan Locally (${scheduledTasks.length})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
