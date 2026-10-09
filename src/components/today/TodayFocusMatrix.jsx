import React, { useState, useMemo } from "react";
import { dateKey, ofDueLabel } from "../../utils/dates.js";
import { ofColor } from "../../data/tasks.js";
import { QuickCaptureBar } from "../tasks/QuickCaptureBar.jsx";
import {
  planDailyLoad,
  getTaskDuration,
  getTaskPriority,
  getTaskEnergy,
  priorityLabel,
  ENERGY_CONFIG,
} from "../../utils/dailyLoadPlanner.js";

export function getTaskTags(task) {
  if (Array.isArray(task.tags) && task.tags.length > 0) {
    return task.tags.map((t) => t.toLowerCase());
  }
  const matches = (task.name || "").match(/(?:^|\s)(#[a-zA-Z0-9_-]+|@[a-zA-Z0-9_-]+)/g);
  if (matches) {
    return matches.map((m) => m.trim().replace(/^[#@]/, "").toLowerCase());
  }
  return [];
}

export function TodayFocusMatrix({
  ofTasks = [],
  onCompleteTask,
  onToggleFlag,
  onCreateTask,
  bridgeStatus,
  onNavigateTasks,
  onOpenLoadPlanner,
  t,
}) {
  const [completingIds, setCompletingIds] = useState(new Set());
  const [selectedTag, setSelectedTag] = useState("all");

  const todayKey = dateKey(new Date());

  // Collect all unique tags across tasks
  const availableTags = useMemo(() => {
    const set = new Set();
    for (const task of ofTasks) {
      const tags = getTaskTags(task);
      tags.forEach((tag) => set.add(tag));
    }
    return Array.from(set).sort();
  }, [ofTasks]);

  // Prioritize: Overdue first, then Due Today, then Flagged, then others, matching selectedTag
  const priorityTasks = useMemo(() => {
    const overdue = [];
    const today = [];
    const flagged = [];
    const others = [];

    for (const task of ofTasks) {
      const tags = getTaskTags(task);
      if (selectedTag === "flagged" && !task.flagged) continue;
      if (selectedTag !== "all" && selectedTag !== "flagged" && !tags.includes(selectedTag)) continue;

      if (task.dueDate && task.dueDate < todayKey) {
        overdue.push(task);
      } else if (task.dueDate === todayKey) {
        today.push(task);
      } else if (task.flagged) {
        flagged.push(task);
      } else if (selectedTag !== "all") {
        others.push(task);
      }
    }

    return [...overdue, ...today, ...flagged, ...others];
  }, [ofTasks, todayKey, selectedTag]);

  // Compute Daily Load stats for today's active tasks
  const dailyLoadPlan = useMemo(() => {
    const todayCandidateTasks = ofTasks.filter(
      (t) => (t.dueDate && t.dueDate <= todayKey) || t.flagged
    );
    return planDailyLoad(todayCandidateTasks);
  }, [ofTasks, todayKey]);

  const { stats } = dailyLoadPlan;

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
              fontFamily: "'Plus Jakarta Sans',sans-serif",
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

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {onOpenLoadPlanner && (
            <button
              className="btn btn-primary"
              onClick={onOpenLoadPlanner}
              style={{
                fontSize: 11,
                padding: "3px 10px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 700,
              }}
              title="Open Daily Load Planning Engine to realistically size and balance your day"
            >
              <span>⚡</span> Plan My Day
            </button>
          )}

          <button
            className="btn"
            onClick={onNavigateTasks}
            style={{ fontSize: 11, padding: "3px 10px", color: t.textDim }}
          >
            View All ({ofTasks.length}) →
          </button>
        </div>
      </div>

      {/* Daily Capacity & Load Engine Status Card */}
      <div
        style={{
          background: t.surface2,
          border: `1px solid ${stats.isOverCapacity ? t.warning + "40" : t.border2}`,
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700 }}>
            <span>{stats.isOverCapacity ? "⚠️" : "🛡️"}</span>
            <span style={{ color: t.text }}>Daily Load Capacity</span>
            <span style={{ color: stats.isOverCapacity ? t.warning : t.accent }}>
              ({stats.scheduledMinutes}m / {stats.availableMinutes}m available)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: t.textDim }}>
            <span>Buffer: <strong>{stats.bufferMinutes}m</strong> protected (20%)</span>
            {stats.overflowCount > 0 && (
              <span style={{ color: t.danger, fontWeight: 700 }}>
                +{stats.overflowCount} overflow (+{stats.overflowMinutes}m)
              </span>
            )}
          </div>
        </div>

        {/* Capacity Bar */}
        <div
          style={{
            width: "100%",
            height: 6,
            background: t.border2,
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.round((stats.scheduledMinutes / stats.availableMinutes) * 100))}%`,
              background: stats.isOverCapacity ? t.warning : t.accent,
              height: "100%",
              borderRadius: 3,
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: t.textDim }}>
          <span>
            🧠 Deep Focus: {Math.round((stats.totalDeepWorkMinutes / 60) * 10) / 10}h
            {stats.contextSwitches > 1 ? ` · 🔄 ${stats.contextSwitches} context switches` : ""}
          </span>
          <span
            onClick={onOpenLoadPlanner}
            style={{ cursor: "pointer", color: t.accent, fontWeight: 600 }}
          >
            {stats.isOverCapacity ? "Rebalance Overflow →" : "Optimize Schedule →"}
          </span>
        </div>
      </div>

      <QuickCaptureBar
        onCreateTask={onCreateTask}
        bridgeStatus={bridgeStatus}
        t={t}
      />

      {/* Tag & Context Filter Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 2,
        }}
      >
        <span style={{ fontSize: 10, color: t.textDim, fontWeight: 700, textTransform: "uppercase", marginRight: 2 }}>
          Mode:
        </span>
        <button
          className={`btn ${selectedTag === "all" ? "active" : ""}`}
          onClick={() => setSelectedTag("all")}
          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12 }}
        >
          All ({ofTasks.length})
        </button>
        <button
          className={`btn ${selectedTag === "flagged" ? "active" : ""}`}
          onClick={() => setSelectedTag("flagged")}
          style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12 }}
        >
          🚩 Flagged
        </button>
        {availableTags.map((tag) => (
          <button
            key={tag}
            className={`btn ${selectedTag === tag ? "active" : ""}`}
            onClick={() => setSelectedTag(tag)}
            style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12 }}
          >
            #{tag}
          </button>
        ))}
      </div>

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
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 9, color: ofColor(task.project), fontWeight: 600 }}>
                    {task.project}
                  </span>
                  {task.dueDate && (
                    <span style={{ fontSize: 9, color: dueColor }}>
                      {dueIcon}
                      {task.dueDate}
                    </span>
                  )}
                  {/* Duration Pill */}
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 700,
                      background: `${t.accent}14`,
                      color: t.accent,
                      border: `1px solid ${t.accent}30`,
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    ⏱️ {getTaskDuration(task)}m
                  </span>
                  {/* Energy Pill */}
                  {(() => {
                    const eng = getTaskEnergy(task);
                    const engConf = ENERGY_CONFIG[eng];
                    return (
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 700,
                          background: engConf.bg,
                          color: engConf.color,
                          border: `1px solid ${engConf.color}30`,
                          padding: "1px 5px",
                          borderRadius: 4,
                        }}
                      >
                        {engConf.icon} {engConf.shortLabel}
                      </span>
                    );
                  })()}
                  {/* Priority Pill if Top or High */}
                  {(() => {
                    const pri = getTaskPriority(task);
                    if (pri <= 2) {
                      const p = priorityLabel(pri);
                      return (
                        <span
                          style={{
                            fontSize: 8.5,
                            fontWeight: 700,
                            background: `${p.color}18`,
                            color: p.color,
                            border: `1px solid ${p.color}30`,
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          {p.code}
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {getTaskTags(task).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 8.5,
                        fontWeight: 600,
                        background: t.surface,
                        color: t.textDim,
                        border: `1px solid ${t.border2}`,
                        padding: "1px 5px",
                        borderRadius: 4,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
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
