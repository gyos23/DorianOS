import { useCallback, useState } from "react";
import { useStatusTimer } from "./useStatusTimer.js";
import { getSupervisorUrl } from "../utils/config.js";

// Start/stop of-bridge.js via the local supervisor, then recheck bridge
// health. Shared by every tab that shows a bridge status indicator, so the
// bridge can always be toggled from wherever that indicator is visible.
export function useBridgeToggle(bridgeStatus, checkBridge) {
  const [toggleStatus, setToggleStatus] = useStatusTimer();
  const [toggleError, setToggleError] = useState(null);

  const toggleBridge = useCallback(async () => {
    setToggleError(null);
    setToggleStatus("loading");
    const action = bridgeStatus === "online" ? "stop" : "start";
    try {
      const supervisorUrl = getSupervisorUrl();
      const r = await fetch(`${supervisorUrl}/${action}`, {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Supervisor ${action} failed`);
      setToggleStatus("done");
      setTimeout(checkBridge, action === "start" ? 1500 : 300);
    } catch (err) {
      console.error("Bridge toggle failed:", err.message);
      setToggleError("Supervisor unreachable — run: node bridge-supervisor.js (see README)");
      setToggleStatus("error");
    }
  }, [bridgeStatus, checkBridge, setToggleStatus]);

  return { toggleBridge, toggleStatus, toggleError };
}
