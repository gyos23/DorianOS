import React, { useState, useCallback } from "react";
import { useStatusTimer } from "../../hooks/useStatusTimer.js";
import { getBridgeUrl } from "../../utils/config.js";
import { FinancialAdvice } from "./FinancialAdvice.jsx";
import { ConversationThemes } from "./ConversationThemes.jsx";

export default function InsightsTab({
  debts,
  startBal,
  debtMonthly,
  cfBudget,
  bridgeStatus,
  t,
}) {
  const [insightsData, setInsightsData] = useState(null);
  const [insightsStatus, setInsightsStatus] = useStatusTimer();
  const [insightsStart, setInsightsStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [insightsEnd, setInsightsEnd] = useState(() => new Date().toISOString().slice(0, 10));

  const [adviceData, setAdviceData] = useState(null);
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
        body: JSON.stringify({ debts, startBal, debtMonthly, cfBudget }),
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
