import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { INITIAL_OF_TASKS, ofColor } from "../../data/tasks.js";
import { dateKey } from "../../utils/dates.js";
import { getBridgeUrl, getSupervisorUrl } from "../../utils/config.js";
import { usePersistentState } from "../../hooks/usePersistentState.js";
import { useStatusTimer } from "../../hooks/useStatusTimer.js";
import { StatCard } from "../layout/StatCard.jsx";
import { BridgeToggleButton } from "../shared/BridgeToggleButton.jsx";
import { TaskListView } from "./TaskListView.jsx";
import { TaskCalendarView } from "./TaskCalendarView.jsx";
import { PendingSyncSidebar } from "./PendingSyncSidebar.jsx";

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
  refreshStatus: propRefreshStatus,
  setRefreshStatus: propSetRefreshStatus,
  ofTasks: propOfTasks,
  setOfTasks: propSetOfTasks,
  fetchOFTasks: propFetchOFTasks,
  completeTask: propCompleteTask,
  toggleFlag: propToggleFlag,
  createTask: propCreateTask,
  t,
}) {
  const [internalOfTasks, setInternalOfTasks] = usePersistentState("tasks.ofTasks", INITIAL_OF_TASKS);
  const ofTasks = propOfTasks ?? internalOfTasks;
  const setOfTasks = propSetOfTasks ?? setInternalOfTasks;
  const [internalRefreshStatus, setInternalRefreshStatus] = useStatusTimer();
  const refreshStatus = propRefreshStatus ?? internalRefreshStatus;
  const setRefreshStatus = propSetRefreshStatus ?? setInternalRefreshStatus;

  const [ofView, setOfView] = usePersistentState("tasks.ofView", "dashboard");
  const [ofMonth, setOfMonth] = useState(() => new Date());
  const [ofFilter, setOfFilter] = usePersistentState("tasks.ofFilter", "All");
  const [ofDragItem, setOfDragItem] = useState(null);
  const [ofDragOver, setOfDragOver] = useState(null);
  const [pendingChanges, setPendingChanges] = usePersistentState("tasks.pendingChanges", []);
  const [ofScriptCopied, setOfScriptCopied] = useState(false);

  const projectList = useMemo(() => {
    return Array.from(new Set(ofTasks.map((t) => t.project).filter(Boolean)));
  }, [ofTasks]);

  const filterOptions = useMemo(
    () => ["All", "Overdue", "Flagged", ...projectList],
    [projectList]
  );

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
      setOfTasks((p) => {
        const updated = p.map((t) => (t.id === ofDragItem.id ? { ...t, dueDate: newDate } : t));
        if (typeof window !== "undefined") {
          window.localStorage.setItem("dorianos_of_tasks", JSON.stringify(updated));
        }
        return updated;
      });
      setPendingChanges((p) => [
        ...p.filter((c) => c.id !== ofDragItem.id),
        { id: ofDragItem.id, name: ofDragItem.name, oldDate: ofDragItem.dueDate, newDate },
      ]);
      setOfDragItem(null);
      setOfDragOver(null);
    },
    [ofDragItem]
  );

  // null = not checked yet, true/false = whether the LaunchAgent is installed
  const [autostartInstalled, setAutostartInstalled] = useState(null);
  const [autostartToggleStatus, setAutostartToggleStatus] = useStatusTimer();

  const checkAutostart = useCallback(async () => {
    try {
      const r = await fetch(`${getSupervisorUrl()}/status`, { signal: AbortSignal.timeout(3000) });
      const data = await r.json();
      setAutostartInstalled(!!data.autostart?.installed);
    } catch {
      setAutostartInstalled(null);
    }
  }, []);

  useEffect(() => {
    checkAutostart();
  }, [checkAutostart]);

  const toggleAutostart = useCallback(async () => {
    if (!autostartInstalled) return;
    setAutostartToggleStatus("loading");
    try {
      const r = await fetch(`${getSupervisorUrl()}/autostart/disable`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Autostart toggle failed");
      setAutostartToggleStatus("done");
      setAutostartInstalled(false);
    } catch (err) {
      console.error("Autostart toggle failed:", err.message);
      setAutostartToggleStatus("error");
    }
  }, [autostartInstalled, setAutostartToggleStatus]);

  const hasAutoFetched = useRef(false);

  const internalFetchOFTasks = useCallback(async () => {
    setRefreshStatus("loading");
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/tasks`, { signal: AbortSignal.timeout(120000) });
      const data = await r.json();
      if (data.success && data.tasks.length > 0) {
        setOfTasks(data.tasks);
        setRefreshStatus("done");
      } else {
        throw new Error(data.error || "No tasks returned");
      }
    } catch (err) {
      console.error("Fetch OF tasks failed:", err.message);
      hasAutoFetched.current = false;
      setRefreshStatus("error");
    }
  }, [setRefreshStatus, setOfTasks]);

  const fetchOFTasks = propFetchOFTasks || internalFetchOFTasks;

  // Auto-fetch whenever bridge is online
  useEffect(() => {
    if (bridgeStatus === "online" && !hasAutoFetched.current) {
      hasAutoFetched.current = true;
      fetchOFTasks();
    }
  }, [bridgeStatus, fetchOFTasks]);

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

  const internalCompleteTask = useCallback(
    async (id) => {
      setOfTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        const bridgeUrl = getBridgeUrl();
        const r = await fetch(`${bridgeUrl}/tasks/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        if (!r.ok || !data.success) {
          throw new Error(data.error || "Failed to complete task");
        }
      } catch (err) {
        console.error("Complete task error:", err.message);
        fetchOFTasks();
      }
    },
    [setOfTasks, fetchOFTasks]
  );
  const completeTask = propCompleteTask || internalCompleteTask;

  const internalToggleFlag = useCallback(
    async (id, nextFlagged) => {
      setOfTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, flagged: nextFlagged } : t))
      );
      try {
        const bridgeUrl = getBridgeUrl();
        const r = await fetch(`${bridgeUrl}/tasks/flag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, flagged: nextFlagged }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        if (!r.ok || !data.success) {
          throw new Error(data.error || "Failed to toggle flag");
        }
      } catch (err) {
        console.error("Toggle flag error:", err.message);
        fetchOFTasks();
      }
    },
    [setOfTasks, fetchOFTasks]
  );
  const toggleFlag = propToggleFlag || internalToggleFlag;

  const internalCreateTask = useCallback(
    async ({ name, dueDate, flagged }) => {
      const tempId = "temp_" + Date.now();
      const newTask = {
        id: tempId,
        name,
        project: "📥 Inbox",
        dueDate: dueDate || null,
        flagged: !!flagged,
      };
      setOfTasks((prev) => [newTask, ...prev]);
      try {
        const bridgeUrl = getBridgeUrl();
        const r = await fetch(`${bridgeUrl}/tasks/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dueDate, flagged }),
          signal: AbortSignal.timeout(20000),
        });
        const data = await r.json();
        if (r.ok && data.success && data.task) {
          setOfTasks((prev) =>
            prev.map((t) => (t.id === tempId ? data.task : t))
          );
        } else {
          throw new Error(data.error || "Failed to create task");
        }
      } catch (err) {
        console.error("Create task error:", err.message);
      }
    },
    [setOfTasks]
  );
  const createTask = propCreateTask || internalCreateTask;

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
          {filterOptions.map((f) => (
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
                fontFamily: "'Plus Jakarta Sans',sans-serif",
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

          <BridgeToggleButton bridgeStatus={bridgeStatus} checkBridge={checkBridge} t={t} />

          {autostartInstalled === true && (
            <button
              className="btn"
              onClick={toggleAutostart}
              disabled={autostartToggleStatus === "loading"}
              title="Bridge starts automatically at login. Click to turn that off."
              style={{
                fontSize: 10,
                color: t.accent,
                borderColor: t.accent,
                opacity: autostartToggleStatus === "loading" ? 0.6 : 1,
              }}
            >
              {autostartToggleStatus === "loading" ? "Disabling…" : "🟢 Auto-start ON"}
            </button>
          )}
          {autostartInstalled === false && (
            <span
              style={{
                fontSize: 10,
                color: t.textDim,
                padding: "4px 10px",
              }}
              title="Run ./setup-mac-autostart.sh once from a terminal to re-enable."
            >
              ⚪ Auto-start off
            </span>
          )}

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
                fontFamily: "'Plus Jakarta Sans',sans-serif",
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
        {ofView === "dashboard" && (
          <TaskListView
            ofFiltered={ofFiltered}
            onCompleteTask={completeTask}
            onToggleFlag={toggleFlag}
            onCreateTask={createTask}
            bridgeStatus={bridgeStatus}
            t={t}
          />
        )}
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
