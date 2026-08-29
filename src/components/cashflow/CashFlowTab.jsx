import React, { useState, useMemo, useCallback } from "react";
import { fmt } from "../../utils/formatters.js";
import { dateKey, buildDays, buildWeeks, projectDates, addDays } from "../../utils/dates.js";
import { uid } from "../../utils/formatters.js";
import { CATEGORY_COLORS } from "../../data/cashflow.js";
import { StatCard } from "../layout/StatCard.jsx";
import { CalendarView } from "./CalendarView.jsx";
import { ListView } from "./ListView.jsx";
import { AddChargeModal } from "./AddChargeModal.jsx";

export default function CashFlowTab({
  startBal,
  setStartBal,
  cfBudget,
  setCfBudget,
  debtMonthly,
  lmData,
  setLmData,
  lmSyncStatus,
  syncLM,
  t,
}) {
  const [numDays, setNumDays] = useState(60);
  const [showLM, setShowLM] = useState(true);
  const [charges, setCharges] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [addModal, setAddModal] = useState(null);
  const [newCharge, setNewCharge] = useState({
    payee: "",
    amount: "",
    type: "expense",
    category: "Manual",
  });
  const [filterCat, setFilterCat] = useState("All");
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeView, setActiveView] = useState("calendar");

  const debtCharges = useMemo(() => {
    const res = [];
    const days = buildDays(new Date(), numDays);
    const seen = new Set();
    for (const d of days) {
      if (d.getDate() === 1) {
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        if (!seen.has(mk)) {
          seen.add(mk);
          res.push({
            id: `debt-${mk}`,
            payee: "Debt Payoff Budget",
            amount: debtMonthly,
            date: dateKey(d),
            type: "expense",
            source: "debt-calculator",
            category: "Debt",
            _isDebtPayment: true,
          });
        }
      }
    }
    return res;
  }, [numDays, debtMonthly]);

  const days = useMemo(() => buildDays(new Date(), numDays), [numDays]);
  const weeks = useMemo(() => buildWeeks(days), [days]);

  const allCharges = useMemo(
    () => [...(showLM ? lmData : []), ...charges, ...debtCharges],
    [showLM, lmData, charges, debtCharges]
  );

  const hiddenLMIds = useMemo(
    () => new Set(charges.filter((c) => c._originalId).map((c) => c._originalId)),
    [charges]
  );

  const dayMap = useMemo(() => {
    const m = {};
    for (const c of allCharges) {
      if (!m[c.date]) m[c.date] = [];
      m[c.date].push(c);
    }
    return m;
  }, [allCharges]);

  const runBal = useMemo(() => {
    const res = {};
    let bal = startBal;
    const ms = {};
    for (const d of days) {
      const k = dateKey(d);
      const mk = `${d.getFullYear()}-${d.getMonth()}`;
      if (!ms[mk]) ms[mk] = 0;
      const dc = dayMap[k] || [];
      const inc = dc.filter((c) => c.type === "income").reduce((s, c) => s + c.amount, 0);
      const exp = dc.filter((c) => c.type === "expense").reduce((s, c) => s + c.amount, 0);
      ms[mk] += exp;
      bal += inc - exp;
      res[k] = {
        income: inc,
        expenses: exp,
        net: inc - exp,
        balance: bal,
        budgetUsed: ms[mk],
        budgetRemaining: cfBudget - ms[mk],
      };
    }
    return res;
  }, [days, dayMap, startBal, cfBudget]);

  const visForDay = useCallback(
    (k) =>
      (dayMap[k] || []).filter((c) => !(c.source === "lunchmoney" && hiddenLMIds.has(c.id))),
    [dayMap, hiddenLMIds]
  );

  const onDragStart = useCallback((e, c) => {
    setDragItem(c);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((e, k) => {
    e.preventDefault();
    setDragOver(k);
  }, []);

  const onDrop = useCallback(
    (e, targetDate) => {
      e.preventDefault();
      if (!dragItem || dragItem.date === targetDate) {
        setDragItem(null);
        setDragOver(null);
        return;
      }
      if (dragItem.source === "lunchmoney") {
        setCharges((p) => [
          ...p,
          {
            ...dragItem,
            id: uid(),
            date: targetDate,
            source: "manual-lm",
            _originalId: dragItem.id,
          },
        ]);
      } else if (dragItem.source !== "debt-calculator") {
        setCharges((p) =>
          p.map((c) => (c.id === dragItem.id ? { ...c, date: targetDate } : c))
        );
      }
      setDragItem(null);
      setDragOver(null);
    },
    [dragItem]
  );

  const removeCharge = useCallback((id) => setCharges((p) => p.filter((c) => c.id !== id)), []);

  const addManualCharge = () => {
    if (!newCharge.payee || !newCharge.amount || !addModal) return;
    setCharges((p) => [
      ...p,
      {
        id: uid(),
        payee: newCharge.payee,
        amount: parseFloat(newCharge.amount),
        type: newCharge.type,
        category: newCharge.category,
        date: addModal,
        source: "manual",
      },
    ]);
    setNewCharge({ payee: "", amount: "", type: "expense", category: "Manual" });
    setAddModal(null);
  };

  const cashZeroDate = useMemo(() => {
    for (const d of days) {
      const k = dateKey(d);
      if ((runBal[k]?.balance ?? 0) < 0) return k;
    }
    return null;
  }, [days, runBal]);

  const forecasts = useMemo(() => {
    const now = new Date();
    const eow = new Date(now);
    eow.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      eod: runBal[dateKey(now)]?.balance ?? null,
      eodLabel: "today",
      eow: runBal[dateKey(eow)]?.balance ?? null,
      eowLabel: eow.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      eom: runBal[dateKey(eom)]?.balance ?? null,
      eomLabel: eom.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    };
  }, [runBal]);

  return (
    <div>
      {/* Controls header */}
      <div
        style={{
          padding: "14px 24px",
          borderBottom: `1px solid ${t.border2}`,
          background: t.surface,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                fontWeight: 500,
              }}
            >
              Start
            </span>
            <input
              type="number"
              value={startBal}
              onChange={(e) => setStartBal(+e.target.value)}
              style={{ width: 96 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                fontWeight: 500,
              }}
            >
              Budget/mo
            </span>
            <input
              type="number"
              value={cfBudget}
              onChange={(e) => setCfBudget(+e.target.value)}
              style={{ width: 96 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {[30, 60, 90].map((n) => (
              <button
                key={n}
                className={`btn ${numDays === n ? "active" : ""}`}
                onClick={() => setNumDays(n)}
              >
                {n}d
              </button>
            ))}
          </div>
          <button className={`btn ${showLM ? "active" : ""}`} onClick={() => setShowLM((v) => !v)}>
            {showLM ? "✓ " : ""}Lunch Money
          </button>
          <button
            className="btn"
            onClick={() => syncLM(numDays)}
            disabled={lmSyncStatus === "loading"}
            style={{ opacity: lmSyncStatus === "loading" ? 0.6 : 1 }}
          >
            {lmSyncStatus === "loading"
              ? "Syncing…"
              : lmSyncStatus === "done"
              ? "✓ Synced"
              : lmSyncStatus === "error"
              ? "✕ Error"
              : "↻ Sync LM"}
          </button>
          <div
            style={{
              marginLeft: "auto",
              padding: "6px 14px",
              background: t.dangerBg,
              border: `1px solid ${t.dangerBd}`,
              borderRadius: 8,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            <span style={{ color: t.textDim, fontSize: 10 }}>From Payoff: </span>
            <span style={{ color: t.danger, fontWeight: 600 }}>{fmt(debtMonthly)}/mo</span>
            <span style={{ color: t.textDim, fontSize: 10 }}> · 1st of month</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
          {[
            ["calendar", "📅 Calendar"],
            ["list", "📋 List"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={`btn ${activeView === v ? "active" : ""}`}
              onClick={() => setActiveView(v)}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", ...Object.keys(CATEGORY_COLORS).filter((k) => k !== "income"), "income"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                style={{
                  background:
                    filterCat === cat ? (CATEGORY_COLORS[cat] || t.accent) + "22" : t.surface2,
                  color: CATEGORY_COLORS[cat] || t.accent,
                  border: `1px solid ${
                    filterCat === cat ? CATEGORY_COLORS[cat] || t.accent : t.border2
                  }`,
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  cursor: "pointer",
                  transition: "all .15s",
                  fontWeight: filterCat === cat ? 600 : 400,
                }}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Forecast strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${3 + (cashZeroDate ? 1 : 0)},1fr)`,
          borderBottom: `1px solid ${t.border2}`,
        }}
      >
        {[
          { label: "End of Day", bal: forecasts.eod, sub: forecasts.eodLabel },
          { label: "End of Week", bal: forecasts.eow, sub: forecasts.eowLabel },
          { label: "End of Month", bal: forecasts.eom, sub: forecasts.eomLabel },
        ].map(({ label, bal, sub }) => (
          <div key={label} className="stat-card">
            <div
              style={{
                fontSize: 9,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: bal == null ? t.textDim : bal >= 0 ? t.accent : t.danger,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {bal != null ? fmt(bal) : "—"}
            </div>
            <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>{sub}</div>
          </div>
        ))}
        {cashZeroDate && (
          <div
            className="stat-card"
            style={{ background: t.dangerBg, borderLeft: `1px solid ${t.dangerBd}` }}
          >
            <div
              style={{
                fontSize: 9,
                color: t.danger,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginBottom: 6,
                fontWeight: 500,
              }}
            >
              ⚠ Cash Negative
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.danger }}>
              {new Date(cashZeroDate + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
            <div style={{ fontSize: 10, color: t.danger, opacity: 0.8, marginTop: 2 }}>
              balance goes negative
            </div>
          </div>
        )}
      </div>

      {activeView === "list" && (
        <ListView
          days={days}
          runBal={runBal}
          visForDay={visForDay}
          filterCat={filterCat}
          onDragStart={onDragStart}
          removeCharge={removeCharge}
          setAddModal={setAddModal}
          t={t}
        />
      )}

      {activeView === "calendar" && (
        <CalendarView
          weeks={weeks}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragStart={onDragStart}
          visForDay={visForDay}
          runBal={runBal}
          filterCat={filterCat}
          setAddModal={setAddModal}
          removeCharge={removeCharge}
          t={t}
        />
      )}

      <AddChargeModal
        addModal={addModal}
        setAddModal={setAddModal}
        newCharge={newCharge}
        setNewCharge={setNewCharge}
        addManualCharge={addManualCharge}
        t={t}
      />
    </div>
  );
}
