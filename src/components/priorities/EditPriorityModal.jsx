import React, { useState, useEffect } from "react";
import { PILLARS } from "../../data/priorities.js";

export function EditPriorityModal({
  isOpen,
  onClose,
  onSave,
  priorityToEdit,
  projectList = [],
  t,
}) {
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    pillar: "forward",
    ofProject: "",
    status: "active",
    metricType: "counter",
    currentValue: 0,
    targetValue: 100,
    unit: "units",
    targetDate: "",
    notes: "",
    smart: {
      specific: "",
      measurable: "",
      achievable: "",
      relevant: "",
      timeBound: "",
    },
  });

  useEffect(() => {
    if (priorityToEdit) {
      setFormData({
        ...priorityToEdit,
        smart: {
          specific: priorityToEdit.smart?.specific || "",
          measurable: priorityToEdit.smart?.measurable || "",
          achievable: priorityToEdit.smart?.achievable || "",
          relevant: priorityToEdit.smart?.relevant || "",
          timeBound: priorityToEdit.smart?.timeBound || "",
        },
      });
    } else {
      setFormData({
        id: "p-" + Date.now(),
        title: "",
        pillar: "forward",
        ofProject: "",
        status: "active",
        metricType: "counter",
        currentValue: 0,
        targetValue: 50,
        unit: "tasks",
        targetDate: "",
        notes: "",
        smart: {
          specific: "",
          measurable: "",
          achievable: "",
          relevant: "",
          timeBound: "",
        },
      });
    }
  }, [priorityToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onSave({
      ...formData,
      currentValue: parseFloat(formData.currentValue) || 0,
      targetValue: parseFloat(formData.targetValue) || 0,
    });
    onClose();
  };

  const updateSmart = (field, val) => {
    setFormData((p) => ({
      ...p,
      smart: { ...p.smart, [field]: val },
    }));
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
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color: t.text,
              margin: 0,
            }}
          >
            {priorityToEdit ? "Edit Strategic Priority" : "New Quarterly Priority"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: t.textDim,
              fontSize: 20,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
              Priority Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Find Next Role, Sell 300 Planners..."
              style={{
                width: "100%",
                padding: "8px 12px",
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderRadius: 7,
                color: t.text,
                fontSize: 14,
                marginTop: 4,
                outline: "none",
              }}
            />
          </div>

          {/* Pillar & Status */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Pillar
              </label>
              <select
                value={formData.pillar}
                onChange={(e) => setFormData({ ...formData, pillar: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 7,
                  color: t.text,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {Object.values(PILLARS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 7,
                  color: t.text,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                <option value="active">🟢 Active</option>
                <option value="paused">⏸ Paused / Backlog</option>
                <option value="completed">✅ Completed</option>
                <option value="dropped">🚫 Dropped</option>
              </select>
            </div>
          </div>

          {/* Linked OmniFocus Project */}
          <div>
            <label style={{ fontSize: 11, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
              Linked OmniFocus Project
            </label>
            <input
              type="text"
              list="of-projects-list"
              value={formData.ofProject}
              onChange={(e) => setFormData({ ...formData, ofProject: e.target.value })}
              placeholder="Select or enter matching OF project name..."
              style={{
                width: "100%",
                padding: "8px 12px",
                background: t.surface2,
                border: `1px solid ${t.border2}`,
                borderRadius: 7,
                color: t.text,
                fontSize: 13,
                marginTop: 4,
                outline: "none",
              }}
            />
            <datalist id="of-projects-list">
              {projectList.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          {/* Metric Tracking: Current, Target, Unit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Current
              </label>
              <input
                type="number"
                value={formData.currentValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 6,
                  color: t.text,
                  fontSize: 13,
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Target
              </label>
              <input
                type="number"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 6,
                  color: t.text,
                  fontSize: 13,
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Unit Label
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="apps, units..."
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 6,
                  color: t.text,
                  fontSize: 13,
                  marginTop: 4,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                Target Date
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 6,
                  color: t.text,
                  fontSize: 12,
                  marginTop: 4,
                }}
              />
            </div>
          </div>

          {/* SMART Goal Breakdown */}
          <div
            style={{
              background: t.surface2,
              border: `1px solid ${t.border2}`,
              borderRadius: 8,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: t.accent, textTransform: "uppercase", letterSpacing: ".08em" }}>
              SMART Goal Framework
            </div>

            <div>
              <label style={{ fontSize: 10, color: t.textDim, fontWeight: 600 }}>Specific</label>
              <textarea
                rows={2}
                value={formData.smart.specific}
                onChange={(e) => updateSmart("specific", e.target.value)}
                placeholder="What exact outcome will be accomplished?"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 5,
                  color: t.text,
                  fontSize: 12,
                  marginTop: 2,
                  resize: "vertical",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 10, color: t.textDim, fontWeight: 600 }}>Measurable</label>
              <textarea
                rows={2}
                value={formData.smart.measurable}
                onChange={(e) => updateSmart("measurable", e.target.value)}
                placeholder="How will success be measured and verified?"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 5,
                  color: t.text,
                  fontSize: 12,
                  marginTop: 2,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: t.textDim, fontWeight: 600 }}>Achievable</label>
                <input
                  type="text"
                  value={formData.smart.achievable}
                  onChange={(e) => updateSmart("achievable", e.target.value)}
                  placeholder="Is it realistic with current resources?"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: t.surface,
                    border: `1px solid ${t.border2}`,
                    borderRadius: 5,
                    color: t.text,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, color: t.textDim, fontWeight: 600 }}>Relevant</label>
                <input
                  type="text"
                  value={formData.smart.relevant}
                  onChange={(e) => updateSmart("relevant", e.target.value)}
                  placeholder="Why does this matter right now?"
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    background: t.surface,
                    border: `1px solid ${t.border2}`,
                    borderRadius: 5,
                    color: t.text,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, color: t.textDim, fontWeight: 600 }}>Time-Bound</label>
              <input
                type="text"
                value={formData.smart.timeBound}
                onChange={(e) => updateSmart("timeBound", e.target.value)}
                placeholder="Review cycles, deadlines, checkpoints..."
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 5,
                  color: t.text,
                  fontSize: 12,
                  marginTop: 2,
                }}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn active">
              {priorityToEdit ? "Save Changes" : "Create Priority"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
