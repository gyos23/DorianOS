import React, { useState } from "react";
import { fmt } from "../../utils/formatters.js";

export function ReviewHistoryTracker({ reviewHistory = [], setReviewHistory, t }) {
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  // Filter weekly reviews
  const weeklyReviews = reviewHistory.filter((r) => !r.cadence || r.cadence === "weekly");

  // Calculate commitment stats across weekly reviews
  let totalCommitments = 0;
  let completedCommitments = 0;

  weeklyReviews.forEach((r) => {
    const commitments = r.commitmentsEvaluated || {};
    [1, 2, 3].forEach((idx) => {
      if (r.notes?.[`topCommitment${idx}`]) {
        totalCommitments++;
        if (commitments[idx] === true || commitments[idx] === "done") {
          completedCommitments++;
        }
      }
    });
  });

  const completionRate = totalCommitments > 0 ? Math.round((completedCommitments / totalCommitments) * 100) : 100;

  const toggleCommitmentStatus = (entryId, commitmentIdx) => {
    setReviewHistory?.((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        const current = entry.commitmentsEvaluated || {};
        const isDone = current[commitmentIdx] === true || current[commitmentIdx] === "done";
        return {
          ...entry,
          commitmentsEvaluated: {
            ...current,
            [commitmentIdx]: !isDone,
          },
        };
      })
    );
  };

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border2}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📈</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, letterSpacing: "-0.01em" }}>
              Commitment Velocity & Review History
            </h3>
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 2 }}>
              Track accountability and sprint execution reliability over time.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              background: t.surface2,
              border: `1px solid ${t.border2}`,
              borderRadius: 8,
              padding: "6px 12px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 700 }}>
              Reviews Logged
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, marginTop: 1 }}>
              {reviewHistory.length}
            </div>
          </div>

          <div
            style={{
              background: `${t.accent}12`,
              border: `1px solid ${t.accent}30`,
              borderRadius: 8,
              padding: "6px 12px",
              textAlign: "right",
            }}
          >
            <div style={{ fontSize: 9, color: t.accent, textTransform: "uppercase", fontWeight: 700 }}>
              Commitment Kept Rate
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.accent, marginTop: 1 }}>
              {totalCommitments > 0 ? `${completionRate}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Review Streak & Timeline Grid */}
      {reviewHistory.length === 0 ? (
        <div
          style={{
            background: t.surface2,
            border: `1px dashed ${t.border2}`,
            borderRadius: 8,
            padding: "24px 16px",
            textAlign: "center",
            color: t.textDim,
            fontSize: 13,
          }}
        >
          No completed reviews archived yet. Complete your current review steps and click <strong>"Archive & Begin Next Cycle"</strong> to track commitment velocity!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviewHistory.slice(0, 8).map((rev) => {
            const isWeekly = !rev.cadence || rev.cadence === "weekly";
            const comms = [
              rev.notes?.topCommitment1,
              rev.notes?.topCommitment2,
              rev.notes?.topCommitment3,
            ].filter(Boolean);

            const isExpanded = selectedEntryId === rev.id;

            return (
              <div
                key={rev.id}
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedEntryId(isExpanded ? null : rev.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background:
                          rev.cadence === "quarterly"
                            ? "#8B5CF622"
                            : rev.cadence === "monthly"
                            ? "#3B82F622"
                            : `${t.accent}22`,
                        color:
                          rev.cadence === "quarterly"
                            ? "#A78BFA"
                            : rev.cadence === "monthly"
                            ? "#60A5FA"
                            : t.accent,
                      }}
                    >
                      {rev.cadence || "Weekly"}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
                      {rev.date}
                    </span>
                    {rev.notes?.win && (
                      <span
                        style={{
                          fontSize: 12,
                          color: t.textSub,
                          maxWidth: 320,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        • 🏆 {rev.notes.win}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {rev.cashSnapshot && (
                      <span style={{ fontSize: 11, color: t.textDim }}>
                        Cash: <strong>{fmt(rev.cashSnapshot)}</strong>
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: t.textDim }}>
                      {isExpanded ? "▲ Hide" : "▼ Details"}
                    </span>
                  </div>
                </div>

                {/* Commitments & Details */}
                {isWeekly && comms.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      marginTop: 4,
                      paddingTop: 8,
                      borderTop: `1px solid ${t.border2}`,
                    }}
                  >
                    <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 700 }}>
                      Weekly Commitments Execution:
                    </div>
                    {comms.map((commText, idx) => {
                      const commNum = idx + 1;
                      const isDone =
                        rev.commitmentsEvaluated?.[commNum] === true ||
                        rev.commitmentsEvaluated?.[commNum] === "done";

                      return (
                        <div
                          key={commNum}
                          onClick={() => toggleCommitmentStatus(rev.id, commNum)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            color: isDone ? t.textDim : t.text,
                            textDecoration: isDone ? "line-through" : "none",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!isDone}
                            onChange={() => {}}
                            style={{ cursor: "pointer", accentColor: t.accent }}
                          />
                          <span>{commText}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontSize: 12,
                      background: t.surface,
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${t.border2}`,
                    }}
                  >
                    {rev.notes?.blocker && (
                      <div>
                        <strong style={{ color: t.danger }}>Blocker Encountered:</strong> {rev.notes.blocker}
                      </div>
                    )}
                    {rev.notes?.spendObservations && (
                      <div>
                        <strong>Spend Observations:</strong> {rev.notes.spendObservations}
                      </div>
                    )}
                    {rev.notes?.nextQuarterNorthStar && (
                      <div>
                        <strong>North Star Theme:</strong> {rev.notes.nextQuarterNorthStar}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
