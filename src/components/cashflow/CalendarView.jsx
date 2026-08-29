import React from "react";
import { dateKey, MONTH_NAMES, DOW } from "../../utils/dates.js";
import { fmt } from "../../utils/formatters.js";
import { CATEGORY_COLORS } from "../../data/cashflow.js";
import { DayDetailPanel } from "./DayDetailPanel.jsx";

export function CalendarView({
  weeks,
  selectedDay,
  setSelectedDay,
  dragOver,
  setDragOver,
  onDragOver,
  onDrop,
  onDragStart,
  visForDay,
  runBal,
  filterCat,
  setAddModal,
  removeCharge,
  t,
}) {
  const selCharges = selectedDay ? visForDay(selectedDay) : [];
  const selStats = selectedDay ? runBal[selectedDay] : null;

  // Group weeks by month key
  const groups = [];
  let cur = null;
  let curWks = [];
  for (const wk of weeks) {
    const ref = wk.find((d) => d !== null);
    if (!ref) continue;
    const mk = `${ref.getFullYear()}-${ref.getMonth()}`;
    if (mk !== cur) {
      if (cur !== null) groups.push({ mk: cur, weeks: curWks });
      cur = mk;
      curWks = [];
    }
    curWks.push(wk);
  }
  if (cur) groups.push({ mk: cur, weeks: curWks });

  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1, overflowX: "auto" }}>
        {groups.map(({ mk, weeks: mw }) => {
          const [yr, mo] = mk.split("-").map(Number);
          return (
            <div key={mk}>
              <div
                style={{
                  padding: "8px 14px 6px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: t.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: ".15em",
                  borderBottom: `1px solid ${t.border}`,
                  background: t.surface,
                }}
              >
                {MONTH_NAMES[mo]} {yr}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: t.surface2 }}>
                    {DOW.map((d) => (
                      <th
                        key={d}
                        style={{
                          padding: "4px 6px",
                          fontSize: 9,
                          color: t.textDim,
                          textTransform: "uppercase",
                          letterSpacing: ".1em",
                          textAlign: "left",
                          width: "14.28%",
                          fontWeight: 500,
                          borderBottom: `1px solid ${t.border}`,
                        }}
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mw.map((wk, wi) => (
                    <tr key={wi}>
                      {wk.map((d, di) => {
                        if (!d)
                          return (
                            <td
                              key={di}
                              style={{ border: `1px solid ${t.border}`, minHeight: 88, opacity: 0.15 }}
                            />
                          );
                        const k = dateKey(d);
                        const isToday = k === dateKey(new Date());
                        const isSel = selectedDay === k;
                        const stats = runBal[k];
                        const vis = visForDay(k).filter(
                          (c) =>
                            filterCat === "All" ||
                            c.category === filterCat ||
                            (filterCat === "income" && c.type === "income")
                        );
                        return (
                          <td
                            key={di}
                            className={`day-cell${isToday ? " today" : ""}${
                              dragOver === k ? " drag-over" : ""
                            }${isSel ? " selected" : ""}`}
                            onDragOver={(e) => onDragOver(e, k)}
                            onDragLeave={() => setDragOver(null)}
                            onDrop={(e) => onDrop(e, k)}
                            onClick={() => setSelectedDay(isSel ? null : k)}
                          >
                            <button
                              className="add-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddModal(k);
                              }}
                            >
                              +
                            </button>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: isToday ? t.accent : t.textMuted,
                                marginBottom: 2,
                              }}
                            >
                              {d.getDate()}
                            </div>
                            <div style={{ overflow: "hidden", maxHeight: 58 }}>
                              {vis.slice(0, 3).map((c) => (
                                <div
                                  key={c.id}
                                  className="chip"
                                  style={{
                                    background:
                                      (CATEGORY_COLORS[c.type === "income" ? "income" : c.category] ||
                                        t.accent) + "22",
                                    color:
                                      CATEGORY_COLORS[c.type === "income" ? "income" : c.category] ||
                                        t.accent,
                                  }}
                                  draggable={!c._isDebtPayment}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    !c._isDebtPayment && onDragStart(e, c);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {c.type === "income" ? "↑" : "↓"}{" "}
                                  {c.amount < 100 ? `$${c.amount}` : `$${Math.round(c.amount)}`}
                                  {c._isDebtPayment ? "⚡" : ""}
                                </div>
                              ))}
                              {vis.length > 3 && (
                                <div style={{ fontSize: 9, color: t.textDim, marginTop: 1 }}>
                                  +{vis.length - 3} more
                                </div>
                              )}
                            </div>
                            {stats && (
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  borderTop: `1px solid ${t.border}`,
                                  padding: "2px 5px",
                                  background: t.surface,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 8,
                                    color: stats.budgetRemaining >= 0 ? t.textDim : t.danger,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    fontWeight: 500,
                                  }}
                                >
                                  bgt {fmt(stats.budgetRemaining)}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Side panel */}
      <DayDetailPanel
        selectedDay={selectedDay}
        selStats={selStats}
        selCharges={selCharges}
        setAddModal={setAddModal}
        removeCharge={removeCharge}
        t={t}
      />
    </div>
  );
}
