import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DorianOS Crash caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 32,
            background: "#0f1117",
            color: "#f87171",
            fontFamily: "system-ui, sans-serif",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
              ⚠️ DorianOS Encountered an Error
            </h1>
            <p style={{ color: "#94a3b8", fontSize: 14 }}>
              An unhandled runtime error occurred in the React component tree:
            </p>
            <pre
              style={{
                background: "#1c1f2b",
                padding: 16,
                borderRadius: 8,
                border: "1px solid #374151",
                color: "#fca5a5",
                fontSize: 13,
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo?.componentStack && (
              <details style={{ marginTop: 16, color: "#64748b", fontSize: 12 }}>
                <summary style={{ cursor: "pointer", color: "#38bdf8" }}>
                  View Component Stack
                </summary>
                <pre
                  style={{
                    background: "#16181f",
                    padding: 12,
                    borderRadius: 6,
                    marginTop: 8,
                    overflowX: "auto",
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: "#38bdf8",
                  color: "#0f1117",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reload Dashboard
              </button>
              <button
                onClick={() => {
                  window.localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  background: "#374151",
                  color: "#e2e8f0",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Clear Local Storage & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
