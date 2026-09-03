import React from "react";
import { dateKey, MONTH_NAMES, DOW } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";

export function TaskCalendarView({
  ofMonth,
  setOfMonth,
  ofDragOver,
  setOfDragOver,
  ofOnDragStart,
  ofOnDragOver,
  ofOnDrop,
  ofByDate,
  t,
}) {
  const yr = ofMonth.getFullYear();
  const mo = ofMonth.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 20px",
          borderBottom: `1px solid ${t.border2}`,
          background: t.surface,
          flexShrink: 0,
        }}
      >
        <button
          className="btn"
          onClick={() =>
            setOfMonth((m) => {
              const n = new Date(m);
              n.setMonth(n.getMonth() - 1);
              return n;
            })
          }
        >
          ‹
        </button>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontWeight: 800,
            fontSize: 15,
            color: t.text,
            minWidth: 160,
            textAlign: "center",
          }}
        >
          {MONTH_NAMES[mo]} {yr}
        </span>
        <button
          className="btn"
          onClick={() =>
            setOfMonth((m) => {
              const n = new Date(m);
              n.setMonth(n.getMonth() + 1);
              return n;
            })
          }
        >
          ›
        </button>
        <span style={{ marginLeft: "auto", fontSize: 10, color: t.textDim }}>
          Drag tasks to reschedule
        </span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <thead>
            <tr>
              {DOW.map((d) => (
                <th
                  key={d}
                  style={{
                    fontSize: 9,
                    color: t.textDim,
                    fontWeight: 600,
                    padding: "4px 6px",
                    textAlign: "left",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                  }}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((day, di) => {
                  if (!day)
                    return (
                      <td
                        key={di}
                        style={{ border: `1px solid ${t.border}`, minHeight: 90, opacity: 0.1 }}
                      />
                    );
                  const k = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(day).padStart(
                    2,
                    "0"
                  )}`;
                  const isToday = k === dateKey(new Date());
                  const isDragOver = ofDragOver === k;
                  const tasks = ofByDate[k] || [];
                  return (
                    <td
                      key={di}
                      style={{
                        border: `1px solid ${isToday ? t.accent : t.border}`,
                        borderWidth: isToday ? 2 : 1,
                        padding: "4px 4px 4px",
                        minHeight: 90,
                        verticalAlign: "top",
                        background: isDragOver
                          ? t.cellDrag
                          : isToday
                          ? t.accent + "0a"
                          : t.bg,
                        transition: "background .12s",
                      }}
                      onDragOver={(e) => ofOnDragOver(e, k)}
                      onDragLeave={() => setOfDragOver(null)}
                      onDrop={(e) => ofOnDrop(e, k)}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: isToday ? t.accent : t.textMuted,
                          marginBottom: 3,
                        }}
                      >
                        {day}
                      </div>
                      {tasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => ofOnDragStart(e, task)}
                          style={{
                            fontSize: 9,
                            padding: "2px 5px",
                            borderRadius: 3,
                            marginBottom: 2,
                            cursor: "grab",
                            background: ofColor(task.project) + "22",
                            color: ofColor(task.project),
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            borderLeft: `2px solid ${ofColor(task.project)}`,
                          }}
                        >
                          {task.flagged ? "🚩 " : ""}
                          {task.name}
                        </div>
                      ))}
                      {tasks.length > 3 && (
                        <div style={{ fontSize: 9, color: t.textDim }}>+{tasks.length - 3}</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
