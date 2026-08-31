import React, { useCallback } from "react";
import { useStatusTimer } from "../../hooks/useStatusTimer.js";
import { usePersistentState } from "../../hooks/usePersistentState.js";
import { getBridgeUrl } from "../../utils/config.js";
import { FinancialAdvice } from "./FinancialAdvice.jsx";
import { ConversationThemes } from "./ConversationThemes.jsx";

export default function InsightsTab({
  debts,
  startBal,
  debtMonthly,
  cfBudget,
  forecasts,
  cashZeroDate,
  bridgeStatus,
  checkBridge,
  t,
}) {
  const [insightsData, setInsightsData] = usePersistentState("insights.data", null);
  const [insightsStatus, setInsightsStatus] = useStatusTimer();
  const [insightsStart, setInsightsStart] = usePersistentState("insights.start", () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [insightsEnd, setInsightsEnd] = usePersistentState("insights.end", () =>
    new Date().toISOString().slice(0, 10)
  );

  const [adviceData, setAdviceData] = usePersistentState("advice.data", null);
  const [adviceStatus, setAdviceStatus] = useStatusTimer();

  const fetchInsights = useCallback(async () => {
    setInsightsStatus("loading");
    setInsightsData(null);
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(
        `${bridgeUrl}/insights?start=${insightsStart}&end=${insightsEnd}`,
        { signal: AbortSignal.timeout(60000) }
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Bridge error");
      setInsightsData(data);
      setInsightsStatus("idle");
    } catch (err) {
      console.error("Insights failed:", err.message);
      setInsightsStatus("error");
    }
  }, [insightsStart, insightsEnd, setInsightsStatus]);

  const fetchAdvice = useCallback(async () => {
    setAdviceStatus("loading");
    setAdviceData(null);
    try {
      const bridgeUrl = getBridgeUrl();
      const r = await fetch(`${bridgeUrl}/financial-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ debts, startBal, debtMonthly, cfBudget, forecasts, cashZeroDate }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Bridge error");
      setAdviceData(data);
      setAdviceStatus("idle");
    } catch (err) {
      console.error("Financial advice failed:", err.message);
      setAdviceStatus("error");
    }
  }, [debts, startBal, debtMonthly, cfBudget, setAdviceStatus]);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      <FinancialAdvice
        adviceData={adviceData}
        adviceStatus={adviceStatus}
        bridgeStatus={bridgeStatus}
        checkBridge={checkBridge}
        fetchAdvice={fetchAdvice}
        t={t}
      />
      <ConversationThemes
        insightsData={insightsData}
        insightsStatus={insightsStatus}
        insightsStart={insightsStart}
        setInsightsStart={setInsightsStart}
        insightsEnd={insightsEnd}
        setInsightsEnd={setInsightsEnd}
        fetchInsights={fetchInsights}
        t={t}
      />
    </div>
  );
}
