import React, { useState, useMemo } from "react";
import { dateKey, ofDueLabel } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";
import { QuickCaptureBar } from "../tasks/QuickCaptureBar.jsx";

export function TodayFocusMatrix({
  ofTasks,
  onCompleteTask,
  onToggleFlag,
  onCreateTask,
  bridgeStatus,
  onNavigateTasks,
  t,
}) {
  const [completingIds, setCompletingIds] = useState(new Set());

  const todayKey = dateKey(new Date());

  // Prioritize: Overdue first, then Due Today, then Flagged, then others
  const priorityTasks = useMemo(() => {
    const overdue = [];
    const today = [];
    const flagged = [];

    for (const task of ofTasks) {
      if (task.dueDate && task.dueDate < todayKey) {
        overdue.push(task);
      } else if (task.dueDate === todayKey) {
        today.push(task);
      } else if (task.flagged) {
        flagged.push(task);
      }
    }

    return [...overdue, ...today, ...flagged];
  }, [ofTasks, todayKey]);

  const handleComplete = (id) => {
    setCompletingIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      onCompleteTask?.(id);
    }, 250);
  };

  return (
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🎯</span>
          <span
            style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 14,
              fontWeight: 700,
              color: t.text,
              letterSpacing: "-0.01em",
            }}
          >
            Today's Priority Focus
          </span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 8px",
              borderRadius: 10,
              background: priorityTasks.length > 0 ? t.dangerBg : t.surface2,
              color: priorityTasks.length > 0 ? t.danger : t.textDim,
              fontWeight: 600,
            }}
          >
            {priorityTasks.length} {priorityTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        <button
          className="btn"
          onClick={onNavigateTasks}
          style={{ fontSize: 11, padding: "3px 10px", color: t.textDim }}
        >
          View All ({ofTasks.length}) →
        </button>
      </div>

      <QuickCaptureBar
        onCreateTask={onCreateTask}
        bridgeStatus={bridgeStatus}
        t={t}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {priorityTasks.slice(0, 8).map((task) => {
          const due = ofDueLabel(task.dueDate);
          const dueColor = {
            overdue: t.danger,
            today: t.warning,
            soon: t.accentSub,
            upcoming: t.textDim,
            nodate: t.textDim,
          }[due];

          const dueIcon = {
            overdue: "⚠️ Overdue · ",
            today: "🔴 Today · ",
            soon: "🟡 Soon · ",
            upcoming: "📅 ",
            nodate: "",
          }[due];

          const isCompleting = completingIds.has(task.id);

          return (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: due === "overdue" ? t.dangerBg : t.surface2,
                border: `1px solid ${due === "overdue" ? t.dangerBd : t.border2}`,
                borderLeft: `3px solid ${ofColor(task.project)}`,
                borderRadius: 7,
                transition: "all .2s ease",
                opacity: isCompleting ? 0.3 : 1,
                transform: isCompleting ? "scale(0.98)" : "none",
              }}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => handleComplete(task.id)}
                title="Complete in OmniFocus"
                style={{
                  width: 18,
                  height: 18,
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
                  transition: "all .15s ease",
                }}
                onMouseOver={(e) => {
                  if (!isCompleting) {
                    e.currentTarget.style.borderColor = "#10B981";
                    e.currentTarget.style.color = "#10B981";
                    e.currentTarget.style.background = "#10B98118";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isCompleting) {
                    e.currentTarget.style.borderColor = t.border3;
                    e.currentTarget.style.color = "transparent";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>
              </button>

              {/* Flag button */}
              <button
                type="button"
                onClick={() => onToggleFlag?.(task.id, !task.flagged)}
                title={task.flagged ? "Unflag" : "Flag"}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: task.flagged ? 1 : 0.25,
                  transition: "opacity .15s",
                  flexShrink: 0,
                  fontSize: 12,
                }}
              >
                {task.flagged ? "🚩" : "⚐"}
              </button>

              {/* Name & metadata */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: t.text,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textDecoration: isCompleting ? "line-through" : "none",
                  }}
                >
                  {task.name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: ofColor(task.project), fontWeight: 600 }}>
                    {task.project}
                  </span>
                  {task.dueDate && (
                    <span style={{ fontSize: 9, color: dueColor }}>
                      {dueIcon}
                      {task.dueDate}
                    </span>
                  )}
                </div>
              </div>

              <a
                href={`omnifocus:///task/${task.id}`}
                style={{
                  fontSize: 10,
                  color: t.textDim,
                  textDecoration: "none",
                  padding: "2px 7px",
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

        {priorityTasks.length === 0 && (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: t.textDim,
              fontSize: 13,
              background: t.surface2,
              borderRadius: 8,
              border: `1px dashed ${t.border2}`,
            }}
          >
            ✨ Zero overdue or flagged tasks. You're completely caught up for today!
          </div>
        )}
      </div>
    </div>
  );
}
