import React, { useState, useMemo, useCallback } from "react";
import { INITIAL_OF_TASKS, ofColor } from "../../data/tasks.js";
import { dateKey } from "../../utils/dates.js";
import { getBridgeUrl } from "../../utils/config.js";
import { StatCard } from "../layout/StatCard.jsx";
import { TaskListView } from "./TaskListView.jsx";
import { TaskCalendarView } from "./TaskCalendarView.jsx";
import { PendingSyncSidebar } from "./PendingSyncSidebar.jsx";

const OF_FILTER_OPTIONS = [
  "All",
  "Overdue",
  "Flagged",
  "📆 Day 2 Day",
  "🔴 Sell 300 Planners 📖",
  "🔴Publish Project Guidance Platform👨‍💻",
  "🟢Eliminate CC Debt 💳 🚫",
  "⚪️Complete Scrum Master certification",
  "🟢Buy Scan Home🏡",
];

const OMNIFOCUS_QUICK_LINKS = [
  ["Inbox", "omnifocus:///inbox"],
  ["Today", "omnifocus:///today"],
  ["Flagged", "omnifocus:///flagged"],
  ["Forecast", "omnifocus:///forecast"],
];

export default function TasksTab({
  bridgeStatus,
  checkBridge,
  syncStatus,
  setSyncStatus,
  refreshStatus,
  setRefreshStatus,
  t,
}) {
  const [ofTasks, setOfTasks] = useState(INITIAL_OF_TASKS);
  const [ofView, setOfView] = useState("dashboard");
  const [ofMonth, setOfMonth] = useState(() => new Date());
  const [ofFilter, setOfFilter] = useState("All");
  const [ofDragItem, setOfDragItem] = useState(null);
  const [ofDragOver, setOfDragOver] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [ofScriptCopied, setOfScriptCopied] = useState(false);

  const ofFiltered = useMemo(() => {
    if (ofFilter === "Flagged") return ofTasks.filter((t) => t.flagged);
    if (ofFilter === "Overdue")
      return ofTasks.filter((t) => t.dueDate && t.dueDate < dateKey(new Date()));
    if (ofFilter !== "All") return ofTasks.filter((t) => t.project === ofFilter);
    return ofTasks;
  }, [ofTasks, ofFilter]);

  const ofStats = useMemo(
    () => ({
      flagged: ofTasks.filter((t) => t.flagged).length,
      overdue: ofTasks.filter((t) => t.dueDate && t.dueDate < dateKey(new Date())).length,
      today: ofTasks.filter((t) => t.dueDate === dateKey(new Date())).length,
      noDate: ofTasks.filter((t) => !t.dueDate).length,
    }),
    [ofTasks]
  );

  const ofByDate = useMemo(() => {
    const m = {};
    for (const task of ofTasks) {
      if (task.dueDate) {
        if (!m[task.dueDate]) m[task.dueDate] = [];
        m[task.dueDate].push(task);
      }
    }
    return m;
  }, [ofTasks]);

  const ofOnDragStart = useCallback((e, task) => {
    setOfDragItem(task);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const ofOnDragOver = useCallback((e, k) => {
    e.preventDefault();
    setOfDragOver(k);
  }, []);

  const ofOnDrop = useCallback(
    (e, newDate) => {
      e.preventDefault();
      if (!ofDragItem || ofDragItem.dueDate === newDate) {
        setOfDragItem(null);
        setOfDragOver(null);
        return;
      }
      setOfTasks((p) => p.map((t) => (t.id === ofDragItem.id ? { ...t, dueDate: newDate } : t)));
      setPendingChanges((p) => [
        ...p.filter((c) => c.id !== ofDragItem.id),
        { id: ofDragItem.id, name: ofDragItem.name, oldDate: ofDragItem.dueDate, newDate },
      ]);
      setOfDragItem(null);
      setOfDragOver(null);
    },
    [ofDragItem]
  );

  const fetchOFTasks = useCallback(async () => {
    setRefreshStatus("loading");
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/tasks`, { signal: AbortSignal.timeout(120000) });
      const data = await r.json();
      if (data.success && data.tasks.length > 0) {
        setOfTasks(data.tasks);
        setOfFilter("All");
        setRefreshStatus("done");
      } else {
        throw new Error(data.error || "No tasks returned");
      }
    } catch (err) {
      console.error("Fetch OF tasks failed:", err.message);
      setRefreshStatus("error");
    }
  }, [setRefreshStatus]);

  const syncToOmniFocus = async () => {
    if (!pendingChanges.length) return;
    setSyncStatus("syncing");
    try {
      const bridgeUrl = getBridgeUrl();
      const res = await fetch(`${bridgeUrl}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changes: pendingChanges.map((c) => ({
            id: c.id,
            name: c.name,
            newDate: c.newDate,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus("done");
        setPendingChanges([]);
      } else {
        throw new Error(data.error);
      }
    } catch {
      setSyncStatus("error");
    }
  };

  const copyFallbackScript = () => {
    if (!pendingChanges.length) return;
    const lines = pendingChanges.map(
      (c) => `  set due date of (first flattened task whose id = "${c.id}") to date "${c.newDate}"`
    );
    const script = `tell application "OmniFocus"\n  tell document 1\n${lines.join(
      "\n"
    )}\n  end tell\nend tell`;
    navigator.clipboard.writeText(script).then(() => {
      setOfScriptCopied(true);
      setTimeout(() => setOfScriptCopied(false), 2500);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 54px)" }}>
      {/* Stat bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          borderBottom: `1px solid ${t.border2}`,
          flexShrink: 0,
        }}
      >
        <StatCard
          label="Overdue"
          value={ofStats.overdue}
          color={t.danger}
          sub="need attention"
        />
        <StatCard
          label="Due Today"
          value={ofStats.today}
          color={t.warning}
          sub="on the docket"
        />
        <StatCard
          label="Flagged"
          value={ofStats.flagged}
          color="#F59E0B"
          sub="marked priority"
        />
        <StatCard
          label="No Date"
          value={ofStats.noDate}
          color={t.textMuted}
          sub="someday tasks"
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 20px",
          borderBottom: `1px solid ${t.border2}`,
          background: t.surface,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {[
            ["dashboard", "☰ List"],
            ["calendar", "📅 Calendar"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`btn ${ofView === v ? "active" : ""}`}
              onClick={() => setOfView(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: t.border2 }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {OF_FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              className={`btn ${ofFilter === f ? "active" : ""}`}
              onClick={() => setOfFilter(f)}
              style={
                ofFilter === f && !["All", "Overdue", "Flagged"].includes(f)
                  ? {
                      borderColor: ofColor(f),
                      color: ofColor(f),
                      background: ofColor(f) + "1a",
                    }
                  : {}
              }
            >
              {f}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <button
            className={`btn ${refreshStatus === "done" ? "active" : ""}`}
            disabled={bridgeStatus !== "online" || refreshStatus === "loading"}
            onClick={fetchOFTasks}
            style={{
              borderColor:
                refreshStatus === "error"
                  ? t.danger
                  : refreshStatus === "done"
                  ? t.accent
                  : "",
              color:
                refreshStatus === "error"
                  ? t.danger
                  : refreshStatus === "done"
                  ? t.accent
                  : "",
              opacity: bridgeStatus !== "online" ? 0.4 : 1,
              cursor: bridgeStatus !== "online" ? "not-allowed" : "pointer",
            }}
          >
            {refreshStatus === "loading"
              ? "⏳ Fetching from OF..."
              : refreshStatus === "done"
              ? "✓ Up to date"
              : refreshStatus === "error"
              ? "✗ Fetch failed"
              : "↻ Refresh OF"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              border: `1px solid ${
                bridgeStatus === "online"
                  ? t.accent
                  : bridgeStatus === "offline"
                  ? t.danger
                  : t.border3
              }`,
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={checkBridge}
            title="Click to recheck bridge status"
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                background:
                  bridgeStatus === "online"
                    ? t.accent
                    : bridgeStatus === "offline"
                    ? t.danger
                    : "#64748B",
              }}
            />
            <span
              style={{
                fontSize: 10,
                color:
                  bridgeStatus === "online"
                    ? t.accent
                    : bridgeStatus === "offline"
                    ? t.danger
                    : t.textDim,
                fontFamily: "'Syne',sans-serif",
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
              }}
            >
              {bridgeStatus === "online"
                ? "Bridge live"
                : bridgeStatus === "offline"
                ? "Bridge offline"
                : "Bridge..."}
            </span>
          </div>

          {OMNIFOCUS_QUICK_LINKS.map(([label, href]) => (
            <a
              key={label}
              href={href}
              style={{
                fontSize: 10,
                color: t.textMuted,
                textDecoration: "none",
                padding: "4px 10px",
                border: `1px solid ${t.border3}`,
                borderRadius: 6,
                fontFamily: "'Syne',sans-serif",
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                transition: "color .15s,border-color .15s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = t.accent;
                e.currentTarget.style.borderColor = t.accent;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = t.textMuted;
                e.currentTarget.style.borderColor = t.border3;
              }}
            >
              {label} ↗
            </a>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {ofView === "dashboard" && <TaskListView ofFiltered={ofFiltered} t={t} />}
        {ofView === "calendar" && (
          <TaskCalendarView
            ofMonth={ofMonth}
            setOfMonth={setOfMonth}
            ofDragOver={ofDragOver}
            setOfDragOver={setOfDragOver}
            ofOnDragStart={ofOnDragStart}
            ofOnDragOver={ofOnDragOver}
            ofOnDrop={ofOnDrop}
            ofByDate={ofByDate}
            t={t}
          />
        )}
        <PendingSyncSidebar
          pendingChanges={pendingChanges}
          setPendingChanges={setPendingChanges}
          bridgeStatus={bridgeStatus}
          syncStatus={syncStatus}
          syncToOmniFocus={syncToOmniFocus}
          ofScriptCopied={ofScriptCopied}
          copyFallbackScript={copyFallbackScript}
          checkBridge={checkBridge}
          t={t}
        />
      </div>
    </div>
  );
}
