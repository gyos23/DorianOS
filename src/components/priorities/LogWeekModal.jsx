import React, { useState } from "react";

export function LogWeekModal({
  priority,
  pillar,
  financials = {},
  onSaveProgress,
  onClose,
  t,
}) {
  const currentValue = priority.currentValue || 0;
  const targetValue = priority.targetValue || 10;
  const percent = targetValue > 0 ? Math.round((currentValue / targetValue) * 100) : 0;
  const unit = priority.unit || "apps / wk";

  // Compute current week range
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const defaultWeekLabel = `Week of ${formatShort(monday)} – ${formatShort(sunday)}, ${now.getFullYear()}`;

  const [weekLabel, setWeekLabel] = useState(defaultWeekLabel);
  const [reflection, setReflection] = useState("");
  const [highlightTag, setHighlightTag] = useState(
    percent >= 100 ? "🎯 Target Met" : percent >= 70 ? "🚀 High Momentum" : "🔄 Steady Progress"
  );

  const handleSave = (e) => {
    e.preventDefault();

    const entry = {
      id: `prog-${Date.now()}`,
      priorityId: priority.id,
      priorityTitle: priority.title,
      pillar: priority.pillar,
      weekLabel,
      date: now.toISOString().split("T")[0],
      valueAchieved: currentValue,
      targetValue,
      unit,
      percent,
      highlightTag,
      reflection: reflection.trim() || `Completed ${currentValue} ${unit}`,
      metricsSnapshot: {
        runwayDays: financials.runwayDays ?? null,
        checkingBal: financials.checkingBal ?? null,
      },
      timestamp: new Date().toISOString(),
    };

    onSaveProgress(entry);
    onClose();
  };

  const TAG_OPTIONS = [
    "🎯 Target Met",
    "🚀 High Momentum",
    "⚡ Breakthrough",
    "💬 Active Interviews",
    "🔄 Steady Progress",
    "🛡️ Defended Floor",
  ];

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
          maxWidth: 520,
          boxShadow: "0 20px 40px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: 24,
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
                {pillar?.name || "Pillar"} Memory
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: `${t.accent}18`,
                  color: t.accent,
                  border: `1px solid ${t.accent}30`,
                }}
              >
                Log Week & Reset
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: t.text }}>
              Log Progress Memory: {priority.title}
            </h3>
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

        {/* Milestone Achievement Callout */}
        <div
          style={{
            background: t.surface2,
            border: `1px solid ${percent >= 100 ? "#10B98140" : t.border2}`,
            borderLeft: `4px solid ${percent >= 100 ? "#10B981" : t.accent}`,
            borderRadius: 8,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 700 }}>
              Week Accomplishment
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text, marginTop: 2 }}>
              {currentValue} <span style={{ fontSize: 13, color: t.textDim, fontWeight: 500 }}>/ {targetValue} {unit}</span>
            </div>
          </div>

          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: 6,
              background: percent >= 100 ? "#10B98120" : `${t.accent}20`,
              color: percent >= 100 ? "#10B981" : t.accent,
            }}
          >
            {percent}% Achieved
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Week Label */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Week Cycle Label
            </label>
            <input
              type="text"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              style={{
                width: "100%",
                marginTop: 4,
                padding: "8px 12px",
                background: t.surface2,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>

          {/* Tag Selection */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Week Milestone Tag
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {TAG_OPTIONS.map((tag) => {
                const isSelected = highlightTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setHighlightTag(tag)}
                    style={{
                      background: isSelected ? `${t.accent}20` : t.surface2,
                      border: `1px solid ${isSelected ? t.accent : t.border2}`,
                      borderRadius: 12,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? t.accent : t.textDim,
                      cursor: "pointer",
                      transition: "all .15s ease",
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reflection / Memory Note */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Reflection & Progress Memory (Optional)
            </label>
            <textarea
              rows={3}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="What worked best? Which leads or opportunities opened up? Any adjustments for next week?"
              style={{
                width: "100%",
                marginTop: 4,
                padding: "9px 12px",
                background: t.surface2,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.text,
                fontSize: 12.5,
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
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
              style={{ fontSize: 12, padding: "7px 18px", display: "flex", alignItems: "center", gap: 6 }}
            >
              <span>💾 Save Memory & Start New Week</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
