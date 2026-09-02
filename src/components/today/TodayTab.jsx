import React, { useMemo } from "react";
import { fmt } from "../../utils/formatters.js";
import { dateKey } from "../../utils/dates.js";
import { TodayFocusMatrix } from "./TodayFocusMatrix.jsx";
import { RunwayRadar } from "./RunwayRadar.jsx";

export default function TodayTab({
  ofTasks,
  onCompleteTask,
  onToggleFlag,
  onCreateTask,
  bridgeStatus,
  checkBridge,
  startBal,
  forecasts,
  cashZeroDate,
  lmData,
  totalDebt,
  debtMonthly,
  payoffDate,
  stalled,
  onNavigate,
  t,
}) {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const todayKey = dateKey(now);
  const overdueCount = useMemo(
    () => ofTasks.filter((t) => t.dueDate && t.dueDate < todayKey).length,
    [ofTasks, todayKey]
  );
  const dueTodayCount = useMemo(
    () => ofTasks.filter((t) => t.dueDate === todayKey).length,
    [ofTasks, todayKey]
  );
  const flaggedCount = useMemo(
    () => ofTasks.filter((t) => t.flagged).length,
    [ofTasks]
  );

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "24px 20px 48px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          paddingBottom: 8,
          borderBottom: `1px solid ${t.border2}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: t.accent,
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            {dateFormatted}
          </div>
          <h1
            style={{
              fontFamily: "'Syne',sans-serif",
              fontSize: 26,
              fontWeight: 800,
              color: t.text,
              letterSpacing: "-0.03em",
              margin: "4px 0 0",
            }}
          >
            {greeting}, Dorian.
          </h1>
        </div>

        {/* Bridge Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 6,
              fontSize: 11,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: bridgeStatus === "online" ? "#10B981" : "#EF4444",
              }}
            />
            <span style={{ color: t.textDim }}>OF Bridge:</span>
            <span style={{ fontWeight: 600, color: t.text }}>
              {bridgeStatus === "online" ? "Connected" : "Offline"}
            </span>
          </div>
          {bridgeStatus !== "online" && (
            <button
              className="btn"
              onClick={checkBridge}
              style={{ fontSize: 11, padding: "4px 8px" }}
            >
              ↻ Retry
            </button>
          )}
        </div>
      </div>

      {/* Executive Briefing Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {/* Task Velocity Brief */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border2}`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              fontWeight: 600,
            }}
          >
            Task Readiness
          </div>
          <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>
            {overdueCount > 0 ? (
              <span style={{ color: t.danger }}>{overdueCount} overdue items require review. </span>
            ) : null}
            {dueTodayCount > 0 ? (
              <span>{dueTodayCount} due today. </span>
            ) : (
              <span>Zero tasks due today. </span>
            )}
            {flaggedCount > 0 ? (
              <span style={{ color: t.warning }}>{flaggedCount} flagged priority.</span>
            ) : null}
          </div>
        </div>

        {/* Runway Brief */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border2}`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              fontWeight: 600,
            }}
          >
            Cash Velocity
          </div>
          <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>
            {cashZeroDate ? (
              <span>
                Runway cliff projected on{" "}
                <strong style={{ color: t.danger }}>
                  {new Date(cashZeroDate + "T12:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </strong>
                .
              </span>
            ) : (
              <span style={{ color: t.accent }}>
                Safe buffer maintained across 60-day horizon.
              </span>
            )}
          </div>
        </div>

        {/* Debt Trajectory Brief */}
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border2}`,
            borderRadius: 10,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: t.textDim,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              fontWeight: 600,
            }}
          >
            Debt Freedom Trajectory
          </div>
          <div style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>
            {payoffDate ? (
              <span>
                Debt-free by{" "}
                <strong style={{ color: t.accent }}>
                  {payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </strong>{" "}
                ({fmt(debtMonthly)}/mo velocity).
              </span>
            ) : stalled ? (
              <span style={{ color: t.danger }}>Payoff stalled — increase monthly payments.</span>
            ) : (
              <span>Calculating debt horizon…</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Command Center Grid: 2 Columns */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Left: Execution Focus Matrix */}
        <TodayFocusMatrix
          ofTasks={ofTasks}
          onCompleteTask={onCompleteTask}
          onToggleFlag={onToggleFlag}
          onCreateTask={onCreateTask}
          bridgeStatus={bridgeStatus}
          onNavigateTasks={() => onNavigate("tasks")}
          t={t}
        />

        {/* Right: Financial Radar & Debt Snapshot */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <RunwayRadar
            startBal={startBal}
            forecasts={forecasts}
            cashZeroDate={cashZeroDate}
            lmData={lmData}
            onNavigateCashflow={() => onNavigate("cashflow")}
            t={t}
          />

          {/* Debt Payoff Milestone Card */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>💳</span>
                <span
                  style={{
                    fontFamily: "'Syne',sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.text,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Debt Payoff Velocity
                </span>
              </div>
              <button
                className="btn"
                onClick={() => onNavigate("payoff")}
                style={{ fontSize: 11, padding: "3px 10px", color: t.textDim }}
              >
                Open Payoff Plan →
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Remaining Principal
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: t.danger, marginTop: 2 }}>
                  {fmt(totalDebt)}
                </div>
              </div>

              <div
                style={{
                  background: t.surface2,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
                  Debt-Free Month
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: t.accent, marginTop: 2 }}>
                  {payoffDate
                    ? payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
