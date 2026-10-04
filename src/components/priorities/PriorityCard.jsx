import React, { useState, useMemo } from "react";
import { PILLARS, getPillar } from "../../data/priorities.js";
import { ofDueLabel } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";
import { fmt } from "../../utils/formatters.js";

export function PriorityCard({
  priority,
  ofTasks = [],
  ofProjects = [],
  onUpdatePriority,
  onEditPriority,
  onDeletePriority,
  onCompleteTask,
  onToggleFlag,
  onCreateTask,
  pillars = PILLARS,
  t,
}) {
  const [showSmart, setShowSmart] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [completingIds, setCompletingIds] = useState(new Set());

  const pillar = getPillar(pillars, priority.pillar);

  // Match linked OmniFocus project metadata & pacing stats
  const matchedProject = useMemo(() => {
    if (!priority.ofProject || !ofProjects || ofProjects.length === 0) return null;
    const target = priority.ofProject.toLowerCase().trim();
    return ofProjects.find((p) => {
      const pName = (p.name || "").toLowerCase().trim();
      return pName === target || pName.includes(target) || target.includes(pName);
    });
  }, [priority.ofProject, ofProjects]);

  // Filter linked OmniFocus tasks
  const linkedTasks = useMemo(() => {
    if (!priority.ofProject) return [];
    const projName = priority.ofProject.toLowerCase().trim();
    return ofTasks.filter((task) => {
      const taskProj = (task.project || "").toLowerCase().trim();
      return (
        taskProj === projName ||
        taskProj.includes(projName) ||
        projName.includes(taskProj)
      );
    });
  }, [ofTasks, priority.ofProject]);

  const percent = useMemo(() => {
    if (!priority.targetValue || priority.targetValue <= 0) return 0;
    return Math.min(100, Math.round((priority.currentValue / priority.targetValue) * 100));
  }, [priority.currentValue, priority.targetValue]);

  const handleIncrement = (delta) => {
    const nextVal = Math.max(0, (priority.currentValue || 0) + delta);
    onUpdatePriority({
      ...priority,
      currentValue: nextVal,
      status: nextVal >= priority.targetValue && priority.targetValue > 0 ? "completed" : priority.status,
    });
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
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 800, color: t.text, fontVariantNumeric: "tabular-nums" }}>
              {priority.currentValue}
            </span>
            <span style={{ fontSize: 12, color: t.textDim, marginLeft: 4 }}>
              / {priority.targetValue} {priority.unit}
            </span>
            {priority.revenuePerUnit && (
              <span style={{ fontSize: 11, color: t.accent, marginLeft: 8, fontWeight: 600 }}>
                ({fmt(priority.currentValue * priority.revenuePerUnit)} / {fmt(priority.targetValue * priority.revenuePerUnit)})
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              className="btn"
              onClick={() => handleIncrement(-1)}
              style={{ fontSize: 11, padding: "2px 7px", lineHeight: 1 }}
              title="Decrement"
            >
              −1
            </button>
            <button
              className="btn active"
              onClick={() => handleIncrement(1)}
              style={{ fontSize: 11, padding: "2px 8px", lineHeight: 1 }}
              title="Increment +1"
            >
              +1
            </button>
            <button
              className="btn"
              onClick={() => handleIncrement(5)}
              style={{ fontSize: 11, padding: "2px 7px", lineHeight: 1 }}
              title="Increment +5"
            >
              +5
            </button>
          </div>
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
          <span>{percent}% achieved</span>
          {priority.targetDate && (
            <span>Target: {priority.targetDate}</span>
          )}
        </div>
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
    </div>
  );
}
