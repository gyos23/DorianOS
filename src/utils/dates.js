export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function ofDueLabel(dueDate) {
  if (!dueDate) return "nodate";
  const today = dateKey(new Date());
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  const diff = Math.round((new Date(dueDate + "T12:00:00") - new Date()) / 86400000);
  if (diff <= 3) return "soon";
  return "upcoming";
}

export function buildDays(start, n) {
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}

export function buildWeeks(days) {
  const weeks = [];
  let week = [];
  for (let i = 0; i < days[0].getDay(); i++) week.push(null);
  for (const d of days) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export function projectDates(item, today, windowEnd) {
  if (!item.billing_date) return [];
  const anchor = new Date(item.billing_date + "T12:00:00");
  const dates = [];
  const advance = (d, cadence) => {
    switch (cadence) {
      case "monthly":        return new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
      case "every 3 months": return new Date(d.getFullYear(), d.getMonth() + 3, d.getDate());
      case "twice a year":   return new Date(d.getFullYear(), d.getMonth() + 6, d.getDate());
      case "yearly":         return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
      default:               return null;
    }
  };

  if (
    item.cadence === "monthly" ||
    item.cadence === "every 3 months" ||
    item.cadence === "twice a year" ||
    item.cadence === "yearly"
  ) {
    let d = new Date(anchor);
    while (d < today) {
      const n = advance(d, item.cadence);
      if (!n) break;
      d = n;
    }
    while (d <= windowEnd) {
      dates.push(dateKey(d));
      const n = advance(d, item.cadence);
      if (!n) break;
      d = n;
    }
  } else {
    if (anchor >= today && anchor <= windowEnd) dates.push(dateKey(anchor));
  }
  return dates;
}
