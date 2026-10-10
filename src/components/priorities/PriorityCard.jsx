import React, { useState, useMemo } from "react";
import { PILLARS, getPillar } from "../../data/priorities.js";
import { ofDueLabel } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";
import { fmt } from "../../utils/formatters.js";
import { LogWeekModal } from "./LogWeekModal.jsx";
import { matchProjectNames } from "../../utils/projectMatcher.js";

export function PriorityCard({
  priority,
  ofTasks = [],
  ofProjects = [],
  progressHistory = [],
  onLogWeekProgress,
  onUpdatePriority,
  onEditPriority,
  onDeletePriority,
  onCompleteTask,
  onToggleFlag,
  onCreateTask,
  pillars = PILLARS,
  cashZeroDate,
  startBal,
  checkingBal,
  t,
}) {
  const [showSmart, setShowSmart] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [completingIds, setCompletingIds] = useState(new Set());
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editInputVal, setEditInputVal] = useState("");
  const [showLogWeekModal, setShowLogWeekModal] = useState(false);

  const pillar = getPillar(pillars, priority.pillar);

  const isWeeklyCadence =
    priority.metricType === "weekly_cadence" ||
    priority.cadence === "weekly" ||
    priority.id === "p-forward-role" ||
    (priority.unit && priority.unit.toLowerCase().includes("week"));

  const isRunway = priority.metricType === "runway";

  // Calculate live days until cash zero if available
  const liveRunwayDays = useMemo(() => {
    if (!cashZeroDate) return null;
    const zero = new Date(cashZeroDate + "T12:00:00");
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const diffDays = Math.ceil((zero.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [cashZeroDate]);

  // Match linked OmniFocus project metadata & pacing stats
  const matchedProject = useMemo(() => {
    if (!priority.ofProject || !ofProjects || ofProjects.length === 0) return null;
    return ofProjects.find((p) => matchProjectNames(priority.ofProject, p.name));
  }, [priority.ofProject, ofProjects]);

  // Filter linked OmniFocus tasks
  const linkedTasks = useMemo(() => {
    if (!priority.ofProject) return [];
    return ofTasks.filter((task) => matchProjectNames(priority.ofProject, task.project));
  }, [ofTasks, priority.ofProject]);

  // Filter archived weekly memories for this priority
  const pastMemories = useMemo(() => {
    return (progressHistory || []).filter((h) => h.priorityId === priority.id);
  }, [progressHistory, priority.id]);

  const percent = useMemo(() => {
    if (!priority.targetValue || priority.targetValue <= 0) return 0;
    return Math.min(100, Math.round((priority.currentValue / priority.targetValue) * 100));
  }, [priority.currentValue, priority.targetValue]);

  const handleSetExact = (val) => {
    const nextVal = Math.max(0, val);
    onUpdatePriority({
      ...priority,
      currentValue: nextVal,
      // Do not auto-complete runway or weekly cadence goals!
      status:
        !isRunway && !isWeeklyCadence && nextVal >= priority.targetValue && priority.targetValue > 0
          ? "completed"
          : priority.status,
    });
  };

  const handleIncrement = (delta) => {
    handleSetExact((priority.currentValue || 0) + delta);
  };

  const handleStatusChange = (newStatus) => {
    onUpdatePriority({
      ...priority,
      status: newStatus,
    });
  };

  const handleTaskComplete = (taskId) => {
    setCompletingIds((prev) => new Set([...prev, taskId]));
    setTimeout(() => {
      onCompleteTask?.(taskId);
    }, 250);
  };

  const statusConfig = {
    active: { label: "Active", color: "#10B981", bg: "#10B98118" },
    paused: { label: "Paused", color: "#F59E0B", bg: "#F59E0B18" },
    completed: { label: "Completed", color: "#3B82F6", bg: "#3B82F618" },
    dropped: { label: "Dropped", color: "#94A3B8", bg: "#94A3B818" },
  }[priority.status] || { label: priority.status, color: t.textDim, bg: t.surface2 };

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border2}`,
        borderTop: `3px solid ${pillar.color}`,
        borderRadius: 12,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pillar.color,
                background: pillar.bg,
                padding: "2px 8px",
                borderRadius: 10,
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              {pillar.icon} {pillar.name}
            </span>

            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: statusConfig.color,
                background: statusConfig.bg,
                padding: "2px 7px",
                borderRadius: 10,
              }}
            >
              {statusConfig.label}
            </span>
          </div>

          <h3
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 16,
              fontWeight: 800,
              color: t.text,
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {priority.title}
          </h3>
        </div>

        {/* Quick Menu / Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {priority.status === "active" ? (
            <button
              className="btn"
              onClick={() => handleStatusChange("paused")}
              title="Pause priority (move to backlog)"
              style={{ fontSize: 10, padding: "2px 6px", color: t.textDim }}
            >
              ⏸ Pause
            </button>
          ) : (
            <button
              className="btn"
              onClick={() => handleStatusChange("active")}
              title="Activate priority"
              style={{ fontSize: 10, padding: "2px 6px", color: "#10B981" }}
            >
              ▶ Activate
            </button>
          )}

          {priority.status !== "completed" && (
            <button
              className="btn"
              onClick={() => handleStatusChange("completed")}
              title="Mark priority completed"
              style={{ fontSize: 10, padding: "2px 6px", color: "#3B82F6" }}
            >
              ✓ Complete
            </button>
          )}

          <button
            className="btn"
            onClick={() => onEditPriority(priority)}
            title="Edit priority details & SMART goal"
            style={{ fontSize: 10, padding: "2px 6px", color: t.textDim }}
          >
            ✎ Edit
          </button>
        </div>
      </div>

      {/* Progress & Metric Tracker */}
      <div
        style={{
          background: t.surface2,
          border: `1px solid ${t.border2}`,
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            {isEditingValue ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  autoFocus
                  value={editInputVal}
                  onChange={(e) => setEditInputVal(e.target.value)}
                  onBlur={() => {
                    const parsed = parseFloat(editInputVal);
                    if (!isNaN(parsed) && parsed >= 0) handleSetExact(parsed);
                    setIsEditingValue(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const parsed = parseFloat(editInputVal);
                      if (!isNaN(parsed) && parsed >= 0) handleSetExact(parsed);
                      setIsEditingValue(false);
                    } else if (e.key === "Escape") {
                      setIsEditingValue(false);
                    }
                  }}
                  style={{
                    width: 65,
                    padding: "2px 6px",
                    fontSize: 18,
                    fontWeight: 800,
                    background: t.surface,
                    border: `1px solid ${t.accent}`,
                    borderRadius: 6,
                    color: t.text,
                  }}
                />
                <span style={{ fontSize: 12, color: t.textDim }}>{priority.unit}</span>
              </span>
            ) : (
              <span
                onClick={() => {
                  setEditInputVal(String(priority.currentValue || 0));
                  setIsEditingValue(true);
                }}
                title="Click to edit value directly"
                style={{ cursor: "pointer" }}
              >
                <span style={{ fontSize: 20, fontWeight: 800, color: t.text, fontVariantNumeric: "tabular-nums" }}>
                  {priority.currentValue}
                </span>
                <span style={{ fontSize: 12, color: t.textDim, marginLeft: 4 }}>
                  / {priority.targetValue} {priority.unit}
                </span>
              </span>
            )}
            {priority.revenuePerUnit && (
              <span style={{ fontSize: 11, color: t.accent, marginLeft: 8, fontWeight: 600 }}>
                ({fmt(priority.currentValue * priority.revenuePerUnit)} / {fmt(priority.targetValue * priority.revenuePerUnit)})
              </span>
            )}
          </div>

          {/* Metric Adjustment Controls */}
          {isRunway ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
              {liveRunwayDays !== null && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => handleSetExact(liveRunwayDays)}
                  style={{
                    fontSize: 10,
                    padding: "3px 8px",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: `${t.accent}14`,
                    color: t.accent,
                    border: `1px solid ${t.accent}30`,
                    fontWeight: 700,
                  }}
                  title={`Sync live runway calculated from cash flow (${liveRunwayDays} days)`}
                >
                  ⚡ Live: {liveRunwayDays}d
                </button>
              )}
              <button
                type="button"
                className="btn"
                onClick={() => handleIncrement(-15)}
                style={{ fontSize: 10, padding: "2px 6px" }}
                title="Decrease by 15 days"
              >
                −15d
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleIncrement(15)}
                style={{ fontSize: 10, padding: "2px 6px" }}
                title="Increase by 15 days"
              >
                +15d
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setEditInputVal(String(priority.currentValue || 0));
                  setIsEditingValue(true);
                }}
                style={{ fontSize: 10, padding: "2px 6px", color: t.textDim }}
                title="Set exact runway days"
              >
                ✎ Set
              </button>
            </div>
          ) : isWeeklyCadence ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                className="btn"
                onClick={() => handleIncrement(-1)}
                style={{ fontSize: 11, padding: "2px 7px", lineHeight: 1 }}
                title="Decrement -1 application"
              >
                −1
              </button>
              <button
                type="button"
                className="btn active"
                onClick={() => handleIncrement(1)}
                style={{ fontSize: 11, padding: "2px 8px", lineHeight: 1 }}
                title="Log +1 application"
              >
                +1
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleIncrement(2)}
                style={{ fontSize: 11, padding: "2px 7px", lineHeight: 1 }}
                title="Log +2 applications (daily target)"
              >
                +2
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setShowLogWeekModal(true)}
                style={{ fontSize: 10, padding: "2px 7px", color: t.accent, fontWeight: 700, borderColor: `${t.accent}40` }}
                title="Log accomplishments as permanent memory & start fresh week"
              >
                📥 Log Week
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                className="btn"
                onClick={() => handleIncrement(-1)}
                style={{ fontSize: 11, padding: "2px 7px", lineHeight: 1 }}
                title="Decrement"
              >
                −1
              </button>
              <button
                type="button"
                className="btn active"
                onClick={() => handleIncrement(1)}
                style={{ fontSize: 11, padding: "2px 8px", lineHeight: 1 }}
                title="Increment +1"
              >
                +1
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleIncrement(5)}
                style={{ fontSize: 11, padding: "2px 7px", lineHeight: 1 }}
                title="Increment +5"
              >
                +5
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: "100%",
            height: 6,
            background: t.border2,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: pillar.color,
              borderRadius: 3,
              transition: "width .3s ease",
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.textDim }}>
          <span>
            {isWeeklyCadence
              ? percent >= 100
                ? "🎯 Weekly Target Met! (" + priority.currentValue + "/" + priority.targetValue + ")"
                : `${percent}% of weekly target (${priority.targetValue}/wk)`
              : isRunway
              ? percent >= 100
                ? `🛡️ ${priority.currentValue}d Runway Protected (100% of ${priority.targetValue}d target)`
                : `${priority.currentValue}d of ${priority.targetValue}d target (${percent}%)`
              : `${percent}% achieved`}
          </span>
          {priority.targetDate && (
            <span>
              {isWeeklyCadence ? "Weekly Cadence" : `Target: ${priority.targetDate}`}
            </span>
          )}
        </div>

        {/* Past Weeks Memory Trail */}
        {pastMemories.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              color: t.textDim,
              background: t.surface2,
              padding: "4px 8px",
              borderRadius: 6,
              marginTop: 2,
            }}
          >
            <span style={{ fontWeight: 700, color: t.text }}>Memories ({pastMemories.length}):</span>
            <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
              {pastMemories.slice(0, 3).map((m) => (
                <span
                  key={m.id}
                  title={`${m.weekLabel}: ${m.reflection || ""}`}
                  style={{
                    background: m.percent >= 100 ? "#10B98118" : `${t.accent}14`,
                    color: m.percent >= 100 ? "#10B981" : t.accent,
                    padding: "1px 5px",
                    borderRadius: 4,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.valueAchieved}/{m.targetValue} {m.unit}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live OmniFocus Next Actions */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            OmniFocus Actions ({linkedTasks.length})
          </span>
          {priority.ofProject && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {matchedProject?.isStale && (
                <span
                  title={`No activity in ${matchedProject.daysSinceActivity} days with open tasks pending`}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#f59e0b",
                    background: "#f59e0b22",
                    border: "1px solid #f59e0b44",
                    padding: "1px 5px",
                    borderRadius: 4,
                  }}
                >
                  ⚠️ Stale ({matchedProject.daysSinceActivity}d)
                </span>
              )}
              <span style={{ fontSize: 9, color: ofColor(priority.ofProject), fontWeight: 600 }}>
                {priority.ofProject}
              </span>
            </div>
          )}
        </div>

        {/* OmniFocus Project Milestone & Pacing Pill */}
        {matchedProject && (
          <div
            style={{
              background: t.surface2,
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: "6px 9px",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: `${pillar.color}22`,
                  border: `1.5px solid ${pillar.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  color: t.text,
                  flexShrink: 0,
                }}
                title={`OmniFocus completion rate: ${matchedProject.completedTasks}/${matchedProject.totalTasks} tasks done`}
              >
                {matchedProject.completionRate}%
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {matchedProject.completedTasks}/{matchedProject.totalTasks} OF tasks completed
                </div>
                <div style={{ fontSize: 9, color: t.textDim }}>
                  {matchedProject.remainingTasks} remaining · {matchedProject.daysSinceActivity !== null ? `${matchedProject.daysSinceActivity}d since edit` : "active"}
                </div>
              </div>
            </div>

            {matchedProject.dueDate && (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 8.5, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  OF Milestone
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.accent }}>
                  {new Date(matchedProject.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(showAllTasks ? linkedTasks : linkedTasks.slice(0, 3)).map((task) => {
            const due = ofDueLabel(task.dueDate);
            const dueColor = {
              overdue: t.danger,
              today: t.warning,
              soon: t.accentSub,
              upcoming: t.textDim,
              nodate: t.textDim,
            }[due];

            const isCompleting = completingIds.has(task.id);

            return (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 6,
                  fontSize: 12,
                  opacity: isCompleting ? 0.3 : 1,
                  transition: "all .2s ease",
                }}
              >
                {/* Complete checkbox */}
                <button
                  type="button"
                  onClick={() => handleTaskComplete(task.id)}
                  title="Complete in OmniFocus"
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: `1.5px solid ${isCompleting ? "#10B981" : t.border3}`,
                    background: isCompleting ? "#10B981" : "transparent",
                    color: isCompleting ? "#fff" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>✓</span>
                </button>

                {/* Flag toggle */}
                <button
                  type="button"
                  onClick={() => onToggleFlag?.(task.id, !task.flagged)}
                  title={task.flagged ? "Unflag" : "Flag"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 11,
                    opacity: task.flagged ? 1 : 0.25,
                    flexShrink: 0,
                  }}
                >
                  {task.flagged ? "🚩" : "⚐"}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: t.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 500,
                      textDecoration: isCompleting ? "line-through" : "none",
                    }}
                  >
                    {task.name}
                  </div>
                  {task.dueDate && (
                    <div style={{ fontSize: 9, color: dueColor }}>
                      📅 {task.dueDate}
                    </div>
                  )}
                </div>

                <a
                  href={`omnifocus:///task/${task.id}`}
                  style={{
                    fontSize: 9,
                    color: t.textDim,
                    textDecoration: "none",
                    padding: "2px 6px",
                    border: `1px solid ${t.border3}`,
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  ↗
                </a>
              </div>
            );
          })}

          {linkedTasks.length === 0 && (
            <div style={{ fontSize: 11, color: t.textDim, padding: "4px 0", fontStyle: "italic" }}>
              No open tasks linked to this priority.
            </div>
          )}

          {/* Show More / Show Less Toggle */}
          {linkedTasks.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllTasks(!showAllTasks)}
              style={{
                background: "none",
                border: "none",
                color: t.accent,
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
                padding: "3px 0",
              }}
            >
              {showAllTasks ? "▴ Show fewer tasks" : `▾ Show all ${linkedTasks.length} open tasks`}
            </button>
          )}

          {/* Quick Add Open Task to Priority */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskName.trim()) return;
              onCreateTask?.({
                name: newTaskName.trim(),
                project: priority.ofProject || `🎯 ${priority.title}`,
                flagged: false,
              });
              setNewTaskName("");
            }}
            style={{ display: "flex", gap: 6, marginTop: 4 }}
          >
            <input
              type="text"
              placeholder="+ Add open task under this priority…"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              style={{
                flex: 1,
                padding: "5px 8px",
                fontSize: 11,
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderRadius: 5,
                color: t.text,
              }}
            />
            <button
              type="submit"
              disabled={!newTaskName.trim()}
              className="btn active"
              style={{ fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
            >
              + Add
            </button>
          </form>
        </div>
      </div>

      {/* Collapsible SMART Goal Details */}
      {priority.smart && (
        <div style={{ borderTop: `1px solid ${t.border2}`, paddingTop: 10 }}>
          <button
            type="button"
            onClick={() => setShowSmart((p) => !p)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: 11,
              fontWeight: 600,
              color: t.accent,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{showSmart ? "▼" : "▶"}</span>
            <span>SMART Goal Breakdown</span>
          </button>

          {showSmart && (
            <div
              style={{
                marginTop: 8,
                padding: 10,
                background: t.surface2,
                borderRadius: 6,
                fontSize: 11,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                lineHeight: 1.4,
              }}
            >
              {priority.smart.specific && (
                <div>
                  <strong style={{ color: t.text }}>Specific: </strong>
                  <span style={{ color: t.textSub }}>{priority.smart.specific}</span>
                </div>
              )}
              {priority.smart.measurable && (
                <div>
                  <strong style={{ color: t.text }}>Measurable: </strong>
                  <span style={{ color: t.textSub }}>{priority.smart.measurable}</span>
                </div>
              )}
              {priority.smart.achievable && (
                <div>
                  <strong style={{ color: t.text }}>Achievable: </strong>
                  <span style={{ color: t.textSub }}>{priority.smart.achievable}</span>
                </div>
              )}
              {priority.smart.relevant && (
                <div>
                  <strong style={{ color: t.text }}>Relevant: </strong>
                  <span style={{ color: t.textSub }}>{priority.smart.relevant}</span>
                </div>
              )}
              {priority.smart.timeBound && (
                <div>
                  <strong style={{ color: t.text }}>Time-Bound: </strong>
                  <span style={{ color: t.textSub }}>{priority.smart.timeBound}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log Week Progress Modal */}
      {showLogWeekModal && (
        <LogWeekModal
          priority={priority}
          pillar={pillar}
          financials={{
            runwayDays: liveRunwayDays,
            checkingBal,
            startBal,
          }}
          onSaveProgress={(entry) => {
            onLogWeekProgress?.(entry);
          }}
          onClose={() => setShowLogWeekModal(false)}
          t={t}
        />
      )}
    </div>
  );
}
