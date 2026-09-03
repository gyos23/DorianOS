import React, { useState, useMemo } from "react";
import { PILLARS } from "../../data/priorities.js";
import { PriorityCard } from "./PriorityCard.jsx";
import { EditPriorityModal } from "./EditPriorityModal.jsx";

export default function PrioritiesTab({
  priorities,
  setPriorities,
  ofTasks = [],
  completeTask,
  toggleFlag,
  t,
}) {
  const [selectedPillar, setSelectedPillar] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState(null);

  const projectList = useMemo(() => {
    return Array.from(new Set(ofTasks.map((t) => t.project).filter(Boolean)));
  }, [ofTasks]);

  const filteredPriorities = useMemo(() => {
    return priorities.filter((p) => {
      const matchPillar = selectedPillar === "all" || p.pillar === selectedPillar;
      const matchStatus = selectedStatus === "all" || p.status === selectedStatus;
      return matchPillar && matchStatus;
    });
  }, [priorities, selectedPillar, selectedStatus]);

  const stats = useMemo(() => {
    const active = priorities.filter((p) => p.status === "active").length;
    const paused = priorities.filter((p) => p.status === "paused").length;
    const completed = priorities.filter((p) => p.status === "completed").length;
    return { active, paused, completed, total: priorities.length };
  }, [priorities]);

  const handleSavePriority = (saved) => {
    setPriorities((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
  };

  const handleUpdatePriority = (updated) => {
    setPriorities((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeletePriority = (id) => {
    setPriorities((prev) => prev.filter((p) => p.id !== id));
  };

  const handleOpenEdit = (priority) => {
    setEditingPriority(priority);
    setModalOpen(true);
  };

  const handleOpenNew = () => {
    setEditingPriority(null);
    setModalOpen(true);
  };

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "24px 20px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header & Stats */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          paddingBottom: 16,
          borderBottom: `1px solid ${t.border2}`,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color: t.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Strategic Ventures & Quarterly Priorities
          </h1>
          <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
            Direct bridge between 5 life pillars, SMART quarterly milestones, and OmniFocus execution.
          </div>
        </div>

        <button className="btn active" onClick={handleOpenNew} style={{ fontSize: 12, padding: "6px 14px" }}>
          + New Priority
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Active Goals</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981", marginTop: 2 }}>{stats.active}</div>
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Completed</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#3B82F6", marginTop: 2 }}>{stats.completed}</div>
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Project Backlog</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#F59E0B", marginTop: 2 }}>{stats.paused}</div>
        </div>
      </div>

      {/* Filters: Pillar chips & Status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Pillar Filter Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            className={`btn ${selectedPillar === "all" ? "active" : ""}`}
            onClick={() => setSelectedPillar("all")}
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            All Pillars
          </button>
          {Object.values(PILLARS).map((pillar) => (
            <button
              key={pillar.id}
              className={`btn ${selectedPillar === pillar.id ? "active" : ""}`}
              onClick={() => setSelectedPillar(pillar.id)}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderColor: selectedPillar === pillar.id ? pillar.color : "",
                color: selectedPillar === pillar.id ? pillar.color : t.textDim,
              }}
            >
              {pillar.icon} {pillar.name}
            </button>
          ))}
        </div>

        {/* Status Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[
            ["active", "Active"],
            ["paused", "Backlog"],
            ["completed", "Completed"],
            ["all", "All"],
          ].map(([status, label]) => (
            <button
              key={status}
              className={`btn ${selectedStatus === status ? "active" : ""}`}
              onClick={() => setSelectedStatus(status)}
              style={{ fontSize: 11, padding: "3px 8px" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Priorities Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
          gap: 18,
          alignItems: "start",
        }}
      >
        {filteredPriorities.map((priority) => (
          <PriorityCard
            key={priority.id}
            priority={priority}
            ofTasks={ofTasks}
            onUpdatePriority={handleUpdatePriority}
            onEditPriority={handleOpenEdit}
            onDeletePriority={handleDeletePriority}
            onCompleteTask={completeTask}
            onToggleFlag={toggleFlag}
            t={t}
          />
        ))}

        {filteredPriorities.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "48px 20px",
              color: t.textDim,
              background: t.surface,
              borderRadius: 12,
              border: `1px dashed ${t.border2}`,
            }}
          >
            No priorities match the current filter.
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      <EditPriorityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePriority}
        priorityToEdit={editingPriority}
        projectList={projectList}
        t={t}
      />
    </div>
  );
}
