export const OF_PROJECTS = {
  "📆 Day 2 Day":                         { color: "#64748B" },
  "🔴 Sell 300 Planners 📖":              { color: "#EF4444" },
  "🔴Publish Project Guidance Platform👨‍💻": { color: "#F97316" },
  "🟢Eliminate CC Debt 💳 🚫":            { color: "#22C55E" },
  "⚪️Complete Scrum Master certification": { color: "#94A3B8" },
  "🟢Buy Scan Home🏡":                    { color: "#10B981" },
  "🟢Generate +10% 💵✅":                { color: "#34D399" },
  "🔴Publish KIT/Dunbar Tribe👨‍💻":       { color: "#FB923C" },
  "🟣Cruise Vacation🚢":                  { color: "#A855F7" },
  "💡 Someday / Maybe":                   { color: "#475569" },
};

export function ofColor(project) {
  return (OF_PROJECTS[project] || { color: "#64748B" }).color;
}

export const INITIAL_OF_TASKS = [
  // ── 📆 Day 2 Day ──────────────────────────────────────────────────────────
  { id: "dwM3S3696R3.10", name: "Review and Plan 13 Weeks",                        project: "📆 Day 2 Day", flagged: false, dueDate: "2025-12-28" },
  { id: "p-DxIXfnIj8.32", name: "Review/Plan for the Month 🧐",                   project: "📆 Day 2 Day", flagged: false, dueDate: "2026-01-03" },
  { id: "dXBcYUdFILR.5",  name: "30 day check in with Camiel",                    project: "📆 Day 2 Day", flagged: false, dueDate: "2026-02-28" },
  { id: "cNcbUkWSSy7",    name: "Contact Amex",                                   project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-06" },
  { id: "mMeo0wwtBaG",    name: "Reach out to Cap 1",                             project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-06" },
  { id: "nDcMxhJRDxT",    name: "contact VHI about dental coverage recently",     project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-06" },
  { id: "jQ2cHNAHzfz",    name: "Research Driver Requirements",                   project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-06" },
  { id: "dflLeX2fybx",    name: "Review finances",                                project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-07" },
  { id: "a5dDk9t8bkB",    name: "Shoot Posts",                                    project: "📆 Day 2 Day", flagged: true,  dueDate: "2026-03-07" },
  { id: "iVOmXt1_oE_",    name: "Audit my accomplishments and skills",            project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-07" },
  { id: "lO-lt79f0SK",    name: "Finish DorianOS",                                project: "📆 Day 2 Day", flagged: true,  dueDate: "2026-03-07" },
  { id: "dRpJxgOKzX5",    name: "Plan/Review the Week ✍️",                       project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-08" },
  { id: "c51cUwozVU8",    name: "Project Review",                                 project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-08" },
  { id: "gt9ZD8RoQW1",    name: 'Write my "40 Pages"',                            project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-09" },
  { id: "es1-sOTgHU_",    name: "Cancel Setapp and consider buying individual apps", project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-10" },
  { id: "aylJ3u3LAfy",    name: "Perform a structured personal audit",             project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-11" },
  { id: "aL_XN-P-72Y",    name: "Prepare for Demetra",                            project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-25" },
  { id: "cq45trpTIDS",    name: "How to Restore Recovered Photos Using EXIF Metadata", project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-25" },
  { id: "dwM3S3696R3",    name: "Review and Plan 13 Weeks",                       project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-29" },
  { id: "kwDSo3VJ1mz",    name: "Review routine",                                 project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-31" },
  { id: "dXBcYUdFILR",    name: "30 day check in with Camiel",                    project: "📆 Day 2 Day", flagged: false, dueDate: "2026-03-31" },
  { id: "dosOzYg1pJt",    name: "Pay Georgia Annual Business Filing",             project: "📆 Day 2 Day", flagged: false, dueDate: "2026-04-01" },
  { id: "hzk-CjEq43L",    name: "Deep Room organization",                         project: "📆 Day 2 Day", flagged: false, dueDate: "2026-04-05" },
  { id: "fmHiRJnnfib",    name: "Call Cool-Ray",                                  project: "📆 Day 2 Day", flagged: false, dueDate: "2026-04-12" },
  { id: "mvehNoctJTj",    name: "Update Bio",                                     project: "📆 Day 2 Day", flagged: false, dueDate: "2026-04-20" },
  { id: "p-DxIXfnIj8",    name: "Review/Plan for the Month 🧐",                  project: "📆 Day 2 Day", flagged: false, dueDate: "2026-04-26" },
  { id: "jhAB7q3CnBJ",    name: "Golf head swap",                                 project: "📆 Day 2 Day", flagged: false, dueDate: "2026-05-30" },
  { id: "dNiLq3_SH4A",    name: "Pay Registered Agent",                           project: "📆 Day 2 Day", flagged: false, dueDate: "2028-04-01" },
  // No-date Day 2 Day
  { id: "hr4-G8mjFpw",    name: "Reach out to MyDelta for HSA",                   project: "📆 Day 2 Day", flagged: false, dueDate: null },
  { id: "aJfpE_MHyEA",    name: "Contacting UMR",                                 project: "📆 Day 2 Day", flagged: false, dueDate: null },
  { id: "lveblyTpVRj",    name: "Call for floor plans",                           project: "📆 Day 2 Day", flagged: false, dueDate: null },
  { id: "fd2u6UG5zkV",    name: "Choose investments from Zurich and send to CFP", project: "📆 Day 2 Day", flagged: false, dueDate: null },
  { id: "fb0btma8ISj",    name: "Check revenue.ie",                               project: "📆 Day 2 Day", flagged: false, dueDate: null },
  { id: "lIYSubWpkIy",    name: "Finish PowerPoint",                              project: "📆 Day 2 Day", flagged: false, dueDate: null },
  { id: "oaHq_tj1pMx",    name: "Digital Tools Audit",                            project: "📆 Day 2 Day", flagged: false, dueDate: null },
  { id: "cn2EiZGmGhv",    name: "Owe Inish $400",                                 project: "📆 Day 2 Day", flagged: true,  dueDate: null },

  // ── 🔴 Sell 300 Planners ──────────────────────────────────────────────────
  { id: "ieb6qJDeADF",    name: "Publish From the Ground Up newsletter",          project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: "2026-03-06" },
  { id: "mbKL0-n0rxu",    name: "Batch shoot content for the week",               project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: "2026-03-07" },
  { id: "ay_Heuqd2y0",    name: "Post Instagram content",                         project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: "2026-03-07" },
  { id: "nkojUErOWVE",    name: "Resolve Email Issue",                            project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: "2026-03-08" },
  { id: "iJ_UgnxUcLV",    name: "Check remaining planner inventory & update sales count", project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: "2026-03-08" },
  { id: "k3b3XV9z__t",    name: "DM 5 past planner buyers for testimonials/photos", project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: null },
  { id: "c1NZcfhTNje",    name: "Decide: bundle deal or scarcity play for final inventory", project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: null },
  { id: "gmq8AcLxbqr",    name: "Write the 'why I created this planner' origin post", project: "🔴 Sell 300 Planners 📖", flagged: false, dueDate: null },

  // ── 🔴 Publish Project Guidance ───────────────────────────────────────────
  { id: "nLZgvXlLiL1",    name: "Work on pm platform",                            project: "🔴Publish Project Guidance Platform👨‍💻", flagged: true, dueDate: "2026-03-06" },

  // ── 🟢 Eliminate CC Debt ──────────────────────────────────────────────────
  { id: "emguwrDgKeO",    name: "Payoff AMEX",                                    project: "🟢Eliminate CC Debt 💳 🚫", flagged: false, dueDate: "2026-03-31" },
  { id: "jTC2PszLEKk",    name: "Payoff Apple",                                   project: "🟢Eliminate CC Debt 💳 🚫", flagged: false, dueDate: null },

  // ── ⚪️ Scrum Master ──────────────────────────────────────────────────────
  { id: "aNut0afK0r1",    name: "Complete Scrum Master certification",            project: "⚪️Complete Scrum Master certification", flagged: false, dueDate: null },
  { id: "eiRUnOMJDcv",    name: "Take Practice Test",                             project: "⚪️Complete Scrum Master certification", flagged: false, dueDate: null },
  { id: "lmhvcOw9GWi",    name: "Study (What does this look like?)",              project: "⚪️Complete Scrum Master certification", flagged: false, dueDate: null },
  { id: "oywZzlTkZ1s",    name: "Schedule Test",                                  project: "⚪️Complete Scrum Master certification", flagged: false, dueDate: null },
  { id: "iMLey5junIZ",    name: "Pass Test",                                      project: "⚪️Complete Scrum Master certification", flagged: false, dueDate: null },

  // ── 🟢 Buy Scan Home ──────────────────────────────────────────────────────
  { id: "ovAzDvcYBiw",    name: "Buy Scan Home 🏡",                               project: "🟢Buy Scan Home🏡", flagged: false, dueDate: "2026-03-15" },
  { id: "oqhWnbVyjiE",    name: "Decide scan home type",                          project: "🟢Buy Scan Home🏡", flagged: false, dueDate: null },
  { id: "fql0TxM27YM",    name: "Design the home",                                project: "🟢Buy Scan Home🏡", flagged: false, dueDate: null },
  { id: "k4FKo4X15jp",    name: "Mortgage",                                       project: "🟢Buy Scan Home🏡", flagged: false, dueDate: null },

  // ── 🟢 Generate +10% ─────────────────────────────────────────────────────
  { id: "naXlY-d6ORw",    name: "Generate $500 extra per month",                  project: "🟢Generate +10% 💵✅", flagged: false, dueDate: null },
  { id: "p_7G0IfwP-R",    name: "Check UserTesting",                              project: "🟢Generate +10% 💵✅", flagged: false, dueDate: null },
  { id: "coMqPyisx2l",    name: "Explore freelance jobs",                         project: "🟢Generate +10% 💵✅", flagged: false, dueDate: null },

  // ── 🟣 Cruise Vacation ────────────────────────────────────────────────────
  { id: "k0sLEkAedZY",    name: "Cruise Vacation 🚢",                             project: "🟣Cruise Vacation🚢", flagged: false, dueDate: "2027-12-31" },
];
