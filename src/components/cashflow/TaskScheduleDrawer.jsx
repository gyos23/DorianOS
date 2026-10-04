import React, { useState, useMemo } from "react";
import { ofColor } from "../../data/tasks.js";
import { ofDueLabel } from "../../utils/dates.js";

export function TaskScheduleDrawer({
  isOpen,
  onClose,
  ofTasks = [],
  onDragStart,
  onCompleteTask,
  onToggleFlag,
  onDropUnschedule,
  t,
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isDragOverUnschedule, setIsDragOverUnschedule] = useState(false);

  const unscheduledTasks = useMemo(() => {
    return ofTasks.filter((t) => !t.dueDate);
  }, [ofTasks]);

  const flaggedTasks = useMemo(() => {
    return ofTasks.filter((t) => t.flagged);
  }, [ofTasks]);

  const filteredTasks = useMemo(() => {
    let list = ofTasks;
    if (filter === "unscheduled") list = unscheduledTasks;
    else if (filter === "flagged") list = flaggedTasks;
    else if (filter === "scheduled") list = ofTasks.filter((t) => !!t.dueDate);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.name || "").toLowerCase().includes(q) ||
          (t.project || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [ofTasks, filter, unscheduledTasks, flaggedTasks, search]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        width: 320,
        borderLeft: `1px solid ${t.border2}`,
        background: t.surface,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        position: "relative",
        boxShadow: "-4px 0 16px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${t.border2}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: t.text }}>
              OmniFocus Task Alignment
            </span>
          </div>
          <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
            Drag tasks directly onto calendar days to align with cash flow paydays.
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: t.textDim,
            fontSize: 18,
            cursor: "pointer",
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>

      {/* Drop Zone to Unschedule Tasks */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOverUnschedule(true);
        }}
        onDragLeave={() => setIsDragOverUnschedule(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverUnschedule(false);
          onDropUnschedule?.(e);
        }}
        style={{
          margin: "10px 14px 4px",
          padding: "8px 12px",
          borderRadius: 8,
          border: `1.5px dashed ${isDragOverUnschedule ? t.accent : t.border2}`,
          background: isDragOverUnschedule ? `${t.accent}15` : t.surface2,
          textAlign: "center",
          fontSize: 11,
          fontWeight: 600,
          color: isDragOverUnschedule ? t.accent : t.textDim,
          transition: "all .15s ease",
        }}
      >
        📥 Drop task here to remove due date
      </div>

      {/* Filter Chips & Search */}
      <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          type="text"
          placeholder="Filter tasks by name or project…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "5px 10px",
            fontSize: 11,
            background: t.surface2,
            border: `1px solid ${t.border2}`,
            borderRadius: 6,
            color: t.text,
          }}
        />

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            ["all", `All (${ofTasks.length})`],
            ["unscheduled", `Unscheduled (${unscheduledTasks.length})`],
            ["flagged", `Flagged (${flaggedTasks.length})`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 12,
                border: `1px solid ${filter === key ? t.accent : t.border2}`,
                background: filter === key ? `${t.accent}20` : t.surface2,
                color: filter === key ? t.accent : t.textDim,
                cursor: "pointer",
                fontWeight: filter === key ? 700 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {filteredTasks.map((task) => {
          const due = ofDueLabel(task.dueDate);
          const pColor = ofColor(task.project);

          return (
            <div
              key={task.id}
              draggable={true}
              onDragStart={(e) => onDragStart(e, task)}
              style={{
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderLeft: `3px solid ${pColor}`,
                borderRadius: 7,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                cursor: "grab",
                transition: "transform .12s, box-shadow .12s",
                userSelect: "none",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateX(2px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompleteTask?.(task.id);
                    }}
                    title="Complete task"
                    style={{
                      width: 15,
                      height: 15,
                      borderRadius: "50%",
                      border: `1.5px solid ${t.border3}`,
                      background: "transparent",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      color: t.accent,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </button>

                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={task.name}
                  >
                    {task.name}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlag?.(task.id, !task.flagged);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 11,
                      opacity: task.flagged ? 1 : 0.25,
                    }}
                  >
                    {task.flagged ? "🚩" : "⚐"}
                  </button>
                  <span style={{ fontSize: 9, color: t.textDim, cursor: "grab" }}>⠿</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9 }}>
                <span style={{ color: pColor, fontWeight: 600 }}>{task.project || "Inbox"}</span>
                <span style={{ color: task.dueDate ? (due === "overdue" ? t.danger : t.accentSub) : t.textDim }}>
                  {task.dueDate ? `📅 ${task.dueDate}` : "Unscheduled"}
                </span>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div style={{ textAlign: "center", color: t.textDim, fontSize: 11, padding: "24px 0" }}>
            No tasks match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
