import { useState, useEffect } from "react";

const PREFIX = "dorianos.";

export function usePersistentState(key, initialValue) {
  const storageKey = PREFIX + key;

  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return JSON.parse(stored);
    } catch {
      // ignore corrupt/inaccessible storage, fall through to default
    }
    return typeof initialValue === "function" ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // storage unavailable (private browsing, quota) — state stays in-memory only
    }
  }, [storageKey, state]);

  return [state, setState];
}
