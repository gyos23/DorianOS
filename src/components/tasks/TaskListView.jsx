import React, { useState } from "react";
import { ofDueLabel } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";
import { QuickCaptureBar } from "./QuickCaptureBar.jsx";

export function TaskListView({
  ofFiltered,
  onCompleteTask,
  onToggleFlag,
  onCreateTask,
  bridgeStatus,
  t,
}) {
  const [completingIds, setCompletingIds] = useState(new Set());

  const handleComplete = async (id) => {
    setCompletingIds((prev) => new Set([...prev, id]));
    // Brief animation delay before removal
    setTimeout(() => {
      onCompleteTask?.(id);
    }, 250);
  };

  const grouped = ofFiltered.reduce((acc, task) => {
    (acc[task.project] = acc[task.project] || []).push(task);
    return acc;
  }, {});

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <QuickCaptureBar
        onCreateTask={onCreateTask}
        bridgeStatus={bridgeStatus}
        t={t}
      />

      {Object.entries(grouped).map(([project, tasks]) => (
        <div key={project}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: ofColor(project),
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.textMuted,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              {project}
            </span>
            <span style={{ fontSize: 10, color: t.textDim }}>({tasks.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tasks.map((task) => {
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
                    padding: "8px 14px",
                    background: due === "overdue" ? t.dangerBg : t.surface,
                    border: `1px solid ${due === "overdue" ? t.dangerBd : t.border2}`,
                    borderLeft: `3px solid ${ofColor(task.project)}`,
                    borderRadius: 7,
                    transition: "all .2s ease",
                    opacity: isCompleting ? 0.3 : 1,
                    transform: isCompleting ? "scale(0.98)" : "none",
                  }}
                  onMouseOver={(e) => {
                    if (!isCompleting) e.currentTarget.style.background = t.surface2;
                  }}
                  onMouseOut={(e) => {
                    if (!isCompleting) {
                      e.currentTarget.style.background = due === "overdue" ? t.dangerBg : t.surface;
                    }
                  }}
                >
                  {/* Circular Complete Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleComplete(task.id)}
                    title="Complete task in OmniFocus"
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

                  {/* Flag Toggle Button */}
                  <button
                    type="button"
                    onClick={() => onToggleFlag?.(task.id, !task.flagged)}
                    title={task.flagged ? "Unflag priority" : "Mark as priority"}
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
                      fontSize: 13,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = task.flagged ? 1 : 0.25)}
                  >
                    {task.flagged ? "🚩" : "⚐"}
                  </button>

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
                    {task.dueDate && (
                      <div style={{ fontSize: 10, color: dueColor, marginTop: 2 }}>
                        {dueIcon}
                        {task.dueDate}
                      </div>
                    )}
                  </div>

                  <a
                    href={`omnifocus:///task/${task.id}`}
                    style={{
                      fontSize: 10,
                      color: t.textDim,
                      textDecoration: "none",
                      padding: "3px 8px",
                      border: `1px solid ${t.border3}`,
                      borderRadius: 5,
                      flexShrink: 0,
                      transition: "all .15s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = ofColor(task.project);
                      e.currentTarget.style.borderColor = ofColor(task.project);
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = t.textDim;
                      e.currentTarget.style.borderColor = t.border3;
                    }}
                  >
                    Open ↗
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {ofFiltered.length === 0 && (
        <div style={{ textAlign: "center", color: t.textDim, paddingTop: 60, fontSize: 14 }}>
          No tasks match this filter.
        </div>
      )}
    </div>
  );
}
