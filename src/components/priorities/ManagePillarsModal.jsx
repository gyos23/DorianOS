import React, { useState, useEffect } from "react";
import { INITIAL_PILLARS } from "../../data/priorities.js";

const PRESET_ICONS = ["🔴", "🟢", "⚪️", "🔵", "🟣", "🟡", "🟠", "⭐", "🚀", "💡", "🛡️", "🌿", "🏆", "💎", "⚡"];
const PRESET_COLORS = [
  "#EF4444", "#22C55E", "#94A3B8", "#3B82F6", "#A855F7",
  "#F59E0B", "#F97316", "#EC4899", "#06B6D4", "#10B981"
];

export function ManagePillarsModal({
  isOpen,
  onClose,
  pillars = {},
  onSavePillars,
  t,
}) {
  const [editingList, setEditingList] = useState([]);
  const [selectedPillarId, setSelectedPillarId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const list = Object.values(pillars || INITIAL_PILLARS);
      setEditingList(list);
      setSelectedPillarId(list[0]?.id || null);
    }
  }, [isOpen, pillars]);

  if (!isOpen) return null;

  const currentPillar = editingList.find((p) => p.id === selectedPillarId) || editingList[0];

  const handleUpdateCurrent = (field, val) => {
    if (!currentPillar) return;
    setEditingList((prev) =>
      prev.map((p) => {
        if (p.id === currentPillar.id) {
          const updated = { ...p, [field]: val };
          if (field === "color") {
            updated.bg = `${val}18`;
          }
          return updated;
        }
        return p;
      })
    );
  };

  const handleAddNewPillar = () => {
    const newId = "pillar_" + Date.now().toString(36);
    const newPillar = {
      id: newId,
      name: "New Life Pillar",
      icon: "⭐",
      color: "#06B6D4",
      bg: "#06B6D418",
      description: "Define the vision and core standards for this pillar.",
    };
    setEditingList((prev) => [...prev, newPillar]);
    setSelectedPillarId(newId);
  };

  const handleDeletePillar = (id) => {
    if (editingList.length <= 1) {
      alert("At least one pillar must remain active.");
      return;
    }
    if (window.confirm("Delete this pillar? Any associated priorities will display as Custom.")) {
      const remaining = editingList.filter((p) => p.id !== id);
      setEditingList(remaining);
      setSelectedPillarId(remaining[0]?.id || null);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm("Reset all pillars to default 5 foundational pillars (Freedom, Finance, Forward, Fortitude, Family)?")) {
      const defaults = Object.values(INITIAL_PILLARS);
      setEditingList(defaults);
      setSelectedPillarId(defaults[0]?.id || null);
    }
  };

  const handleSave = () => {
    const map = {};
    for (const p of editingList) {
      if (p.id && p.name.trim()) {
        map[p.id] = {
          ...p,
          name: p.name.trim(),
          bg: p.bg || `${p.color}18`,
        };
      }
    }
    onSavePillars(map);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border2}`,
          borderRadius: 14,
          width: "100%",
          maxWidth: 720,
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: t.text,
                fontFamily: "'Plus Jakarta Sans',sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🏛️</span>
              <span>Manage & Update Life Pillars</span>
            </h3>
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 3 }}>
              Configure your core pillars, colors, icons, and overarching definitions.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 22,
              color: t.textDim,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Pillar Selector Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            borderBottom: `1px solid ${t.border2}`,
          }}
        >
          {editingList.map((p) => {
            const isSelected = p.id === currentPillar?.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPillarId(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? p.bg || `${p.color}22` : t.surface2,
                  color: isSelected ? p.color : t.textSub,
                  border: `1.5px solid ${isSelected ? p.color : t.border2}`,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span>{p.icon}</span>
                <span>{p.name || "Untitled"}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="btn"
            onClick={handleAddNewPillar}
            style={{ fontSize: 11, padding: "5px 10px", whiteSpace: "nowrap" }}
            title="Add a new custom life pillar"
          >
            + Add Pillar
          </button>
        </div>

        {/* Selected Pillar Editor */}
        {currentPillar && (
          <div
            style={{
              background: t.surface2,
              border: `1px solid ${t.border2}`,
              borderLeft: `4px solid ${currentPillar.color}`,
              borderRadius: 10,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{currentPillar.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: currentPillar.color }}>
                  Editing: {currentPillar.name}
                </span>
              </div>
              {editingList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeletePillar(currentPillar.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: t.danger,
                    fontSize: 11,
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  🗑 Remove Pillar
                </button>
              )}
            </div>

            {/* Name & Icon Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Pillar Name
                </label>
                <input
                  type="text"
                  value={currentPillar.name}
                  onChange={(e) => handleUpdateCurrent("name", e.target.value)}
                  placeholder="e.g. Freedom, Finance, Vitality..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: t.surface,
                    border: `1px solid ${t.border2}`,
                    borderRadius: 6,
                    color: t.text,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Icon Emoji
                </label>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input
                    type="text"
                    value={currentPillar.icon}
                    onChange={(e) => handleUpdateCurrent("icon", e.target.value)}
                    style={{
                      width: 50,
                      textAlign: "center",
                      padding: "8px",
                      background: t.surface,
                      border: `1px solid ${t.border2}`,
                      borderRadius: 6,
                      color: t.text,
                      fontSize: 16,
                    }}
                  />
                  <div style={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
                    {PRESET_ICONS.slice(0, 5).map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => handleUpdateCurrent("icon", ic)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "2px" }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Color Accent Picker */}
            <div>
              <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Theme Color
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input
                  type="color"
                  value={currentPillar.color}
                  onChange={(e) => handleUpdateCurrent("color", e.target.value)}
                  style={{
                    width: 36,
                    height: 32,
                    borderRadius: 6,
                    border: `1px solid ${t.border2}`,
                    background: "none",
                    cursor: "pointer",
                  }}
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdateCurrent("color", c)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: c,
                        border: currentPillar.color === c ? `2px solid ${t.text}` : "none",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Strategic Definition & Vision
              </label>
              <textarea
                rows={2}
                value={currentPillar.description || ""}
                onChange={(e) => handleUpdateCurrent("description", e.target.value)}
                placeholder="What does excellence look like in this life domain?"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 6,
                  color: t.text,
                  fontSize: 12,
                  marginTop: 4,
                  resize: "vertical",
                }}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTop: `1px solid ${t.border2}`,
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={handleResetToDefaults}
            style={{ fontSize: 11, padding: "5px 10px", color: t.textDim }}
          >
            Reset to Defaults
          </button>

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
              type="button"
              className="btn active"
              onClick={handleSave}
              style={{ fontSize: 12, padding: "6px 16px" }}
            >
              Save Pillars
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
