/**
 * Automated Metric Rollup & Analytical Insights Engine
 * Synthesizes cross-pillar performance into strategic intelligence.
 */

export function generateMetricInsights({
  priorities = [],
  progressHistory = [],
  financials = {},
  ofStats = {},
}) {
  const {
    startBal = 4952,
    checkingBal = 4952,
    runwayDays = 60,
    monthlyBurn = 6500,
    cashZeroDate = null,
    totalDebt = 0,
    payoffDate = null,
  } = financials;

  const {
    totalTasks = 0,
    completedTasks = 0,
    stalledCount = 0,
  } = ofStats;

  // 1. Forward Pillar: Career & Role Search Analysis
  const forwardPriority = priorities.find((p) => p.id === "p-forward-role" || p.pillar === "forward");
  const forwardCurrent = forwardPriority ? forwardPriority.currentValue || 0 : 0;
  const forwardTarget = forwardPriority ? forwardPriority.targetValue || 10 : 10;
  const forwardPercent = Math.min(100, Math.round((forwardCurrent / forwardTarget) * 100));

  // Count past weeks logged for Forward
  const forwardLogs = progressHistory.filter((h) => h.priorityId === "p-forward-role" || h.pillar === "forward");
  const totalAppsLogged = forwardLogs.reduce((sum, log) => sum + (log.valueAchieved || 0), forwardCurrent);
  const avgAppsPerWeek = forwardLogs.length > 0
    ? +(forwardLogs.reduce((sum, log) => sum + (log.valueAchieved || 0), 0) / forwardLogs.length).toFixed(1)
    : forwardCurrent;

  // 2. Freedom Pillar: 300 Planners Pacing Analysis
  const freedomPriority = priorities.find((p) => p.id === "p-freedom-planners" || p.pillar === "freedom");
  const plannersSold = freedomPriority ? freedomPriority.currentValue || 0 : 24;
  const plannersTarget = freedomPriority ? freedomPriority.targetValue || 300 : 300;
  const plannersRemaining = Math.max(0, plannersTarget - plannersSold);
  const plannersPercent = Math.round((plannersSold / plannersTarget) * 100);

  // Weeks remaining in year (target Dec 31, 2026)
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const weeksLeftInYear = Math.max(1, Math.ceil((yearEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)));
  const plannersNeededPerWeek = Math.ceil(plannersRemaining / weeksLeftInYear);

  // 3. Finance Pillar: Runway & Burn
  const runwayStatus = runwayDays >= 90 ? "optimal" : runwayDays >= 45 ? "moderate" : "critical";
  const dailyBurn = +(monthlyBurn / 30).toFixed(0);

  // 4. Generate Synthesized Actionable Insights
  const insights = [];

  // Insight A: Forward Pipeline Momentum
  if (forwardCurrent >= forwardTarget) {
    insights.push({
      id: "fwd-target-hit",
      pillar: "forward",
      badge: "Target Met",
      badgeType: "success",
      title: "Weekly Application Goal Achieved",
      summary: `You hit ${forwardCurrent}/${forwardTarget} applications this week (${forwardPercent}%). Consistent 2/day submissions generate compounding pipeline momentum.`,
      takeaway: "Shift the remainder of the week to interview prep (STAR stories) and direct recruiter follow-ups.",
    });
  } else if (forwardCurrent >= 5) {
    insights.push({
      id: "fwd-on-track",
      pillar: "forward",
      badge: "On Pace",
      badgeType: "info",
      title: "Active Pipeline Building",
      summary: `Current pace: ${forwardCurrent} applications logged. With ${forwardTarget - forwardCurrent} more needed to complete the weekly target, you are in the active conversion zone.`,
      takeaway: "Target tailored submissions in the morning focus block (9:00–11:00 AM) to maintain cadence.",
    });
  } else {
    insights.push({
      id: "fwd-surge-needed",
      pillar: "forward",
      badge: "Surge Needed",
      badgeType: "warning",
      title: "Application Pipeline Requires Focus",
      summary: `${forwardCurrent}/${forwardTarget} apps completed this week. At standard response rates (~10-15%), 10 quality weekly applications are required to guarantee 1–2 recruiter screens per sprint.`,
      takeaway: "Use the 1-click unstick templates to tailor resumes for 2 aviation/enterprise roles today.",
    });
  }

  // Insight B: Financial Runway Leverage
  insights.push({
    id: "fin-runway-leverage",
    pillar: "finance",
    badge: runwayStatus === "optimal" ? "Shield Intact" : "Runway Protection",
    badgeType: runwayStatus === "optimal" ? "success" : "warning",
    title: `${runwayDays} Days Runway Buffer ($${dailyBurn}/day burn)`,
    summary: `Liquid cushion ($${checkingBal.toLocaleString()}) shields your family through ${cashZeroDate || "the search window"}. Minimum debt payments protect cash floor while you search.`,
    takeaway: `Every signed PM placement or $1,500 consulting invoice adds ~7 days of pure liquid runway. Career inflection (Forward) is your highest financial shield.`,
  });

  // Insight C: 300 Planners Velocity
  insights.push({
    id: "free-planner-pacing",
    pillar: "freedom",
    badge: "Q4 Sellout Target",
    badgeType: "info",
    title: `${plannersSold}/${plannersTarget} Planners Shipped (${plannersPercent}%)`,
    summary: `${plannersRemaining} planners remaining. To hit the 300 milestone by year-end (~${weeksLeftInYear} weeks), pacing target is ${plannersNeededPerWeek} planners/week (approx 3/day).`,
    takeaway: "Direct institutional outreach (high school cohorts & district guidance heads) provides the multi-unit orders needed to hit this pacing curve.",
  });

  // Insight D: Task Execution & OmniFocus Friction
  if (stalledCount > 0) {
    insights.push({
      id: "of-friction",
      pillar: "execution",
      badge: `${stalledCount} Bottlenecks`,
      badgeType: "warning",
      title: "OmniFocus Projects Awaiting Next Actions",
      summary: `${stalledCount} active priority projects currently have zero open next actions defined in OmniFocus, threatening forward momentum.`,
      takeaway: "Add one atomic next action to each flagged project using the Friction Radar unstick drawer.",
    });
  } else {
    insights.push({
      id: "of-flow",
      pillar: "execution",
      badge: "Zero Friction",
      badgeType: "success",
      title: "All Priorities Have Defined Next Steps",
      summary: `Clean execution state: every active priority has linked, actionable OmniFocus tasks scheduled.`,
      takeaway: "Focus on closing time-blocked items during today's peak circadian energy window.",
    });
  }

  // 5. Strategic Recommendation for the Week
  const strategicFocus = forwardCurrent < forwardTarget
    ? "Forward Cadence: Complete remaining role applications before Friday close to keep recruiters active over the weekend."
    : plannersRemaining > 0
    ? "Freedom Outreach: Send batch pitch emails to 5 school districts to spark 20+ unit bulk orders."
    : "Runway Discipline: Audit Lunch Money recurring debits and preserve cash reserves.";

  return {
    rollup: {
      forward: {
        current: forwardCurrent,
        target: forwardTarget,
        unit: forwardPriority?.unit || "apps / wk",
        percent: forwardPercent,
        totalLogged: totalAppsLogged,
        avgPerWeek: avgAppsPerWeek,
        historyCount: forwardLogs.length,
      },
      freedom: {
        current: plannersSold,
        target: plannersTarget,
        remaining: plannersRemaining,
        percent: plannersPercent,
        weeksLeft: weeksLeftInYear,
        pacingNeededPerWeek: plannersNeededPerWeek,
      },
      finance: {
        runwayDays,
        checkingBal,
        monthlyBurn,
        dailyBurn,
        runwayStatus,
        cashZeroDate,
        totalDebt,
        payoffDate,
      },
      execution: {
        totalTasks,
        completedTasks,
        stalledCount,
      },
    },
    insights,
    strategicFocus,
  };
}
