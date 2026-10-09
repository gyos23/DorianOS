import { useState, useCallback, useEffect, useRef } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { useStatusTimer } from "./useStatusTimer.js";
import { INITIAL_OF_TASKS } from "../data/tasks.js";
import { getBridgeUrl } from "../utils/config.js";

export function useOmniFocus(bridgeStatus) {
  const [ofTasks, setOfTasks] = usePersistentState("tasks.ofTasks", INITIAL_OF_TASKS);
  const [refreshStatus, setRefreshStatus] = useStatusTimer();
  const hasAutoFetched = useRef(false);

  const fetchOFTasks = useCallback(async () => {
    setRefreshStatus("loading");
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/tasks`, { signal: AbortSignal.timeout(120000) });
      const data = await r.json();
      if (data.success && data.tasks && data.tasks.length > 0) {
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

  const [ofProjects, setOfProjects] = usePersistentState("tasks.ofProjects", []);

  const fetchOFProjects = useCallback(async () => {
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/projects`, { signal: AbortSignal.timeout(45000) });
      const data = await r.json();
      if (data.success && Array.isArray(data.projects)) {
        setOfProjects(data.projects);
        return data.projects;
      }
      return [];
    } catch (err) {
      console.error("Fetch OF projects error:", err.message);
      return [];
    }
  }, [setOfProjects]);

  // Auto-fetch on connect
  useEffect(() => {
    if (bridgeStatus === "online" && !hasAutoFetched.current) {
      hasAutoFetched.current = true;
      fetchOFTasks();
      fetchOFProjects();
    }
  }, [bridgeStatus, fetchOFTasks, fetchOFProjects]);

  const completeTask = useCallback(
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

  const toggleFlag = useCallback(
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

  const createTask = useCallback(
    async ({ name, dueDate, flagged, project }) => {
      const tempId = "temp_" + Date.now();
      const newTask = {
        id: tempId,
        name,
        project: project || "📥 Inbox",
        dueDate: dueDate || null,
        flagged: !!flagged,
      };
      setOfTasks((prev) => [newTask, ...prev]);
      try {
        const bridgeUrl = getBridgeUrl();
        const r = await fetch(`${bridgeUrl}/tasks/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, dueDate, flagged, project: project || "📥 Inbox" }),
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


  const updateProjectNote = useCallback(async (projectName, note) => {
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/projects/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName, note }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await r.json();
      return !!(r.ok && data.success);
    } catch (err) {
      console.error("Update project note error:", err.message);
      return false;
    }
  }, []);

  const updateTaskDueDate = useCallback(
    async (id, newDate) => {
      setOfTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, dueDate: newDate || null } : t))
      );
      try {
        const bridgeUrl = getBridgeUrl();
        const r = await fetch(`${bridgeUrl}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            changes: [{ id, newDate: newDate || null }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        if (!r.ok || !data.success) {
          throw new Error(data.error || "Failed to update task due date");
        }
      } catch (err) {
        console.error("Update task due date error:", err.message);
        // We preserve local optimistic update or let next fetch sync
      }
    },
    [setOfTasks]
  );

  const batchSyncTasks = useCallback(
    async (changes) => {
      if (!Array.isArray(changes) || changes.length === 0) return { success: true, count: 0 };

      // Optimistically apply local updates
      setOfTasks((prev) =>
        prev.map((t) => {
          const change = changes.find((c) => c.id === t.id);
          if (!change) return t;
          const updated = { ...t };
          if ("newDate" in change) {
            const dateOnly = change.newDate ? change.newDate.split(/[T ]/)[0] : null;
            updated.dueDate = dateOnly;
          }
          if ("estimatedMinutes" in change) {
            updated.estimatedMinutes = change.estimatedMinutes;
          }
          return updated;
        })
      );

      try {
        const bridgeUrl = getBridgeUrl();
        const r = await fetch(`${bridgeUrl}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ changes }),
          signal: AbortSignal.timeout(30000),
        });
        const data = await r.json();
        if (!r.ok || !data.success) {
          throw new Error(data.error || "Failed to batch sync tasks");
        }
        return { success: true, count: changes.length };
      } catch (err) {
        console.error("Batch sync tasks error:", err.message);
        return { success: false, error: err.message };
      }
    },
    [setOfTasks]
  );

  return {
    ofTasks,
    setOfTasks,
    ofProjects,
    setOfProjects,
    refreshStatus,
    setRefreshStatus,
    fetchOFTasks,
    fetchOFProjects,
    updateProjectNote,
    completeTask,
    toggleFlag,
    createTask,
    updateTaskDueDate,
    batchSyncTasks,
  };
}
