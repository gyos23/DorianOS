import React, { useState, useMemo, useCallback, useEffect, useRef, Suspense, lazy } from "react";
import { THEMES } from "./data/themes.js";
import { INITIAL_DEBTS } from "./data/debts.js";
import { INITIAL_PRIORITIES, INITIAL_PILLARS } from "./data/priorities.js";
import { LM_RECURRING, isDebtCharge } from "./data/cashflow.js";
import { computeAmortization } from "./utils/amortization.js";
import { dateKey, addDays, projectDates, buildDays } from "./utils/dates.js";
import { useStatusTimer } from "./hooks/useStatusTimer.js";
import { usePersistentState } from "./hooks/usePersistentState.js";
import { getBridgeUrl } from "./utils/config.js";
import { Navbar } from "./components/layout/Navbar.jsx";
import { useOmniFocus } from "./hooks/useOmniFocus.js";
import { getExchangeRates, convertToUSD } from "./utils/currency.js";

// Lazy load tabs to code-split Recharts and heavy views
const TodayTab = lazy(() => import("./components/today/TodayTab.jsx"));
const ReviewTab = lazy(() => import("./components/review/ReviewTab.jsx"));
const PrioritiesTab = lazy(() => import("./components/priorities/PrioritiesTab.jsx"));
const DebtPayoffTab = lazy(() => import("./components/payoff/DebtPayoffTab.jsx"));
const CashFlowTab = lazy(() => import("./components/cashflow/CashFlowTab.jsx"));
const TasksTab = lazy(() => import("./components/tasks/TasksTab.jsx"));
const InsightsTab = lazy(() => import("./components/insights/InsightsTab.jsx"));

function TabLoading() {
  return <div className="tab-loading-fallback">Loading…</div>;
}

