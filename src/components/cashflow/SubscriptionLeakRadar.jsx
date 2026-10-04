import React, { useMemo } from "react";
import { fmt } from "../../utils/formatters.js";

export function SubscriptionLeakRadar({
  lmData = [],
  onFlagForCancel,
  t,
}) {
  // Analyze recurring subscription charges from lmData
  const analysis = useMemo(() => {
    // 1. Group unique subscriptions by normalized payee name
    const subMap = new Map();

    for (const item of lmData) {
      if (item.type !== "expense") continue;
      const isSub =
        item.category === "Subscription" ||
        item.category === "Business" ||
        item.category === "Bills";
      if (!isSub) continue;

      const normPayee = (item.payee || "").trim().toLowerCase();
      if (!normPayee) continue;

      if (!subMap.has(normPayee)) {
        subMap.set(normPayee, {
          payee: item.payee,
          category: item.category,
          amount: item.amount,
          occurrences: 1,
          dates: [item.date],
          isAnnual: (item.payee || "").toLowerCase().includes("annual") || item.amount >= 100,
        });
      } else {
        const existing = subMap.get(normPayee);
        existing.occurrences += 1;
        if (!existing.dates.includes(item.date)) existing.dates.push(item.date);
        // Take latest or higher amount representation
        existing.amount = Math.max(existing.amount, item.amount);
      }
    }

    const uniqueSubs = Array.from(subMap.values());

    // 2. Classify leaks
    // Heavy burn: monthly sub >= $20/mo or annual >= $150
    const heavyBurn = uniqueSubs.filter(
      (s) => (!s.isAnnual && s.amount >= 20) || (s.isAnnual && s.amount >= 150)
    );

    // Annual renewals: renewal payments detected or keywords
    const annualRenewals = uniqueSubs.filter((s) => s.isAnnual);

    // Category overlaps: multiple subs in software/streaming
    const softwareOrMedia = uniqueSubs.filter((s) => {
      const p = s.payee.toLowerCase();
      return (
        p.includes("chatgpt") ||
        p.includes("notion") ||
        p.includes("proton") ||
        p.includes("squarespace") ||
        p.includes("icloud") ||
        p.includes("prime") ||
        p.includes("netflix") ||
        p.includes("spotify")
      );
    });

    // Total monthly recurring sub burn
    const monthlyTotal = uniqueSubs.reduce((sum, s) => {
      const monthlyEquiv = s.isAnnual ? s.amount / 12 : s.amount;
      return sum + monthlyEquiv;
    }, 0);

    const projectedAnnualSpend = monthlyTotal * 12;

    return {
      allSubs: uniqueSubs,
      heavyBurn,
      annualRenewals,
      softwareOrMedia,
      monthlyTotal,
      projectedAnnualSpend,
    };
  }, [lmData]);

  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border2}`,
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: t.text }}>
              Subscription Leak & Burn Radar
            </span>
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
            Auditing Lunch Money recurring SaaS, cloud services, and memberships.
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
            Annual Run-Rate
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b" }}>
            {fmt(analysis.projectedAnnualSpend)}/yr
          </div>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
        <div style={{ background: t.surface2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
            Active Subscriptions
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, marginTop: 2 }}>
            {analysis.allSubs.length} services
          </div>
        </div>
        <div style={{ background: t.surface2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
            Monthly Sub Burn
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#60a5fa", marginTop: 2 }}>
            {fmt(analysis.monthlyTotal)}/mo
          </div>
        </div>
        <div style={{ background: t.dangerBg, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.dangerBd}` }}>
          <div style={{ fontSize: 9, color: t.danger, textTransform: "uppercase", fontWeight: 600 }}>
            High-Burn Items (&gt;$20)
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.danger, marginTop: 2 }}>
            {analysis.heavyBurn.length} flagged
          </div>
        </div>
        <div style={{ background: t.surface2, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 9, color: t.textDim, textTransform: "uppercase", fontWeight: 600 }}>
            Annual Renewals
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#a78bfa", marginTop: 2 }}>
            {analysis.annualRenewals.length} items
          </div>
        </div>
      </div>

      {/* Flagged Leaks & Opportunities */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textSub, marginBottom: 8 }}>
          Flagged Heavy Burn & Recurring Items
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {analysis.allSubs.map((sub) => {
            const isHighBurn = (!sub.isAnnual && sub.amount >= 20) || (sub.isAnnual && sub.amount >= 150);
            return (
              <div
                key={sub.payee}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  background: isHighBurn ? t.dangerBg + "55" : t.surface2,
                  border: `1px solid ${isHighBurn ? t.dangerBd : t.border}`,
                  borderRadius: 7,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12 }}>{sub.isAnnual ? "📅" : isHighBurn ? "🔥" : "💳"}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>
                      {sub.payee}
                    </div>
                    <div style={{ fontSize: 9, color: t.textDim }}>
                      {sub.category} · {sub.isAnnual ? "Annual renewal" : "Monthly recurring"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isHighBurn ? t.danger : t.textSub }}>
                      {fmt(sub.amount)}{sub.isAnnual ? "/yr" : "/mo"}
                    </div>
                    {sub.isAnnual && (
                      <div style={{ fontSize: 8, color: t.textDim }}>
                        ~{fmt(sub.amount / 12)}/mo
                      </div>
                    )}
                  </div>
                  {onFlagForCancel && (
                    <button
                      onClick={() => onFlagForCancel(sub.payee, sub.amount)}
                      title="Flag to cancel in Monthly Review"
                      style={{
                        fontSize: 10,
                        background: "none",
                        border: `1px solid ${t.border}`,
                        color: t.textDim,
                        borderRadius: 4,
                        padding: "3px 7px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel Target
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
