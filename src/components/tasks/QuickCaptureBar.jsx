import React, { useState, useCallback } from "react";
import { dateKey } from "../../utils/dates.js";

export function QuickCaptureBar({ onCreateTask, bridgeStatus, t }) {
  const [taskName, setTaskName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isFlagged, setIsFlagged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault();
      const trimmed = taskName.trim();
      if (!trimmed || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await onCreateTask({
          name: trimmed,
          dueDate: dueDate || null,
          flagged: isFlagged,
        });
        setTaskName("");
        setDueDate("");
        setIsFlagged(false);
        setShowDatePicker(false);
      } finally {
        setIsSubmitting(false);
      }
    },
    [taskName, dueDate, isFlagged, isSubmitting, onCreateTask]
  );

  const setDueToday = () => {
    setDueDate(dateKey(new Date()));
    setShowDatePicker(false);
  };

  const setDueTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDueDate(dateKey(d));
    setShowDatePicker(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        background: t.surface,
        border: `1px solid ${t.border2}`,
        borderRadius: 8,
        marginBottom: 16,
        transition: "border-color .15s",
      }}
      onFocusCapture={(e) => (e.currentTarget.style.borderColor = t.accent)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          e.currentTarget.style.borderColor = t.border2;
        }
      }}
    >
      <span style={{ fontSize: 14, color: t.textDim, userSelect: "none" }}>＋</span>
      <input
        type="text"
        placeholder={
          bridgeStatus === "online"
            ? "Quick capture to OmniFocus Inbox... (Press Enter)"
            : "Quick capture to Inbox (Bridge offline — will save locally)..."
        }
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        disabled={isSubmitting}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 13,
          color: t.text,
          fontFamily: "inherit",
        }}
      />

      {/* Due date badge or picker toggle */}
      {dueDate ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            padding: "2px 8px",
            background: t.surface2,
            border: `1px solid ${t.border3}`,
            borderRadius: 5,
            color: t.accent,
          }}
        >
          📅 {dueDate}
          <button
            type="button"
            onClick={() => setDueDate("")}
            style={{
              background: "none",
              border: "none",
              color: t.textDim,
              cursor: "pointer",
              padding: 0,
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </span>
      ) : (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className="btn"
            onClick={() => setShowDatePicker((p) => !p)}
            style={{
              fontSize: 11,
              padding: "3px 8px",
              color: t.textDim,
            }}
            title="Set due date"
          >
            📅 Due date
          </button>

          {showDatePicker && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 6,
                background: t.surface,
                border: `1px solid ${t.border2}`,
                borderRadius: 8,
                padding: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minWidth: 160,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={setDueToday}
                style={{ fontSize: 11, textAlign: "left" }}
              >
                🔴 Due Today
              </button>
              <button
                type="button"
                className="btn"
                onClick={setDueTomorrow}
                style={{ fontSize: 11, textAlign: "left" }}
              >
                🟡 Due Tomorrow
              </button>
              <input
                type="date"
                onChange={(e) => {
                  if (e.target.value) {
                    setDueDate(e.target.value);
                    setShowDatePicker(false);
                  }
                }}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  background: t.surface2,
                  border: `1px solid ${t.border3}`,
                  color: t.text,
                  borderRadius: 5,
                  outline: "none",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Flag toggle */}
      <button
        type="button"
        onClick={() => setIsFlagged((p) => !p)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 4px",
          fontSize: 13,
          opacity: isFlagged ? 1 : 0.35,
          transition: "opacity .15s",
        }}
        title={isFlagged ? "Flagged priority" : "Mark as priority"}
      >
        {isFlagged ? "🚩" : "⚐"}
      </button>

      {/* Submit button */}
      <button
        type="submit"
        className="btn active"
        disabled={!taskName.trim() || isSubmitting}
        style={{
          fontSize: 11,
          padding: "4px 12px",
          opacity: !taskName.trim() || isSubmitting ? 0.4 : 1,
        }}
      >
        {isSubmitting ? "Adding…" : "Add"}
      </button>
    </form>
  );
}
