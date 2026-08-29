import React from "react";
import { CATEGORY_COLORS } from "../../data/cashflow.js";

export function AddChargeModal({
  addModal,
  setAddModal,
  newCharge,
  setNewCharge,
  addManualCharge,
  t,
}) {
  if (!addModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setAddModal(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            fontFamily: "'Syne',sans-serif",
            fontSize: 17,
            fontWeight: 800,
            color: t.accent,
            marginBottom: 18,
          }}
        >
          Add Charge
          <span
            style={{
              fontSize: 13,
              color: t.textDim,
              fontFamily: "'Inter',sans-serif",
              fontWeight: 400,
              marginLeft: 10,
            }}
          >
            {new Date(addModal + "T12:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            placeholder="Payee / description"
            value={newCharge.payee}
            onChange={(e) => setNewCharge((p) => ({ ...p, payee: e.target.value }))}
            style={{ width: "100%" }}
            autoFocus
          />
          <input
            type="number"
            placeholder="Amount"
            value={newCharge.amount}
            onChange={(e) => setNewCharge((p) => ({ ...p, amount: e.target.value }))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={newCharge.type}
              onChange={(e) => setNewCharge((p) => ({ ...p, type: e.target.value }))}
              style={{ flex: 1 }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <select
              value={newCharge.category}
              onChange={(e) => setNewCharge((p) => ({ ...p, category: e.target.value }))}
              style={{ flex: 1 }}
            >
              {Object.keys(CATEGORY_COLORS)
                .filter((k) => k !== "income")
                .map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn" style={{ flex: 1 }} onClick={() => setAddModal(null)}>
              Cancel
            </button>
            <button className="btn active" style={{ flex: 1 }} onClick={addManualCharge}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
