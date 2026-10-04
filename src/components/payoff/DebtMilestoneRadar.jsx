import React from "react";
import { fmt } from "../../utils/formatters.js";

export function DebtMilestoneRadar({ accounts = [], strategy = "avalanche", extraPayment = 500, t }) {
  const now = new Date();

  // Filter and sort accounts by when they are paid off
  const milestones = accounts
    .filter((a) => a.balance > 0)
    .map((a) => {
      const monthOffset = a.paidOffMonth ?? 999;
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      return {
        ...a,
        monthOffset,
        targetDate,
        targetFormatted:
          a.paidOffMonth !== null
            ? targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : "30+ yrs",
        isPaid: a.remaining <= 0.005,
      };
    })
    .sort((a, b) => a.monthOffset - b.monthOffset);

  const nextMilestone = milestones.find((m) => !m.isPaid && m.paidOffMonth !== null);
  const totalMonthlyBudget = accounts.reduce((s, a) => s + (a.minPayment || 0), 0) + extraPayment;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero: Next Victory In Sight */}
      {nextMilestone ? (
        <div
          style={{
            background: `linear-gradient(135deg, ${t.surface} 0%, ${t.surface2} 100%)`,
            border: `1px solid ${t.accent}40`,
            borderRadius: 12,
            padding: "20px 24px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -15,
              right: -15,
              fontSize: 80,
              opacity: 0.07,
              userSelect: "none",
            }}
          >
            🎯
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: `${t.accent}18`,
                  border: `1px solid ${t.accent}30`,
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.accent,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  marginBottom: 8,
                }}
              >
                <span>⚡ Next Debt Elimination Target</span>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  color: t.text,
                  letterSpacing: "-0.02em",
                }}
              >
                {nextMilestone.name}
              </h2>
              <div style={{ fontSize: 13, color: t.textSub, marginTop: 4 }}>
                Current balance: <strong style={{ color: t.danger }}>{fmt(nextMilestone.balance)}</strong> at{" "}
                <strong>{nextMilestone.apr}% APR</strong>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 10,
                  padding: "12px 18px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".08em" }}>
                  Estimated Clearance
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.accent, marginTop: 2 }}>
                  {nextMilestone.targetFormatted}
                </div>
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                  ~{nextMilestone.monthOffset} {nextMilestone.monthOffset === 1 ? "month" : "months"} away
                </div>
              </div>

              <div
                style={{
                  background: `${t.accentSub}15`,
                  border: `1px solid ${t.accentSub}30`,
                  borderRadius: 10,
                  padding: "12px 18px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 700, letterSpacing: ".08em" }}>
                  Snowball Cashflow Unlocked
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: t.accentSub, marginTop: 2 }}>
                  +{fmt(nextMilestone.minPayment)}/mo
                </div>
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                  rolls into next card
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border2}`,
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
            color: t.accent,
            fontWeight: 700,
          }}
        >
          🎉 Congratulations! All scheduled debt balances are completely paid off!
        </div>
      )}

      {/* Snowball Rollover Cascade Pipeline */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🏔️</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: t.text, letterSpacing: "-0.01em" }}>
                Debt Snowball Payoff Ladder ({strategy.toUpperCase()} Sequence)
              </h3>
            </div>
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
              As each account is eradicated, its monthly payment automatically cascades into the next target.
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: t.textSub,
              background: t.surface2,
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid ${t.border2}`,
            }}
          >
            Monthly Firepower: {fmt(totalMonthlyBudget)}
          </div>
        </div>

        {/* Milestone Steps Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {milestones.map((acc, idx) => {
            const isNext = nextMilestone && nextMilestone.id === acc.id;
            return (
              <div
                key={acc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: isNext ? `${t.accent}0d` : t.surface2,
                  border: isNext ? `1.5px solid ${t.accent}` : `1px solid ${t.border2}`,
                  transition: "all .15s ease",
                }}
              >
                {/* Step badge */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: isNext ? t.accent : t.surface,
                    color: isNext ? "#0f1117" : t.textSub,
                    border: `1px solid ${isNext ? t.accent : t.border2}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  #{idx + 1}
                </div>

                {/* Account Details */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: t.text }}>
                      {acc.name}
                    </span>
                    {isNext && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: t.accent,
                          color: "#0f1117",
                          padding: "1px 6px",
                          borderRadius: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        Target
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                    APR: <strong>{acc.apr}%</strong> • Min Pmt: <strong>{fmt(acc.minPayment)}/mo</strong>
                  </div>
                </div>

                {/* Balance & Progress */}
                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: t.danger }}>
                    {fmt(acc.balance)}
                  </div>
                  <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
                    {acc.isPaid ? "Paid Off" : "Principal remaining"}
                  </div>
                </div>

                {/* Clearance Date Pill */}
                <div
                  style={{
                    minWidth: 140,
                    textAlign: "right",
                    background: t.surface,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${t.border2}`,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: isNext ? t.accent : t.text }}>
                    {acc.targetFormatted}
                  </div>
                  <div style={{ fontSize: 10, color: t.textDim, marginTop: 1 }}>
                    {acc.monthOffset < 900 ? `in ${acc.monthOffset} mos` : "Indefinite"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
