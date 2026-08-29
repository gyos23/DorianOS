import React from "react";
import { ofDueLabel } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";

export function TaskListView({ ofFiltered, t }) {
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
        gap: 20,
      }}
    >
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
                fontFamily: "'Syne',sans-serif",
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
                    transition: "background .12s",
                    cursor: "default",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = t.surface2)}
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = due === "overdue" ? t.dangerBg : t.surface)
                  }
                >
                  {task.flagged && <span style={{ fontSize: 11, flexShrink: 0 }}>🚩</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: t.text,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
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
