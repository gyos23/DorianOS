import React from "react";
import { useBridgeToggle } from "../../hooks/useBridgeToggle.js";

export function BridgeToggleButton({ bridgeStatus, checkBridge, t, style }) {
  const { toggleBridge, toggleStatus, toggleError } = useBridgeToggle(bridgeStatus, checkBridge);

  return (
    <button
      className="btn"
      onClick={toggleBridge}
      disabled={toggleStatus === "loading"}
      title={toggleError || ""}
      style={{
        borderColor: toggleStatus === "error" ? t.danger : "",
        color: toggleStatus === "error" ? t.danger : "",
        opacity: toggleStatus === "loading" ? 0.6 : 1,
        ...style,
      }}
    >
      {toggleStatus === "loading"
        ? bridgeStatus === "online"
          ? "Stopping…"
          : "Starting…"
        : toggleStatus === "error"
        ? "✕ Toggle failed"
        : bridgeStatus === "online"
        ? "■ Stop Bridge"
        : "▶ Start Bridge"}
    </button>
  );
}
