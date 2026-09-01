export const OF_PROJECTS = {
  "📥 Inbox":                             { color: "#3B82F6" },
  "📆 Day 2 Day":                         { color: "#64748B" },
  "⚪️1. Find Next Role ▶️":               { color: "#94A3B8" },
  "🟢2. Financial Health 💳 🚫":          { color: "#22C55E" },
  "🔴3. Sell 300 Planners 📖":            { color: "#EF4444" },
  "💡 Someday / Maybe":                   { color: "#F59E0B" },
  "🔵Fortitude 🚀":                       { color: "#3B82F6" },
  "🟣Family 👨‍👩‍👧":                         { color: "#A855F7" },
};

export function ofColor(project) {
  if (!project) return "#64748B";
  if (OF_PROJECTS[project]) return OF_PROJECTS[project].color;
  if (project.includes("🔴")) return "#EF4444";
  if (project.includes("🟢")) return "#22C55E";
  if (project.includes("🔵")) return "#3B82F6";
  if (project.includes("🟣")) return "#A855F7";
  if (project.includes("⚪️") || project.includes("⚪")) return "#94A3B8";
  if (project.includes("💡")) return "#F59E0B";
  if (project.includes("📥")) return "#3B82F6";
  return "#64748B";
}

export const INITIAL_OF_TASKS = [
  {
    "id": "gKV4ZCRY4s0",
    "name": "Check Allstate site for documents",
    "project": "📥 Inbox",
    "dueDate": "2026-08-29",
    "flagged": false
  },
  {
    "id": "jEwKTc9njsN",
    "name": "Linked in learning",
    "project": "📥 Inbox",
    "dueDate": "2026-08-28",
    "flagged": false
  },
  {
    "id": "a0-Z3j-EdJf",
    "name": "Review growth and marketing on app connect for All 168 ",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "oLh0iLA4gRA",
    "name": "https://chatgpt.com/share/6a909e02-eeec-83eb-a73f-d02edf90c647",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "m5Sur6ZgUjs",
    "name": "study comms ",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "bHmAAbU5Pfx",
    "name": "Make time to review notes and lessons learned",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "celrrIQIQlu",
    "name": "Continue exploring video that may be business related - I left off January 2025",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "hzk-CjEq43L",
    "name": "Deep Room organization",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "lIYSubWpkIy",
    "name": "Inish PowerPoint ",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "gt9ZD8RoQW1",
    "name": "Write my “40 Pages”",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "aylJ3u3LAfy",
    "name": "Perform a structured personal audit",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "ceEXl_aHrGw",
    "name": "Claude Code with Deepseek",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "ezM-9_bvNGb",
    "name": "What do I need to do about my taxes next year considering I have no US income ? Business problem. ",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "fb0btma8ISj",
    "name": "Poke around revenue.ie",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "jhAB7q3CnBJ",
    "name": "Golf head swap",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "bR9JIRWUkcp",
    "name": "Download Peaks after Rise expires",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "dflLeX2fybx",
    "name": "Review finances",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-08-29",
    "flagged": false
  },
  {
    "id": "p-DxIXfnIj8",
    "name": "Review/Plan for the Month 🧐",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-08-30",
    "flagged": false
  },
  {
    "id": "iEbLLKoRUP8",
    "name": "Oil order - how to pay for it?",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-08-31",
    "flagged": true
  },
  {
    "id": "bnc0rXOG7QF",
    "name": "Text Clare Mee",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-08-31",
    "flagged": false
  },
  {
    "id": "o4U8W9jUVFt",
    "name": "Call vhi dental 046 907 7337",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-01",
    "flagged": false
  },
  {
    "id": "pqFa4eeU2Y6",
    "name": "Update portfolio - in progress as of 8/19",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-01",
    "flagged": false
  },
  {
    "id": "aQl08TmgXi5",
    "name": "Consider RF Wilkins",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-01",
    "flagged": false
  },
  {
    "id": "gcaRZqU_LHU",
    "name": "LinkedIn Post",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-01",
    "flagged": false
  },
  {
    "id": "aL_XN-P-72Y",
    "name": "Prepare for Demetra",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-03",
    "flagged": false
  },
  {
    "id": "h9fI_7ray4g",
    "name": "Call Aspire to confirm letter reception. ",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-03",
    "flagged": false
  },
  {
    "id": "dRpJxgOKzX5",
    "name": "Plan/Review the Week ✍️",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-06",
    "flagged": false
  },
  {
    "id": "c51cUwozVU8",
    "name": "Project Review",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-06",
    "flagged": false
  },
  {
    "id": "mvehNoctJTj",
    "name": "Update Bio",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-07",
    "flagged": false
  },
  {
    "id": "es1-sOTgHU_",
    "name": "Cancel Setapp and consider buying indvidual apps",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-10",
    "flagged": false
  },
  {
    "id": "ikrQtAs6nMO",
    "name": "Cancel Apple TV",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-12",
    "flagged": false
  },
  {
    "id": "egNl6IJyNjl",
    "name": "Cancel runway September 18th ",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-18",
    "flagged": false
  },
  {
    "id": "dwM3S3696R3",
    "name": "Review and Plan 13 Weeks",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-09-27",
    "flagged": false
  },
  {
    "id": "fmHiRJnnfib",
    "name": "Call Cool-Ray",
    "project": "📆 Day 2 Day",
    "dueDate": "2026-10-11",
    "flagged": false
  },
  {
    "id": "dosOzYg1pJt",
    "name": "Pay Georgia Annual Business Filing",
    "project": "📆 Day 2 Day",
    "dueDate": "2027-03-29",
    "flagged": false
  },
  {
    "id": "dNiLq3_SH4A",
    "name": "Pay Registered Agent",
    "project": "📆 Day 2 Day",
    "dueDate": "2028-04-01",
    "flagged": false
  },
  {
    "id": "aoYD1erWmiW",
    "name": "Fortitude mind right",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "eo6GT1B0J0z",
    "name": "Family ?",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "pjkprklpt_M",
    "name": "Finance - daily check",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "phuNNziynW-",
    "name": "Forward - do the job search",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "eIGn9TVna3R",
    "name": "Freedom - get that biz off the ground",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "eLrE1jZkyym",
    "name": "Fortitude - wind down",
    "project": "📆 Day 2 Day",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "jhkjtpBlgb_",
    "name": "Apply to work",
    "project": "⚪️1. Find Next Role ▶️",
    "dueDate": "2026-09-02",
    "flagged": false
  },
  {
    "id": "gz-olQ-gsJW",
    "name": "Audit website conversion (traffic → checkout)",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "aBNHkEkMP7g",
    "name": "Evaluate all channels: newsletter, IG, website, DM",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "mURRWX0dXpa",
    "name": "Pick 1-2 channels to double down on",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "ay_Heuqd2y0",
    "name": "Post Instagram content",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": "2026-08-29",
    "flagged": false
  },
  {
    "id": "ieb6qJDeADF",
    "name": "Publish From the Ground Up newsletter",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": "2026-08-28",
    "flagged": false
  },
  {
    "id": "k3b3XV9z__t",
    "name": "DM 5 past planner buyers for testimonials/photos",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "c1NZcfhTNje",
    "name": "Decide: bundle deal or scarcity play for final inventory",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "gmq8AcLxbqr",
    "name": "Write the 'why I created this planner' origin post",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": null,
    "flagged": false
  },
  {
    "id": "a5dDk9t8bkB",
    "name": "Shoot Posts Or Compile Existing Media",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": "2026-08-28",
    "flagged": false
  },
  {
    "id": "bIAjE0lN6Kf",
    "name": "📊 Weekly sales + subscriber metrics review (recurring)",
    "project": "🔴3. Sell 300 Planners 📖",
    "dueDate": null,
    "flagged": false
  }
];
