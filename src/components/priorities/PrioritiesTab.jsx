import React, { useState, useMemo } from "react";
import { PILLARS, getPillar } from "../../data/priorities.js";
import { PriorityCard } from "./PriorityCard.jsx";
import { EditPriorityModal } from "./EditPriorityModal.jsx";
import { ManagePillarsModal } from "./ManagePillarsModal.jsx";
import { FrictionRadar } from "./FrictionRadar.jsx";
import { ofDueLabel } from "../../utils/dates.js";
import { matchProjectNames } from "../../utils/projectMatcher.js";

export default function PrioritiesTab({
  priorities = [],
  setPriorities,
  progressHistory = [],
  onLogWeekProgress,
  ofTasks = [],
  ofProjects = [],
  fetchOFProjects,
  updateProjectNote,
  completeTask,
  toggleFlag,
  onCreateTask,
  pillars = PILLARS,
  setPillars,
  cashZeroDate,
  startBal,
  checkingBal,
  t,
}) {
  const [selectedPillar, setSelectedPillar] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("active");
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "matrix"
  const [modalOpen, setModalOpen] = useState(false);
  const [pillarsModalOpen, setPillarsModalOpen] = useState(false);
  const [editingPriority, setEditingPriority] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [matrixNewTasks, setMatrixNewTasks] = useState({});

  const projectList = useMemo(() => {
    return Array.from(
      new Set([
        ...(ofProjects || []).map((p) => p.name),
        ...(ofTasks || []).map((t) => t.project),
      ].filter(Boolean))
    );
  }, [ofProjects, ofTasks]);

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

  const syncNotesFromOF = async () => {
    if (!fetchOFProjects) return;
    setSyncStatus("Syncing…");
    try {
      const ofProjs = await fetchOFProjects();
      if (!ofProjs || ofProjs.length === 0) {
        setSyncStatus("No OF projects");
        setTimeout(() => setSyncStatus(null), 3000);
        return;
      }

      let updatedCount = 0;
      setPriorities((prev) =>
        prev.map((priority) => {
          if (!priority.ofProject) return priority;
          const match = ofProjs.find((p) => matchProjectNames(priority.ofProject, p.name));

          if (!match || !match.note) return priority;

          const noteText = match.note;
          const parseField = (regex) => {
            const m = noteText.match(regex);
            return m ? m[1].trim() : null;
          };

          const specific = parseField(/(?:Specific|specific):\s*([^\n\r]+)/i);
          const measurable = parseField(/(?:Measurable|measurable):\s*([^\n\r]+)/i);
          const achievable = parseField(/(?:Achievable|achievable):\s*([^\n\r]+)/i);
          const relevant = parseField(/(?:Relevant|relevant):\s*([^\n\r]+)/i);
          const timeBound = parseField(/(?:Time-Bound|Time-bound|timebound|time-bound):\s*([^\n\r]+)/i);

          const newSmart = { ...(priority.smart || {}) };
          if (specific) newSmart.specific = specific;
          if (measurable) newSmart.measurable = measurable;
          if (achievable) newSmart.achievable = achievable;
          if (relevant) newSmart.relevant = relevant;
          if (timeBound) newSmart.timeBound = timeBound;

          updatedCount++;
          return {
            ...priority,
            notes: noteText,
            smart: newSmart,
          };
        })
      );

      setSyncStatus(`✓ Synced ${updatedCount} note(s)!`);
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (err) {
      console.error("Sync notes failed:", err);
      setSyncStatus("Sync error");
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  const handleSavePriority = async (saved) => {
    setPriorities((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    if (saved.updateInOmniFocus && saved.ofProject && updateProjectNote) {
      const smart = saved.smart || {};
      const noteParts = [
        smart.specific ? `Specific: ${smart.specific}` : "",
        smart.measurable ? `Measurable: ${smart.measurable}` : "",
        smart.achievable ? `Achievable: ${smart.achievable}` : "",
        smart.relevant ? `Relevant: ${smart.relevant}` : "",
        smart.timeBound ? `Time-Bound: ${smart.timeBound}` : "",
        saved.notes && !saved.notes.includes("Specific:") ? `\n${saved.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await updateProjectNote(saved.ofProject, noteParts);
    }
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

  // Helper to get linked tasks for a priority
  const getLinkedTasks = (priority) => {
    if (!priority.ofProject) return [];
    const projName = priority.ofProject.toLowerCase().trim();
    return ofTasks.filter((task) => {
      const taskProj = (task.project || "").toLowerCase().trim();
      return (
        taskProj === projName ||
        taskProj.includes(projName) ||
        projName.includes(taskProj)
      );
    });
  };

  const activePillarsList = Object.values(pillars || PILLARS);

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
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color: t.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Strategic Ventures & Life Pillars
          </h1>
          <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
            Direct bridge between life pillars, SMART quarterly milestones, and open OmniFocus action items.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={syncNotesFromOF}
            disabled={syncStatus === "Syncing…"}
            style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 4 }}
          >
            <span>↻</span>
            <span>{syncStatus || "Sync Notes from OmniFocus"}</span>
          </button>

          <button
            className="btn"
            onClick={() => setPillarsModalOpen(true)}
            style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}
            title="Edit life pillar names, vision, icons, and colors"
          >
            <span>🏛️</span>
            <span>Update Pillars</span>
          </button>

          <button className="btn active" onClick={handleOpenNew} style={{ fontSize: 12, padding: "6px 14px" }}>
            + New Priority
          </button>
        </div>
      </div>

      {/* KPI Stat Cards & View Mode Switcher */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, flex: 1 }}>
          <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Active Goals</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10B981", marginTop: 2 }}>{stats.active}</div>
          </div>
          <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Completed</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#3B82F6", marginTop: 2 }}>{stats.completed}</div>
          </div>
          <div style={{ background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>Project Backlog</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F59E0B", marginTop: 2 }}>{stats.paused}</div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: "flex", background: t.surface2, padding: 3, borderRadius: 8, border: `1px solid ${t.border2}` }}>
          <button
            type="button"
            className={`btn ${viewMode === "cards" ? "active" : ""}`}
            onClick={() => setViewMode("cards")}
            style={{ fontSize: 11, padding: "4px 10px", border: "none" }}
          >
            🗂️ Cards View
          </button>
          <button
            type="button"
            className={`btn ${viewMode === "matrix" ? "active" : ""}`}
            onClick={() => setViewMode("matrix")}
            style={{ fontSize: 11, padding: "4px 10px", border: "none" }}
          >
            📋 Open Tasks by Pillar
          </button>
        </div>
      </div>

      {/* Friction & Stagnation Radar */}
      <FrictionRadar
        priorities={priorities}
        ofProjects={ofProjects}
        ofTasks={ofTasks}
        pillars={pillars}
        onCreateTask={onCreateTask}
        t={t}
      />

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
          {activePillarsList.map((pillar) => (
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

      {/* VIEW 1: Grid Cards View */}
      {viewMode === "cards" && (
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
              ofProjects={ofProjects}
              progressHistory={progressHistory}
              onLogWeekProgress={onLogWeekProgress}
              onUpdatePriority={handleUpdatePriority}
              onEditPriority={handleOpenEdit}
              onDeletePriority={handleDeletePriority}
              onCompleteTask={completeTask}
              onToggleFlag={toggleFlag}
              onCreateTask={onCreateTask}
              pillars={pillars}
              cashZeroDate={cashZeroDate}
              startBal={startBal}
              checkingBal={checkingBal}
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
      )}

      {/* VIEW 2: Open Tasks Grouped under Pillars & Priorities */}
      {viewMode === "matrix" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {activePillarsList
            .filter((pil) => selectedPillar === "all" || pil.id === selectedPillar)
            .map((pillar) => {
              const pillarPriorities = filteredPriorities.filter((p) => p.pillar === pillar.id);
              if (pillarPriorities.length === 0 && selectedPillar !== "all") {
                return (
                  <div key={pillar.id} style={{ color: t.textDim, padding: 16 }}>
                    No priorities under {pillar.name}.
                  </div>
                );
              }
              if (pillarPriorities.length === 0) return null;

              return (
                <div
                  key={pillar.id}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border2}`,
                    borderLeft: `4px solid ${pillar.color}`,
                    borderRadius: 12,
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {/* Pillar Banner */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{pillar.icon}</span>
                      <div>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: pillar.color, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                          {pillar.name}
                        </h2>
                        {pillar.description && (
                          <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>{pillar.description}</div>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: t.textDim, fontWeight: 600 }}>
                      {pillarPriorities.length} {pillarPriorities.length === 1 ? "Priority" : "Priorities"}
                    </span>
                  </div>

                  {/* Priorities under this pillar */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {pillarPriorities.map((p) => {
                      const linked = getLinkedTasks(p);
                      const inputVal = matrixNewTasks[p.id] || "";

                      return (
                        <div
                          key={p.id}
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
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{p.title}</span>
                              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: p.status === "active" ? "#10B98120" : "#F59E0B20", color: p.status === "active" ? "#10B981" : "#F59E0B", fontWeight: 600 }}>
                                {p.status}
                              </span>
                              <span style={{ fontSize: 11, color: t.textDim }}>
                                Metric: {p.currentValue} / {p.targetValue} {p.unit}
                              </span>
                            </div>

                            <button
                              className="btn"
                              onClick={() => handleOpenEdit(p)}
                              style={{ fontSize: 10, padding: "2px 8px" }}
                            >
                              ✎ Edit Priority
                            </button>
                          </div>

                          {/* Open Tasks List */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 6 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: t.textDim, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
                              Open Execution Tasks ({linked.length})
                            </div>

                            {linked.map((task) => {
                              const due = ofDueLabel(task.dueDate);
                              const dueColor = {
                                overdue: t.danger,
                                today: t.warning,
                                soon: t.accentSub,
                                upcoming: t.textDim,
                                nodate: t.textDim,
                              }[due];

                              return (
                                <div
                                  key={task.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "6px 10px",
                                    background: t.surface,
                                    border: `1px solid ${t.border3}`,
                                    borderRadius: 6,
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                    <button
                                      type="button"
                                      onClick={() => completeTask?.(task.id)}
                                      title="Mark task completed"
                                      style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: "50%",
                                        border: `1.5px solid ${t.border3}`,
                                        background: "transparent",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 9,
                                        color: t.accent,
                                        padding: 0,
                                        flexShrink: 0,
                                      }}
                                    >
                                      ✓
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => toggleFlag?.(task.id, !task.flagged)}
                                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, opacity: task.flagged ? 1 : 0.25 }}
                                    >
                                      {task.flagged ? "🚩" : "⚐"}
                                    </button>

                                    <span style={{ color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {task.name}
                                    </span>
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                    {task.dueDate && (
                                      <span style={{ fontSize: 10, color: dueColor }}>📅 {task.dueDate}</span>
                                    )}
                                    <a
                                      href={`omnifocus:///task/${task.id}`}
                                      style={{ fontSize: 10, color: t.textDim, textDecoration: "none" }}
                                    >
                                      ↗
                                    </a>
                                  </div>
                                </div>
                              );
                            })}

                            {linked.length === 0 && (
                              <div style={{ fontSize: 11, color: t.textDim, fontStyle: "italic", padding: "4px 0" }}>
                                No open tasks linked to this priority yet.
                              </div>
                            )}

                            {/* Quick Add Task Field */}
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (!inputVal.trim()) return;
                                onCreateTask?.({
                                  name: inputVal.trim(),
                                  project: p.ofProject || `🎯 ${p.title}`,
                                  flagged: false,
                                });
                                setMatrixNewTasks((prev) => ({ ...prev, [p.id]: "" }));
                              }}
                              style={{ display: "flex", gap: 6, marginTop: 4 }}
                            >
                              <input
                                type="text"
                                placeholder={`+ Add open task under ${p.title}…`}
                                value={inputVal}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMatrixNewTasks((prev) => ({ ...prev, [p.id]: val }));
                                }}
                                style={{
                                  flex: 1,
                                  padding: "5px 10px",
                                  fontSize: 11,
                                  background: t.surface,
                                  border: `1px solid ${t.border2}`,
                                  borderRadius: 5,
                                  color: t.text,
                                }}
                              />
                              <button
                                type="submit"
                                disabled={!inputVal.trim()}
                                className="btn active"
                                style={{ fontSize: 11, padding: "4px 10px" }}
                              >
                                + Add Task
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Edit / Create Priority Modal */}
      <EditPriorityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSavePriority}
        priorityToEdit={editingPriority}
        projectList={projectList}
        pillars={pillars}
        t={t}
      />

      {/* Manage Life Pillars Modal */}
      <ManagePillarsModal
        isOpen={pillarsModalOpen}
        onClose={() => setPillarsModalOpen(false)}
        pillars={pillars}
        onSavePillars={(newPillars) => setPillars?.(newPillars)}
        t={t}
      />
    </div>
  );
}