export default function App() {
  const [themeName, setThemeName] = usePersistentState("themeName", "slate");
  const t = THEMES[themeName];

  const [section, setSection] = usePersistentState("section", "today");
  const [visitedSections, setVisitedSections] = useState(() => new Set([section]));
  useEffect(() => {
    setVisitedSections((prev) => (prev.has(section) ? prev : new Set(prev).add(section)));
  }, [section]);
  const [pillars, setPillars] = usePersistentState("pillars", INITIAL_PILLARS);
  const [priorities, setPriorities] = usePersistentState("priorities.list", INITIAL_PRIORITIES);
  const [progressHistory, setProgressHistory] = usePersistentState("priorities.progressHistory", []);

  const handleLogWeekProgress = useCallback(
    (entry) => {
      setProgressHistory((prev) => [entry, ...(prev || []).slice(0, 50)]);
      setPriorities((prev) =>
        prev.map((p) => (p.id === entry.priorityId ? { ...p, currentValue: 0 } : p))
      );
    },
    [setProgressHistory, setPriorities]
  );

  // Auto-migrate legacy 50-total Forward goal into the 10 apps weekly cadence
  useEffect(() => {
    setPriorities((prev) => {
      let changed = false;
      const updated = prev.map((p) => {
        if (p.id === "p-forward-role" && (p.targetValue === 50 || p.unit === "applications")) {
          changed = true;
          return {
            ...p,
            targetValue: 10,
            unit: "apps / wk",
            status: "active",
            metricType: "weekly_cadence",
            cadence: "weekly",
            currentValue: p.currentValue >= 50 ? 0 : Math.min(p.currentValue, 10),
            targetDate: "Weekly Cadence",
            smart: {
              specific: "Land a Delivery Manager (or Project/Program Manager) role — hybrid or remote, contract or perm.",
              measurable: "10 high-quality applications weekly (2 per weekday); pipeline stays active until an offer is signed.",
              achievable: "2 tailored, high-quality applications per weekday is sustainable and avoids stopping at an arbitrary finish line.",
              relevant: "Direct financial inflection point post-Aer Lingus (Aug 7) — closes spend gap without stopping momentum.",
              timeBound: "Weekly cadence; ongoing focus until an offer is signed.",
            },
            notes: "10 high-quality tailored applications weekly. Resume tailored for aviation, tech, and enterprise ops.",
          };
        }
        return p;
      });
      return changed ? updated : prev;
    });
  }, [setPriorities]);

  const [debts, setDebts] = usePersistentState("debts", INITIAL_DEBTS);
  const [strategy, setStrategy] = usePersistentState("strategy", "avalanche");
  const [extraPayment, setExtraPayment] = usePersistentState("extraPayment", 500);

  const { schedule, accounts, monthlyBudget: debtMonthly, breakeven, neverPaidOff, stalled } = useMemo(
    () => computeAmortization(debts, strategy, extraPayment),
    [debts, strategy, extraPayment]
  );
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalInterestPaid = accounts.reduce((s, a) => s + a.totalInterest, 0);
  const payoffMonths = schedule.length;
  const payoffDate = useMemo(() => {
    if (neverPaidOff) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + payoffMonths);
    return d;
  }, [payoffMonths, neverPaidOff]);

  const updateDebt = useCallback((id, field, val) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: parseFloat(val) || 0 } : d))
    );
  }, []);

  const [debtSyncStatus, setDebtSyncStatus] = useStatusTimer();
  const [runwayBasis, setRunwayBasis] = usePersistentState("runwayBasis", "checking");
  const [checkingBal, setCheckingBal] = usePersistentState("checkingBal", 4952);
  const [totalCashBal, setTotalCashBal] = usePersistentState("totalCashBal", 12450);
  const [startBal, setStartBal] = usePersistentState("startBal", 4952);

  const handleSetRunwayBasis = useCallback(
    (newBasis) => {
      setRunwayBasis(newBasis);
      if (newBasis === "total") {
        setStartBal(totalCashBal);
      } else {
        setStartBal(checkingBal);
      }
    },
    [setRunwayBasis, setStartBal, totalCashBal, checkingBal]
  );
  const [cfBudget, setCfBudget] = usePersistentState("cfBudget", 6500);
  const [lmData, setLmData] = usePersistentState("lmData", LM_RECURRING);
  const [lmSyncStatus, setLmSyncStatus] = useStatusTimer();

  // Bridge state
  const [bridgeStatus, setBridgeStatus] = useState("unknown");
  const [syncStatus, setSyncStatus] = useStatusTimer();
  const {
    ofTasks,
    setOfTasks,
    ofProjects,
    setOfProjects,
    refreshStatus,
    setRefreshStatus,
    fetchOFTasks,
    fetchOFProjects,
    updateProjectNote,
    completeTask,
    toggleFlag,
    createTask,
    updateTaskDueDate,
    batchSyncTasks,
  } = useOmniFocus(bridgeStatus);

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
    checkBridge();
  }, [checkBridge]);

  const syncDebts = useCallback(async () => {
    setDebtSyncStatus("loading");
    try {
      const [accRes, assetRes] = await Promise.all([
        fetch("/api/lunchmoney?endpoint=accounts", { signal: AbortSignal.timeout(15000) }),
        fetch("/api/lunchmoney?endpoint=assets", { signal: AbortSignal.timeout(15000) }),
      ]);
      const [accData, assetData] = await Promise.all([accRes.json(), assetRes.json()]);

      const rates = await getExchangeRates();

      const credits = [
        ...(accData.plaid_accounts ?? []).filter(
          (a) => a.type === "credit" && parseFloat(a.balance) > 0
        ).map((a) => ({
          ...a,
          balance: convertToUSD(a.balance, a.currency || "USD", rates),
        })),
        ...(assetData.assets ?? []).filter(
          (a) => ["credit", "loan"].includes(a.type_name) && parseFloat(a.balance) > 0 && !a.closed_on
        ).map((a) => ({
          ...a,
          balance: convertToUSD(a.balance, a.currency || "USD", rates),
        })),
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

      const plaidAccs = accData.plaid_accounts ?? [];
      const wise = plaidAccs.find((a) => a.id === 350134);
      const depositories = plaidAccs.filter((a) => a.type === "depository" || a.subtype === "checking");
      const checkings = depositories.filter((a) =>
        (a.subtype === "checking" || (a.name || "").toLowerCase().includes("checking") || a.id === 350134)
      );

      const checkingTotal = checkings.length > 0
        ? checkings.reduce((sum, a) => sum + convertToUSD(a.balance || 0, a.currency || "USD", rates), 0)
        : wise ? convertToUSD(wise.balance, wise.currency || "EUR", rates) : checkingBal;

      const assets = assetData.assets ?? [];
      const liquidAssets = assets.filter((a) =>
        ["cash", "checking", "savings"].includes(a.type_name) && !a.closed_on
      );

      const totalLiquid = [
        ...depositories.map((a) => convertToUSD(a.balance || 0, a.currency || "USD", rates)),
        ...liquidAssets.map((a) => convertToUSD(a.balance || 0, a.currency || "USD", rates)),
      ].reduce((sum, b) => sum + b, 0);

      const finalChecking = checkingTotal > 0 ? checkingTotal : (wise ? convertToUSD(wise.balance, wise.currency || "EUR", rates) : checkingBal);
      const finalTotal = totalLiquid > 0 ? totalLiquid : finalChecking * 2.5;

      setCheckingBal(finalChecking);
      setTotalCashBal(finalTotal);
      setStartBal(runwayBasis === "total" ? finalTotal : finalChecking);

      setDebtSyncStatus("done");
    } catch (err) {
      console.error("Debt sync failed:", err.message);
      setDebtSyncStatus("error");
    }
  }, [setDebtSyncStatus, checkingBal, runwayBasis, setCheckingBal, setTotalCashBal, setStartBal]);

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

  const hasAutoSyncedLM = useRef(false);
  useEffect(() => {
    if (!hasAutoSyncedLM.current) {
      hasAutoSyncedLM.current = true;
      syncDebts();
      syncLM(60);
    }
  }, [syncDebts, syncLM]);

  const syncAllLM = useCallback(async () => {
    await Promise.allSettled([syncDebts(), syncLM(60)]);
  }, [syncDebts, syncLM]);

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

          // Reconcile: subtract any explicit debt payments scheduled in lmData for this month
          const scheduledDebt = lmData
            .filter((c) => {
              if (!c.date) return false;
              const [y, mo] = c.date.split("-");
              return (
                `${y}-${parseInt(mo, 10) - 1}` === mk &&
                c.type === "expense" &&
                isDebtCharge(c, debts)
              );
            })
            .reduce((s, c) => s + (c.amount || 0), 0);

          const unallocated = Math.max(0, +(debtMonthly - scheduledDebt).toFixed(2));
          if (unallocated > 0) {
            const k = dateKey(d);
            if (!m[k]) m[k] = [];
            m[k].push({ amount: unallocated, type: "expense" });
          }
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
  }, [lmData, startBal, debtMonthly, debts]);

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
        stalled={stalled}
        todayEOD={todayEOD}
        runwayBasis={runwayBasis}
        setRunwayBasis={handleSetRunwayBasis}
        themeName={themeName}
        setThemeName={setThemeName}
        t={t}
      />

      <Suspense fallback={<TabLoading />}>
        {visitedSections.has("today") && (
          <div style={{ display: section === "today" ? "contents" : "none" }}>
            <TodayTab
              ofTasks={ofTasks}
              ofProjects={ofProjects}
              onCompleteTask={completeTask}
              onToggleFlag={toggleFlag}
              onCreateTask={createTask}
              bridgeStatus={bridgeStatus}
              checkBridge={checkBridge}
              startBal={startBal}
              checkingBal={checkingBal}
              totalCashBal={totalCashBal}
              runwayBasis={runwayBasis}
              setRunwayBasis={handleSetRunwayBasis}
              forecasts={forecasts}
              cashZeroDate={cashZeroDate}
              lmData={lmData}
              totalDebt={totalDebt}
              debtMonthly={debtMonthly}
              accounts={accounts}
              payoffDate={payoffDate}
              stalled={stalled}
              syncAllLM={syncAllLM}
              lmSyncStatus={lmSyncStatus}
              debtSyncStatus={debtSyncStatus}
              priorities={priorities}
              pillars={pillars}
              onNavigate={setSection}
              onBatchSyncTasks={batchSyncTasks}
              t={t}
            />
          </div>
        )}

        {visitedSections.has("review") && (
          <div style={{ display: section === "review" ? "contents" : "none" }}>
            <ReviewTab
              ofTasks={ofTasks}
              ofProjects={ofProjects}
              fetchOFProjects={fetchOFProjects}
              completeTask={completeTask}
              toggleFlag={toggleFlag}
              onCreateTask={createTask}
              priorities={priorities}
              setPriorities={setPriorities}
              progressHistory={progressHistory}
              setProgressHistory={setProgressHistory}
              pillars={pillars}
              setPillars={setPillars}
              startBal={startBal}
              checkingBal={checkingBal}
              totalCashBal={totalCashBal}
              runwayBasis={runwayBasis}
              setRunwayBasis={handleSetRunwayBasis}
              debts={debts}
              strategy={strategy}
              extraPayment={extraPayment}
              debtMonthly={debtMonthly}
              payoffDate={payoffDate}
              forecasts={forecasts}
              cashZeroDate={cashZeroDate}
              lmData={lmData}
              cfBudget={cfBudget}
              onNavigate={setSection}
              t={t}
            />
          </div>
        )}

        {visitedSections.has("priorities") && (
          <div style={{ display: section === "priorities" ? "contents" : "none" }}>
            <PrioritiesTab
              priorities={priorities}
              setPriorities={setPriorities}
              progressHistory={progressHistory}
              onLogWeekProgress={handleLogWeekProgress}
              ofTasks={ofTasks}
              ofProjects={ofProjects}
              fetchOFProjects={fetchOFProjects}
              updateProjectNote={updateProjectNote}
              completeTask={completeTask}
              toggleFlag={toggleFlag}
              onCreateTask={createTask}
              pillars={pillars}
              setPillars={setPillars}
              cashZeroDate={cashZeroDate}
              startBal={startBal}
              checkingBal={checkingBal}
              t={t}
            />
          </div>
        )}

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
              breakeven={breakeven}
              neverPaidOff={neverPaidOff}
              stalled={stalled}
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
              debts={debts}
              strategy={strategy}
              extraPayment={extraPayment}
              lmData={lmData}
              setLmData={setLmData}
              lmSyncStatus={lmSyncStatus}
              syncLM={syncLM}
              runwayBasis={runwayBasis}
              setRunwayBasis={handleSetRunwayBasis}
              checkingBal={checkingBal}
              setCheckingBal={setCheckingBal}
              totalCashBal={totalCashBal}
              setTotalCashBal={setTotalCashBal}
              ofTasks={ofTasks}
              completeTask={completeTask}
              toggleFlag={toggleFlag}
              updateTaskDueDate={updateTaskDueDate}
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
              ofTasks={ofTasks}
              setOfTasks={setOfTasks}
              fetchOFTasks={fetchOFTasks}
              completeTask={completeTask}
              toggleFlag={toggleFlag}
              createTask={createTask}
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
              checkBridge={checkBridge}
              t={t}
            />
          </div>
        )}
      </Suspense>
    </div>
  );
}
