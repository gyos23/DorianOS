import React, { useState, useMemo, useCallback, useEffect, Suspense, lazy } from "react";
import { THEMES } from "./data/themes.js";
import { INITIAL_DEBTS } from "./data/debts.js";
import { LM_RECURRING } from "./data/cashflow.js";
import { computeAmortization } from "./utils/amortization.js";
import { dateKey, addDays, projectDates, buildDays } from "./utils/dates.js";
import { useStatusTimer } from "./hooks/useStatusTimer.js";
import { getBridgeUrl } from "./utils/config.js";
import { Navbar } from "./components/layout/Navbar.jsx";

// Lazy load tabs to code-split Recharts and heavy views
const DebtPayoffTab = lazy(() => import("./components/payoff/DebtPayoffTab.jsx"));
const CashFlowTab = lazy(() => import("./components/cashflow/CashFlowTab.jsx"));
const TasksTab = lazy(() => import("./components/tasks/TasksTab.jsx"));
const InsightsTab = lazy(() => import("./components/insights/InsightsTab.jsx"));

function TabLoading() {
  return <div className="tab-loading-fallback">Loading…</div>;
}

export default function App() {
  const [themeName, setThemeName] = useState("slate");
  const t = THEMES[themeName];

  const [section, setSection] = useState("payoff");
  const [visitedSections, setVisitedSections] = useState(() => new Set(["payoff"]));
  useEffect(() => {
    setVisitedSections((prev) => (prev.has(section) ? prev : new Set(prev).add(section)));
  }, [section]);
  const [debts, setDebts] = useState(INITIAL_DEBTS);
  const [strategy, setStrategy] = useState("avalanche");
  const [extraPayment, setExtraPayment] = useState(500);

  const { schedule, accounts, monthlyBudget: debtMonthly } = useMemo(
    () => computeAmortization(debts, strategy, extraPayment),
    [debts, strategy, extraPayment]
  );
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalInterestPaid = accounts.reduce((s, a) => s + a.totalInterest, 0);
  const payoffMonths = schedule.length;
  const payoffDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + payoffMonths);
    return d;
  }, [payoffMonths]);

  const updateDebt = useCallback((id, field, val) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: parseFloat(val) || 0 } : d))
    );
  }, []);

  const [debtSyncStatus, setDebtSyncStatus] = useStatusTimer();
  const [startBal, setStartBal] = useState(4952);
  const [cfBudget, setCfBudget] = useState(6500);
  const [lmData, setLmData] = useState(LM_RECURRING);
  const [lmSyncStatus, setLmSyncStatus] = useStatusTimer();

  // Bridge state
  const [bridgeStatus, setBridgeStatus] = useState("unknown");
  const [syncStatus, setSyncStatus] = useStatusTimer();
  const [refreshStatus, setRefreshStatus] = useStatusTimer();

  const checkBridge = useCallback(async () => {
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/health`, { signal: AbortSignal.timeout(2000) });
      setBridgeStatus(r.ok ? "online" : "offline");
    } catch {
      setBridgeStatus("offline");
    }
  }, []);

  useEffect(() => {
    if (section === "tasks" || section === "insights") {
      checkBridge();
    }
  }, [section, checkBridge]);

  const syncDebts = useCallback(async () => {
    setDebtSyncStatus("loading");
    try {
      const [accRes, assetRes] = await Promise.all([
        fetch("/api/lunchmoney?endpoint=accounts", { signal: AbortSignal.timeout(15000) }),
        fetch("/api/lunchmoney?endpoint=assets", { signal: AbortSignal.timeout(15000) }),
      ]);
      const [accData, assetData] = await Promise.all([accRes.json(), assetRes.json()]);

      const credits = [
        ...(accData.plaid_accounts ?? []).filter(
          (a) => a.type === "credit" && parseFloat(a.balance) > 0
        ),
        ...(assetData.assets ?? []).filter(
          (a) => ["credit", "loan"].includes(a.type_name) && parseFloat(a.balance) > 0 && !a.closed_on
        ),
      ];

      setDebts((prev) => {
        const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
        const sigWords = (s) => norm(s).split(" ").filter((w) => w.length > 3);

        const pairs = prev
          .flatMap((debt) =>
            credits.map((c) => ({
              debtId: debt.id,
              credit: c,
              score: sigWords(debt.name).filter((w) =>
                sigWords(c.display_name || c.name || "").includes(w)
              ).length,
            }))
          )
          .filter((p) => p.score > 0)
          .sort((a, b) => b.score - a.score);

        const matchMap = new Map();
        const usedCredits = new Set();
        for (const { debtId, credit } of pairs) {
          if (!matchMap.has(debtId) && !usedCredits.has(credit)) {
            matchMap.set(debtId, credit);
            usedCredits.add(credit);
          }
        }

        return prev.map((debt) => {
          const m = matchMap.get(debt.id);
          return m ? { ...debt, balance: parseFloat(m.balance) } : debt;
        });
      });

      const wise = (accData.plaid_accounts ?? []).find((a) => a.id === 350134);
      if (wise) setStartBal(parseFloat(wise.balance));

      setDebtSyncStatus("done");
    } catch (err) {
      console.error("Debt sync failed:", err.message);
      setDebtSyncStatus("error");
    }
  }, [setDebtSyncStatus]);

  const syncLM = useCallback(
    async (numDays = 60) => {
      setLmSyncStatus("loading");
      try {
        const r = await fetch(`/api/lunchmoney?endpoint=recurring`, {
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const items = data.recurring_expenses ?? [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const windowEnd = addDays(today, numDays);

        const mapped = items.flatMap((item) => {
          const amt = parseFloat(item.amount);
          return projectDates(item, today, windowEnd).map((date) => ({
            id: `lm-api-${item.id}-${date}`,
            payee: item.payee,
            amount: Math.abs(amt),
            date,
            type: amt < 0 ? "income" : "expense",
            category: item.category_name || "Manual",
            source: "lunchmoney",
          }));
        });

        if (mapped.length > 0) setLmData(mapped);
        setLmSyncStatus("done");
      } catch (err) {
        console.error("LM sync failed:", err.message);
        setLmSyncStatus("error");
      }
    },
    [setLmSyncStatus]
  );

  const todayEOD = useMemo(() => {
    const todayKey = dateKey(new Date());
    const todayItems = lmData.filter((c) => c.date === todayKey);
    const inc = todayItems.filter((c) => c.type === "income").reduce((s, c) => s + c.amount, 0);
    const exp = todayItems.filter((c) => c.type === "expense").reduce((s, c) => s + c.amount, 0);
    return startBal + inc - exp;
  }, [lmData, startBal]);

  const { forecasts, cashZeroDate } = useMemo(() => {
    const days = buildDays(new Date(), 60);
    const m = {};
    for (const c of lmData) {
      if (!m[c.date]) m[c.date] = [];
      m[c.date].push(c);
    }
    const seen = new Set();
    for (const d of days) {
      if (d.getDate() === 1) {
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        if (!seen.has(mk)) {
          seen.add(mk);
          const k = dateKey(d);
          if (!m[k]) m[k] = [];
          m[k].push({ amount: debtMonthly, type: "expense" });
        }
      }
    }
    let bal = startBal;
    const runBal = {};
    let zeroDate = null;
    for (const d of days) {
      const k = dateKey(d);
      const dc = m[k] || [];
      const inc = dc.filter((c) => c.type === "income").reduce((s, c) => s + c.amount, 0);
      const exp = dc.filter((c) => c.type === "expense").reduce((s, c) => s + c.amount, 0);
      bal += inc - exp;
      runBal[k] = { balance: bal };
      if (bal < 0 && !zeroDate) zeroDate = k;
    }
    const now = new Date();
    const eow = new Date(now);
    eow.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7));
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      forecasts: {
        eod: runBal[dateKey(now)]?.balance ?? null,
        eodLabel: "today",
        eow: runBal[dateKey(eow)]?.balance ?? null,
        eowLabel: eow.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        eom: runBal[dateKey(eom)]?.balance ?? null,
        eomLabel: eom.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
      },
      cashZeroDate: zeroDate,
    };
  }, [lmData, startBal, debtMonthly]);

  // CSS variables dynamically bound to theme
  const cssVariables = useMemo(
    () => ({
      "--theme-bg": t.bg,
      "--theme-surface": t.surface,
      "--theme-surface2": t.surface2,
      "--theme-border": t.border,
      "--theme-border2": t.border2,
      "--theme-border3": t.border3,
      "--theme-text": t.text,
      "--theme-textSub": t.textSub,
      "--theme-textMuted": t.textMuted,
      "--theme-textDim": t.textDim,
      "--theme-textFaint": t.textFaint,
      "--theme-accent": t.accent,
      "--theme-accentSub": t.accentSub,
      "--theme-accentLight": t.accentLight,
      "--theme-accent-focus": `${t.accent}22`,
      "--theme-accent-hover": `${t.accent}11`,
      "--theme-accent-active": `${t.accent}1a`,
      "--theme-accent-subtle": `${t.accent}0d`,
      "--theme-accent-subtle-bd": `${t.accent}30`,
      "--theme-danger": t.danger,
      "--theme-dangerBg": t.dangerBg,
      "--theme-dangerBd": t.dangerBd,
      "--theme-warning": t.warning,
      "--theme-chartGrid": t.chartGrid,
      "--theme-chartAxis": t.chartAxis,
      "--theme-cellHover": t.cellHover,
      "--theme-cellDrag": t.cellDrag,
      "--theme-cellSel": t.cellSel,
      "--theme-inputBg": t.inputBg,
      "--theme-inputBd": t.inputBd,
      "--theme-scrollThumb": t.scrollThumb,
    }),
    [t]
  );

  return (
    <div
      style={{
        ...cssVariables,
        fontFamily: "'Inter',system-ui,sans-serif",
        background: t.bg,
        minHeight: "100vh",
        color: t.text,
        lineHeight: 1.5,
      }}
    >
      <Navbar
        section={section}
        setSection={setSection}
        debtMonthly={debtMonthly}
        payoffDate={payoffDate}
        todayEOD={todayEOD}
        themeName={themeName}
        setThemeName={setThemeName}
        t={t}
      />

      <Suspense fallback={<TabLoading />}>
        {visitedSections.has("payoff") && (
          <div style={{ display: section === "payoff" ? "contents" : "none" }}>
            <DebtPayoffTab
              debts={debts}
              updateDebt={updateDebt}
              strategy={strategy}
              setStrategy={setStrategy}
              extraPayment={extraPayment}
              setExtraPayment={setExtraPayment}
              schedule={schedule}
              accounts={accounts}
              debtMonthly={debtMonthly}
              totalDebt={totalDebt}
              totalInterestPaid={totalInterestPaid}
              payoffMonths={payoffMonths}
              payoffDate={payoffDate}
              syncDebts={syncDebts}
              debtSyncStatus={debtSyncStatus}
              t={t}
            />
          </div>
        )}

        {visitedSections.has("cashflow") && (
          <div style={{ display: section === "cashflow" ? "contents" : "none" }}>
            <CashFlowTab
              startBal={startBal}
              setStartBal={setStartBal}
              cfBudget={cfBudget}
              setCfBudget={setCfBudget}
              debtMonthly={debtMonthly}
              lmData={lmData}
              setLmData={setLmData}
              lmSyncStatus={lmSyncStatus}
              syncLM={syncLM}
              t={t}
            />
          </div>
        )}

        {visitedSections.has("tasks") && (
          <div style={{ display: section === "tasks" ? "contents" : "none" }}>
            <TasksTab
              bridgeStatus={bridgeStatus}
              checkBridge={checkBridge}
              syncStatus={syncStatus}
              setSyncStatus={setSyncStatus}
              refreshStatus={refreshStatus}
              setRefreshStatus={setRefreshStatus}
              t={t}
            />
          </div>
        )}

        {visitedSections.has("insights") && (
          <div style={{ display: section === "insights" ? "contents" : "none" }}>
            <InsightsTab
              debts={debts}
              startBal={startBal}
              debtMonthly={debtMonthly}
              cfBudget={cfBudget}
              forecasts={forecasts}
              cashZeroDate={cashZeroDate}
              bridgeStatus={bridgeStatus}
              t={t}
            />
          </div>
        )}
      </Suspense>
    </div>
  );
}
