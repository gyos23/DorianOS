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

  // Auto-fetch on connect
  useEffect(() => {
    if (bridgeStatus === "online" && !hasAutoFetched.current) {
      hasAutoFetched.current = true;
      fetchOFTasks();
    }
  }, [bridgeStatus, fetchOFTasks]);

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

  return {
    ofTasks,
    setOfTasks,
    refreshStatus,
    setRefreshStatus,
    fetchOFTasks,
    completeTask,
    toggleFlag,
    createTask,
  };
}
