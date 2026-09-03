import React from "react";

export function ConversationThemes({
  insightsData,
  insightsStatus,
  insightsStart,
  setInsightsStart,
  insightsEnd,
  setInsightsEnd,
  fetchInsights,
  t,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 28,
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
          🧠 Conversation Themes
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: "auto",
            flexWrap: "wrap",
          }}
        >
          <input
            type="date"
            value={insightsStart}
            onChange={(e) => setInsightsStart(e.target.value)}
            style={{ fontSize: 12, padding: "5px 8px" }}
          />
          <span style={{ color: t.textDim, fontSize: 12 }}>→</span>
          <input
            type="date"
            value={insightsEnd}
            onChange={(e) => setInsightsEnd(e.target.value)}
            style={{ fontSize: 12, padding: "5px 8px" }}
          />
          {[7, 14, 30].map((n) => (
            <button
              key={n}
              className="btn"
              style={{ fontSize: 11 }}
              onClick={() => {
                const e = new Date();
                const s = new Date();
                s.setDate(s.getDate() - n);
                setInsightsEnd(e.toISOString().slice(0, 10));
                setInsightsStart(s.toISOString().slice(0, 10));
              }}
            >
              {n}d
            </button>
          ))}
          <button
            className="btn active"
            onClick={fetchInsights}
            disabled={insightsStatus === "loading"}
            style={{ minWidth: 110, opacity: insightsStatus === "loading" ? 0.6 : 1 }}
          >
            {insightsStatus === "loading"
              ? "Analyzing…"
              : insightsStatus === "error"
              ? "✕ Error"
              : "✦ Generate"}
          </button>
        </div>
      </div>

      {insightsStatus === "loading" && (
        <div style={{ textAlign: "center", padding: "60px 0", color: t.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14 }}>Reading your conversations and finding patterns…</div>
        </div>
      )}

      {insightsStatus === "error" && !insightsData && (
        <div
          style={{
            background: t.dangerBg,
            border: `1px solid ${t.dangerBd}`,
            borderRadius: 10,
            padding: 20,
            color: t.danger,
            fontSize: 13,
          }}
        >
          Bridge error — make sure the bridge is running with{" "}
          <code>ANTHROPIC_API_KEY=xxx node of-bridge.js</code>
        </div>
      )}

      {insightsData && (
        <>
          {/* Summary */}
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border2}`,
              borderRadius: 12,
              padding: "18px 22px",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                marginBottom: 6,
              }}
            >
              Summary · {insightsData.messageCount} messages
            </div>
            <div style={{ fontSize: 14, color: t.textSub, lineHeight: 1.7 }}>
              {insightsData.summary}
            </div>
          </div>

          {/* Themes */}
          {insightsData.themes?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  color: t.textDim,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginBottom: 10,
                }}
              >
                Themes
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
                  gap: 10,
                }}
              >
                {insightsData.themes.map((theme, i) => (
                  <div
                    key={i}
                    style={{
                      background: t.surface,
                      border: `1px solid ${theme.color}44`,
                      borderLeft: `3px solid ${theme.color}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13, color: theme.color }}>
                        {theme.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: t.textDim,
                          background: t.surface2,
                          padding: "2px 7px",
                          borderRadius: 10,
                        }}
                      >
                        {theme.messageCount} msgs
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: t.textMuted,
                        lineHeight: 1.6,
                        marginBottom: 8,
                      }}
                    >
                      {theme.description}
                    </div>
                    {theme.examples?.map((ex, j) => (
                      <div
                        key={j}
                        style={{
                          fontSize: 11,
                          color: t.textDim,
                          padding: "3px 0",
                          borderTop: `1px solid ${t.border}`,
                        }}
                      >
                        "{ex}"
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pillars + Trends side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            {/* Pillars */}
            {insightsData.pillars?.length > 0 && (
              <div
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: t.textDim,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    marginBottom: 12,
                  }}
                >
                  Life Pillars
                </div>
                {insightsData.pillars.map((p, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: t.textSub }}>{p.name}</span>
                      <span style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>
                        {p.percentage}%
                      </span>
                    </div>
                    <div
                      style={{
                        background: t.surface2,
                        borderRadius: 4,
                        height: 5,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          background: p.color,
                          width: `${p.percentage}%`,
                          height: "100%",
                          borderRadius: 4,
                          transition: "width .4s",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Trends */}
            {insightsData.trends?.length > 0 && (
              <div
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border2}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: t.textDim,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    marginBottom: 12,
                  }}
                >
                  Patterns
                </div>
                {insightsData.trends.map((tr, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      marginBottom: 10,
                      paddingBottom: 10,
                      borderBottom:
                        i < insightsData.trends.length - 1 ? `1px solid ${t.border}` : "none",
                    }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>
                      {tr.type === "positive" ? "↑" : tr.type === "watch" ? "⚠" : "→"}
                    </span>
                    <span style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.6 }}>
                      {tr.observation}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top questions */}
          {insightsData.topQuestions?.length > 0 && (
            <div
              style={{
                background: t.surface,
                border: `1px solid ${t.border2}`,
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: t.textDim,
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginBottom: 12,
                }}
              >
                Questions You're Wrestling With
              </div>
              {insightsData.topQuestions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13,
                    color: t.textSub,
                    padding: "8px 0",
                    borderBottom:
                      i < insightsData.topQuestions.length - 1 ? `1px solid ${t.border}` : "none",
                    lineHeight: 1.6,
                  }}
                >
                  {i + 1}. {q}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!insightsData && insightsStatus === "idle" && (
        <div style={{ textAlign: "center", padding: "60px 0", color: t.textMuted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>Select a date range and click Generate</div>
          <div style={{ fontSize: 12, color: t.textDim }}>
            Requires bridge running with ANTHROPIC_API_KEY
          </div>
        </div>
      )}
    </div>
  );
}
