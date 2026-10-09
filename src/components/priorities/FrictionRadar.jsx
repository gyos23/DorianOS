import React, { useMemo } from "react";
import { PILLARS, getPillar } from "../../data/priorities.js";

// Helper for resilient project matching across emoji decorations & punctuation
function matchProjectNames(target, candidate) {
  if (!target || !candidate) return false;
  const t = target.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();
  if (t === c || t.includes(c) || c.includes(t)) return true;

  const clean = (s) =>
    s
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")
      .replace(/[^\w\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const cleanT = clean(t);
  const cleanC = clean(c);
  if (cleanT && cleanC && (cleanT.includes(cleanC) || cleanC.includes(cleanT))) {
    return true;
  }
  return false;
}

export function FrictionRadar({
  priorities = [],
  ofProjects = [],
  ofTasks = [],
  pillars = PILLARS,
  onCreateTask,
  onNavigate,
  t,
}) {
  // Analyze stagnation & friction across active priorities
  const stalledPriorities = useMemo(() => {
    const active = priorities.filter((p) => p.status === "active");

    return active
      .map((priority) => {
        // Find matching project
        const targetProjName = (priority.ofProject || "").toLowerCase().trim();
        const matchedProj = ofProjects.find((pr) => {
          return matchProjectNames(targetProjName, pr.name);
        });

        // Find linked open tasks
        const linkedTasks = ofTasks.filter((task) => {
          return matchProjectNames(targetProjName, task.project);
        });

        let reason = null;
        let severity = null;
        let daysStuck = matchedProj?.daysSinceActivity ?? null;

        const isStale = matchedProj?.isStale || matchedProj?.stale;
        const daysSinceAct = matchedProj?.daysSinceActivity;
        const hasRecentActivity = daysSinceAct !== null && daysSinceAct !== undefined && daysSinceAct < 7;

        // If the project had activity within the last 7 days (e.g. tasks completed today!),
        // it has forward momentum and is NOT stagnant.
        if (hasRecentActivity) {
          return null;
        }

        if (isStale) {
          reason = `No OmniFocus activity recorded in ${daysSinceAct} days`;
          severity = daysSinceAct >= 21 ? "critical" : "warning";
          daysStuck = daysSinceAct;
        } else if (!priority.ofProject && priority.currentValue === 0) {
          reason = "Unlinked to OmniFocus project & 0% progress";
          severity = "warning";
          daysStuck = null;
        } else if (linkedTasks.length === 0) {
          if (daysSinceAct !== null && daysSinceAct !== undefined && daysSinceAct >= 7) {
            reason = `Zero open next actions defined in OmniFocus (idle ${daysSinceAct}d)`;
            severity = daysSinceAct >= 21 ? "critical" : "warning";
            daysStuck = daysSinceAct;
          } else if (!matchedProj) {
            reason = "Zero open next actions found in OmniFocus";
            severity = "warning";
            daysStuck = null;
          }
        }

        if (!reason) return null;

        return {
          priority,
          pillar: getPillar(pillars, priority.pillar),
          reason,
          severity,
          daysStuck,
          linkedTasksCount: linkedTasks.length,
          matchedProj,
        };
      })
      .filter(Boolean);
  }, [priorities, ofProjects, ofTasks, pillars]);

  if (stalledPriorities.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${t.surface} 0%, ${t.surface2} 100%)`,
        border: `1px solid ${t.warning}40`,
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, letterSpacing: "-0.01em" }}>
              Friction & Stagnation Radar ({stalledPriorities.length} Bottlenecks Detected)
            </h3>
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
              High-priority commitments with zero forward momentum or inactive OmniFocus projects over the last 14+ days.
            </div>
          </div>
        </div>

        <button
          className="btn"
          onClick={() => onNavigate?.("tasks")}
          style={{ fontSize: 11, padding: "4px 10px", color: t.textDim }}
        >
          Open Task Actions →
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {stalledPriorities.map(({ priority, pillar, reason, severity, daysStuck, matchedProj }) => {
          const isCritical = severity === "critical";

          return (
            <div
              key={priority.id}
              style={{
                background: t.surface,
                border: `1px solid ${isCritical ? t.danger + "40" : t.warning + "40"}`,
                borderLeft: `4px solid ${isCritical ? t.danger : t.warning}`,
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{pillar.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                      {priority.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: pillar.color, fontWeight: 600, marginTop: 1 }}>
                    {pillar.name}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: isCritical ? `${t.danger}18` : `${t.warning}18`,
                    color: isCritical ? t.danger : t.warning,
                    border: `1px solid ${isCritical ? t.danger + "30" : t.warning + "30"}`,
                    textTransform: "uppercase",
                  }}
                >
                  {daysStuck !== null && daysStuck !== undefined ? `Stuck ${daysStuck}d` : "Stagnant"}
                </span>
              </div>

              <div style={{ fontSize: 11, color: t.textSub, background: t.surface2, padding: "6px 8px", borderRadius: 6 }}>
                ⚡ <strong>Friction:</strong> {reason}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                <span style={{ fontSize: 11, color: t.textDim }}>
                  {priority.ofProject ? `Project: ${priority.ofProject}` : "No Project Linked"}
                </span>
                {onCreateTask && priority.ofProject && (
                  <button
                    className="btn"
                    onClick={() => {
                      const actionName = prompt(`Create unstick action for "${priority.title}":`, "Review blockers and outline next 3 steps");
                      if (actionName) {
                        onCreateTask({
                          name: actionName,
                          project: priority.ofProject,
                          flagged: true,
                        });
                      }
                    }}
                    style={{ fontSize: 10, padding: "2px 8px", color: t.accent }}
                  >
                    + Add Next Action
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
