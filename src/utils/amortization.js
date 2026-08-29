export function computeAmortization(debts, strategy, extraPayment) {
  let accounts = debts
    .filter(d => d.balance > 0)
    .map(d => ({
      ...d,
      remaining: d.balance,
      totalPaid: 0,
      totalInterest: 0,
      paidOffMonth: null,
    }));

  const totalMin = accounts.reduce((s, d) => s + d.minPayment, 0);
  const monthlyBudget = totalMin + extraPayment;
  const schedule = [];
  let month = 0;

  while (accounts.some(a => a.remaining > 0.005) && month < 360) {
    month++;
    accounts = accounts.map(a => {
      if (a.remaining <= 0) return a;
      const interest = (a.remaining * a.apr) / 100 / 12;
      const nr = a.remaining + interest;
      const pmt = Math.min(a.minPayment, nr);
      return {
        ...a,
        remaining: nr - pmt,
        totalPaid: a.totalPaid + pmt,
        totalInterest: a.totalInterest + interest,
        _interestThisMonth: interest,
        _minPaid: pmt,
      };
    });

    let avail = monthlyBudget - accounts.reduce((s, a) => s + (a._minPaid || 0), 0);
    let sorted = [...accounts];
    if (strategy === "avalanche") sorted.sort((a, b) => b.apr - a.apr);
    else if (strategy === "snowball") sorted.sort((a, b) => a.remaining - b.remaining);

    for (let acc of sorted) {
      if (avail <= 0.005 || acc.remaining <= 0) continue;
      const idx = accounts.findIndex(a => a.id === acc.id);
      const ex = Math.min(avail, accounts[idx].remaining);
      accounts[idx].remaining -= ex;
      accounts[idx].totalPaid += ex;
      avail -= ex;
    }

    accounts = accounts.map(a => ({
      ...a,
      remaining: Math.max(0, a.remaining),
      paidOffMonth: a.paidOffMonth !== null ? a.paidOffMonth : a.remaining <= 0.005 ? month : null,
    }));

    const totalRemaining = accounts.reduce((s, a) => s + a.remaining, 0);
    const totalInterest = accounts.reduce((s, a) => s + (a._interestThisMonth || 0), 0);
    const pt = { month, totalRemaining, totalInterest, monthlyBudget };
    accounts.forEach(a => {
      pt[a.name] = parseFloat(a.remaining.toFixed(2));
    });
    schedule.push(pt);
  }

  return { schedule, accounts, monthlyBudget };
}
