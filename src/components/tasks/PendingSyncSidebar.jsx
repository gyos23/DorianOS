import React from "react";

export function PendingSyncSidebar({
  pendingChanges,
  setPendingChanges,
  bridgeStatus,
  syncStatus,
  syncToOmniFocus,
  ofScriptCopied,
  copyFallbackScript,
  checkBridge,
  t,
}) {
  if (!pendingChanges.length) return null;

  return (
    <div
      style={{
        width: 240,
        borderLeft: `1px solid ${t.border2}`,
        padding: 14,
        background: t.surface,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 13, color: t.accent }}>
          Pending ({pendingChanges.length})
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
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
              fontSize: 9,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            {bridgeStatus === "online"
              ? "Bridge live"
              : bridgeStatus === "offline"
              ? "Bridge offline"
              : "Checking..."}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 10, color: t.textDim, lineHeight: 1.5 }}>
        {bridgeStatus === "online"
          ? "Bridge is running. Click Sync to push changes directly to OmniFocus."
          : "Start the bridge server to enable one-click sync, or use the clipboard fallback."}
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {pendingChanges.map((c) => (
          <div
            key={c.id}
            style={{
              padding: "7px 10px",
              background: t.surface2,
              border: `1px solid ${t.border2}`,
              borderRadius: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: t.text,
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {c.name}
            </div>
            <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
              {c.oldDate || "—"} → <span style={{ color: t.accent }}>{c.newDate}</span>
            </div>
          </div>
        ))}
      </div>

      {bridgeStatus === "online" && (
        <button
          className={`btn ${syncStatus === "done" ? "active" : ""}`}
          style={{
            width: "100%",
            textAlign: "center",
            background:
              syncStatus === "error"
                ? t.dangerBg
                : syncStatus === "done"
                ? t.accent + "1a"
                : "",
            borderColor:
              syncStatus === "error"
                ? t.danger
                : syncStatus === "done"
                ? t.accent
                : "",
            color:
              syncStatus === "error"
                ? t.danger
                : syncStatus === "done"
                ? t.accent
                : "",
          }}
          disabled={syncStatus === "syncing"}
          onClick={syncToOmniFocus}
        >
          {syncStatus === "syncing"
            ? "⏳ Syncing..."
            : syncStatus === "done"
            ? "✓ Synced to OmniFocus"
            : syncStatus === "error"
            ? "✗ Sync failed — retry?"
            : "⚡ Sync to OmniFocus"}
        </button>
      )}

      <button
        className={`btn ${ofScriptCopied ? "active" : ""}`}
        style={{ width: "100%", textAlign: "center" }}
        onClick={copyFallbackScript}
      >
        {ofScriptCopied
          ? "✓ Copied!"
          : bridgeStatus === "online"
          ? "Copy AppleScript (fallback)"
          : "Copy AppleScript"}
      </button>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          className="btn"
          style={{ flex: 1, textAlign: "center" }}
          onClick={checkBridge}
        >
          ↻ Check bridge
        </button>
        <button
          className="btn"
          style={{ flex: 1, textAlign: "center" }}
          onClick={() => setPendingChanges([])}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
