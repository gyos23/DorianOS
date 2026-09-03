import React from "react";
import { BridgeToggleButton } from "../shared/BridgeToggleButton.jsx";

export function FinancialAdvice({
  adviceData,
  adviceStatus,
  bridgeStatus,
  checkBridge,
  fetchAdvice,
  t,
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans',sans-serif",
            fontSize: 16,
            fontWeight: 800,
            color: t.text,
          }}
        >
          💰 Financial Advice
        </div>
        <button
          className="btn active"
          onClick={fetchAdvice}
          disabled={adviceStatus === "loading" || bridgeStatus !== "online"}
          style={{
            opacity: adviceStatus === "loading" || bridgeStatus !== "online" ? 0.6 : 1,
            minWidth: 120,
          }}
        >
          {adviceStatus === "loading"
            ? "Analyzing…"
            : adviceStatus === "error"
            ? "✕ Error"
            : "↻ Get Advice"}
        </button>
      </div>

      {adviceStatus === "loading" && (
        <div style={{ textAlign: "center", padding: "32px 0", color: t.textMuted, fontSize: 13 }}>
          Analyzing your debts and cash flow…
        </div>
      )}

      {bridgeStatus !== "online" && !adviceData && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: 12,
            color: t.textDim,
            padding: "12px 16px",
            background: t.surface,
            borderRadius: 8,
            border: `1px solid ${t.border2}`,
          }}
        >
          <span>Bridge offline</span>
          <BridgeToggleButton bridgeStatus={bridgeStatus} checkBridge={checkBridge} t={t} />
        </div>
      )}

      {adviceData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 12,
              padding: "18px 22px",
              display: "flex",
              gap: 20,
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 9,
                  color: t.textDim,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Situation
              </div>
              <div style={{ fontSize: 14, color: t.textSub, lineHeight: 1.7 }}>
                {adviceData.summary}
              </div>
            </div>
            {adviceData.freeFlow != null && (
              <div
                style={{
                  flexShrink: 0,
                  textAlign: "right",
                  paddingLeft: 20,
                  borderLeft: `1px solid ${t.border2}`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: t.textDim,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    marginBottom: 4,
                    fontWeight: 500,
                  }}
                >
                  Free Cash Flow
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: adviceData.freeFlow >= 0 ? t.accent : t.danger,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {adviceData.freeFlow >= 0 ? "+" : ""}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(adviceData.freeFlow)}
                  /mo
                </div>
                <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
                  after all commitments
                </div>
              </div>
            )}
          </div>

          {adviceData.debtFocus && (
            <div
              style={{
                background: t.dangerBg,
                border: `1px solid ${t.dangerBd}`,
                borderRadius: 10,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: t.danger,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginBottom: 5,
                  fontWeight: 500,
                }}
              >
                ⚡ Debt Focus
              </div>
              <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>
                {adviceData.debtFocus}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Immediate Actions", items: adviceData.immediate, color: t.accent },
              { label: "This Month", items: adviceData.thisMonth, color: t.accentSub },
              { label: "Watch Out", items: adviceData.watchOut, color: t.warning },
            ].map(
              ({ label, items, color }) =>
                items?.length > 0 && (
                  <div
                    key={label}
                    style={{
                      background: t.surface,
                      border: `1px solid ${t.border2}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        color: t.textDim,
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        marginBottom: 10,
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </div>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          marginBottom: 8,
                          paddingBottom: 8,
                          borderBottom:
                            i < items.length - 1 ? `1px solid ${t.border}` : "none",
                        }}
                      >
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: color,
                            flexShrink: 0,
                            marginTop: 5,
                          }}
                        />
                        <span style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
