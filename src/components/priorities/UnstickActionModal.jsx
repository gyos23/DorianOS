import React, { useState } from "react";
import { getTemplatesForPriority } from "../../data/unstickTemplates.js";

export function UnstickActionModal({
  priority,
  pillar,
  onCreateTask,
  onClose,
  t,
}) {
  const templates = getTemplatesForPriority(priority);
  const [selectedText, setSelectedText] = useState(templates[0] || "");
  const [flagged, setFlagged] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!priority) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedText.trim()) return;
    setSubmitting(true);
    try {
      await onCreateTask?.({
        name: selectedText.trim(),
        project: priority.ofProject,
        flagged,
      });
      onClose();
    } catch (err) {
      console.error("Create unstick action failed:", err);
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 110,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border2}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 22,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{pillar?.icon || "🎯"}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: pillar?.color || t.accent,
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                {pillar?.name || "Priority"}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: `${t.warning}18`,
                  color: t.warning,
                  border: `1px solid ${t.warning}30`,
                }}
              >
                ⚡ Unstick Project
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>
              {priority.title}
            </h3>
            <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
              OmniFocus Project: <strong>{priority.ofProject || "None linked"}</strong>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              color: t.textDim,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* 1-Click Tailored Templates */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em" }}>
            High-Leverage Next Action Templates (1-Click)
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {templates.map((tpl, i) => {
              const isSelected = selectedText === tpl;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedText(tpl)}
                  style={{
                    background: isSelected ? `${t.accent}16` : t.surface2,
                    border: `1px solid ${isSelected ? t.accent : t.border2}`,
                    borderRadius: 8,
                    padding: "8px 12px",
                    textAlign: "left",
                    color: isSelected ? t.accent : t.text,
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{isSelected ? "👉" : "⚡"}</span>
                  <span style={{ flex: 1 }}>{tpl}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editable Input */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Action Item Name
            </label>
            <input
              type="text"
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder="Describe atomic next step..."
              required
              style={{
                width: "100%",
                marginTop: 4,
                padding: "9px 12px",
                background: t.surface2,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.text, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={flagged}
                onChange={(e) => setFlagged(e.target.checked)}
                style={{ accentColor: t.accent }}
              />
              <span>Mark as <strong>Flagged</strong> (high priority in OmniFocus)</span>
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={onClose}
                style={{ fontSize: 12, padding: "6px 14px" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn active"
                disabled={submitting || !selectedText.trim()}
                style={{ fontSize: 12, padding: "6px 16px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>{submitting ? "Creating…" : "⚡ Create Action"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
