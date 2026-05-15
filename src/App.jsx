import { useState, useMemo, useCallback, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TODAY = new Date(2026, 1, 28);
const EUR = 1.182;
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function fmt(n) { return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.abs(n)); }
function fmtFull(n) { return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n); }
function fmtSigned(n) { return (n>=0?"+":"-")+fmt(n); }
const uid = () => Math.random().toString(36).slice(2,9);

// ─── Themes ──────────────────────────────────────────────────────────────────
const THEMES = {
  night: {
    label:"Night", icon:"🌑",
    bg:"#050e06", surface:"#0a180a", surface2:"#0d1f0f",
    border:"#0d1f0d", border2:"#1a2e1a", border3:"#2d5a2d",
    text:"#e2f4e2", textSub:"#86EFAC", textMuted:"#6a8a6a", textDim:"#4a6a4a", textFaint:"#2d5a2d",
    accent:"#4ADE80", accentSub:"#34D399", accentLight:"#6EE7B7",
    danger:"#F87171", dangerBg:"#F8717114", dangerBd:"#F8717133",
    warning:"#FB923C", chartGrid:"#1a2e1a", chartAxis:"#2d5a2d",
    cellHover:"#081408", cellDrag:"#0d2a0d", cellSel:"#0a1e0a",
    inputBg:"#0d1f0f", inputBd:"#2d5a2d", scrollThumb:"#2d5a2d",
  },
  slate: {
    label:"Slate", icon:"🌙",
    bg:"#0f1117", surface:"#16181f", surface2:"#1c1f2b",
    border:"#1c1f2b", border2:"#252a3a", border3:"#374151",
    text:"#e2e8f0", textSub:"#cbd5e1", textMuted:"#94a3b8", textDim:"#64748b", textFaint:"#374151",
    accent:"#38bdf8", accentSub:"#7dd3fc", accentLight:"#bae6fd",
    danger:"#f87171", dangerBg:"#f8717114", dangerBd:"#f8717133",
    warning:"#fb923c", chartGrid:"#1e2433", chartAxis:"#374151",
    cellHover:"#1a1d28", cellDrag:"#0d1a2e", cellSel:"#141829",
    inputBg:"#1c1f2b", inputBd:"#374151", scrollThumb:"#374151",
  },
  paper: {
    label:"Paper", icon:"☀️",
    bg:"#f8fafc", surface:"#ffffff", surface2:"#f1f5f9",
    border:"#e8ecf0", border2:"#e2e8f0", border3:"#cbd5e1",
    text:"#0f172a", textSub:"#1e293b", textMuted:"#475569", textDim:"#64748b", textFaint:"#94a3b8",
    accent:"#059669", accentSub:"#10b981", accentLight:"#34d399",
    danger:"#dc2626", dangerBg:"#fef2f2", dangerBd:"#fecaca",
    warning:"#d97706", chartGrid:"#e2e8f0", chartAxis:"#cbd5e1",
    cellHover:"#f8fafc", cellDrag:"#ecfdf5", cellSel:"#f0fdf4",
    inputBg:"#ffffff", inputBd:"#cbd5e1", scrollThumb:"#cbd5e1",
  },
};

// ─── Debt data ────────────────────────────────────────────────────────────────
const INITIAL_DEBTS = [
  { id:1, name:"AMEX Biz Platinum",    balance:12344.95, apr:29.99, minPayment:250 },
  { id:2, name:"AMEX Delta Platinum",  balance:6087.46,  apr:29.99, minPayment:130 },
  { id:3, name:"Apple Card",           balance:5034.13,  apr:24.99, minPayment:110 },
  { id:4, name:"NBKC Accounts Payable",balance:246.11,   apr:19.99, minPayment:25  },
  { id:5, name:"PayPal Smart Connect", balance:189.41,   apr:23.99, minPayment:25  },
  { id:6, name:"Capital One Spark",    balance:79.07,    apr:26.99, minPayment:25  },
  { id:7, name:"Amazon Store Card",    balance:35.86,    apr:29.99, minPayment:25  },
  { id:8, name:"NBKC Business CC",     balance:35.48,    apr:19.99, minPayment:25  },
];
const DEBT_COLORS = ["#4ADE80","#34D399","#6EE7B7","#86EFAC","#A3E635","#FCD34D","#FB923C","#F87171"];

function computeAmortization(debts, strategy, extraPayment) {
  let accounts = debts.filter(d=>d.balance>0).map(d=>({...d,remaining:d.balance,totalPaid:0,totalInterest:0,paidOffMonth:null}));
  const totalMin = accounts.reduce((s,d)=>s+d.minPayment,0);
  const monthlyBudget = totalMin + extraPayment;
  const schedule = []; let month = 0;
  while (accounts.some(a=>a.remaining>0.005) && month<360) {
    month++;
    accounts = accounts.map(a => {
      if (a.remaining<=0) return a;
      const interest = (a.remaining*a.apr)/100/12;
      const nr = a.remaining+interest;
      const pmt = Math.min(a.minPayment, nr);
      return {...a,remaining:nr-pmt,totalPaid:a.totalPaid+pmt,totalInterest:a.totalInterest+interest,_interestThisMonth:interest,_minPaid:pmt};
    });
    let avail = monthlyBudget - accounts.reduce((s,a)=>s+(a._minPaid||0),0);
    let sorted = [...accounts];
    if (strategy==="avalanche") sorted.sort((a,b)=>b.apr-a.apr);
    else if (strategy==="snowball") sorted.sort((a,b)=>a.remaining-b.remaining);
    for (let acc of sorted) {
      if (avail<=0.005||acc.remaining<=0) continue;
      const idx = accounts.findIndex(a=>a.id===acc.id);
      const ex = Math.min(avail, accounts[idx].remaining);
      accounts[idx].remaining-=ex; accounts[idx].totalPaid+=ex; avail-=ex;
    }
    accounts = accounts.map(a=>({...a,remaining:Math.max(0,a.remaining),paidOffMonth:a.paidOffMonth!==null?a.paidOffMonth:a.remaining<=0.005?month:null}));
    const totalRemaining = accounts.reduce((s,a)=>s+a.remaining,0);
    const totalInterest  = accounts.reduce((s,a)=>s+(a._interestThisMonth||0),0);
    const pt = {month,totalRemaining,totalInterest,monthlyBudget};
    accounts.forEach(a=>{ pt[a.name]=parseFloat(a.remaining.toFixed(2)); });
    schedule.push(pt);
  }
  return {schedule, accounts, monthlyBudget};
}

// ─── Cash flow recurring data ─────────────────────────────────────────────────
const CATEGORY_COLORS = {
  Debt:"#F87171", Housing:"#FB923C", Bills:"#FBBF24",
  Subscription:"#60A5FA", Business:"#A78BFA", Savings:"#34D399",
  Giving:"#F472B6", income:"#4ADE80", Manual:"#94A3B8",
};

const LM_RECURRING = [
  {id:"lm-afa-mar",payee:"AFA ORTIZ",amount:950,date:"2026-03-03",type:"income",source:"lunchmoney"},
  {id:"lm-salary-mar",payee:"AMACH Salary",amount:+(5000*EUR).toFixed(2),date:"2026-03-28",type:"income",source:"lunchmoney"},
  {id:"lm-afa-apr",payee:"AFA ORTIZ",amount:950,date:"2026-04-03",type:"income",source:"lunchmoney"},
  {id:"lm-salary-apr",payee:"AMACH Salary",amount:+(5000*EUR).toFixed(2),date:"2026-04-28",type:"income",source:"lunchmoney"},
  {id:"lm-amex-biz-mar",payee:"AMEX Biz Platinum",amount:1600,date:"2026-03-01",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-nbkc-mar",payee:"NBKC Card",amount:60,date:"2026-03-01",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-co-spark-mar",payee:"Capital One Spark",amount:60,date:"2026-03-01",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-chatgpt-mar",payee:"ChatGPT",amount:20,date:"2026-03-01",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-mortgage-mar",payee:"Rocket Mortgage",amount:937.17,date:"2026-03-02",type:"expense",source:"lunchmoney",category:"Housing"},
  {id:"lm-icloud-mar",payee:"iCloud+ 2TB",amount:9.99,date:"2026-03-03",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-stjude-mar",payee:"St Jude",amount:10.20,date:"2026-03-03",type:"expense",source:"lunchmoney",category:"Giving"},
  {id:"lm-irish-mar",payee:"Irish Bills",amount:+(1300*EUR).toFixed(2),date:"2026-03-04",type:"expense",source:"lunchmoney",category:"Housing"},
  {id:"lm-klarna-mar",payee:"Klarna (water filter)",amount:+(99.66*EUR).toFixed(2),date:"2026-03-04",type:"expense",source:"lunchmoney",category:"Bills"},
  {id:"lm-amzn-prime-mar",payee:"Amazon Prime",amount:8,date:"2026-03-06",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-proton-mar",payee:"Proton Mail",amount:12.99,date:"2026-03-06",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-sq-url",payee:"Squarespace URL",amount:20,date:"2026-03-06",type:"expense",source:"lunchmoney",category:"Business"},
  {id:"lm-sq-annual",payee:"Squarespace (annual)",amount:300,date:"2026-03-06",type:"expense",source:"lunchmoney",category:"Business"},
  {id:"lm-notion-mar",payee:"Notion",amount:10,date:"2026-03-11",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-arcade-mar",payee:"Apple Arcade",amount:6.99,date:"2026-03-14",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-tmob-mar",payee:"T-Mobile",amount:35,date:"2026-03-15",type:"expense",source:"lunchmoney",category:"Bills"},
  {id:"lm-amex-delta-mar",payee:"AMEX Delta Platinum",amount:500,date:"2026-03-15",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-amzn-store-mar",payee:"Amazon Store Card",amount:264.50,date:"2026-03-16",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-claude-mar",payee:"Claude AI",amount:20,date:"2026-03-17",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-setapp-mar",payee:"Setapp",amount:12.49,date:"2026-03-18",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-applecare-mar",payee:"AppleCare One",amount:19.99,date:"2026-03-19",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-fidelity-mar",payee:"Fidelity 401k",amount:800,date:"2026-03-21",type:"expense",source:"lunchmoney",category:"Savings"},
  {id:"lm-tello-mar",payee:"Tello (Biz)",amount:6.92,date:"2026-03-21",type:"expense",source:"lunchmoney",category:"Bills"},
  {id:"lm-iptv-mar",payee:"UHF IPTV",amount:1.99,date:"2026-03-23",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-aspire-mar",payee:"Aspire Student Loans",amount:370,date:"2026-03-26",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-disney-mar",payee:"Disney+",amount:21.99,date:"2026-03-26",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-vidiq-mar",payee:"VidIQ",amount:7.50,date:"2026-03-26",type:"expense",source:"lunchmoney",category:"Business"},
  {id:"lm-amex-biz2-mar",payee:"AMEX Biz Platinum (2)",amount:500,date:"2026-03-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-spark2-mar",payee:"Capital One Spark (2)",amount:257.50,date:"2026-03-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-applecard-mar",payee:"Apple Card",amount:300,date:"2026-03-31",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-amex-biz-apr",payee:"AMEX Biz Platinum",amount:1600,date:"2026-04-01",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-nbkc-apr",payee:"NBKC Card",amount:60,date:"2026-04-01",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-spark-apr",payee:"Capital One Spark",amount:60,date:"2026-04-01",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-chatgpt-apr",payee:"ChatGPT",amount:20,date:"2026-04-01",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-canva-apr",payee:"Canva (annual)",amount:119.99,date:"2026-04-02",type:"expense",source:"lunchmoney",category:"Business"},
  {id:"lm-ga-apr",payee:"GA Corp Registration",amount:55,date:"2026-04-02",type:"expense",source:"lunchmoney",category:"Business"},
  {id:"lm-mortgage-apr",payee:"Rocket Mortgage",amount:937.17,date:"2026-04-02",type:"expense",source:"lunchmoney",category:"Housing"},
  {id:"lm-icloud-apr",payee:"iCloud+ 2TB",amount:9.99,date:"2026-04-03",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-stjude-apr",payee:"St Jude",amount:10.20,date:"2026-04-03",type:"expense",source:"lunchmoney",category:"Giving"},
  {id:"lm-irish-apr",payee:"Irish Bills",amount:+(1300*EUR).toFixed(2),date:"2026-04-04",type:"expense",source:"lunchmoney",category:"Housing"},
  {id:"lm-klarna-apr",payee:"Klarna (water filter)",amount:+(99.66*EUR).toFixed(2),date:"2026-04-04",type:"expense",source:"lunchmoney",category:"Bills"},
  {id:"lm-amzn-prime-apr",payee:"Amazon Prime",amount:8,date:"2026-04-06",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-proton-apr",payee:"Proton Mail",amount:12.99,date:"2026-04-06",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-notion-apr",payee:"Notion",amount:10,date:"2026-04-11",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-arcade-apr",payee:"Apple Arcade",amount:6.99,date:"2026-04-14",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-tmob-apr",payee:"T-Mobile",amount:35,date:"2026-04-15",type:"expense",source:"lunchmoney",category:"Bills"},
  {id:"lm-amex-delta-apr",payee:"AMEX Delta Platinum",amount:500,date:"2026-04-15",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-gfl-apr",payee:"GFL Environmental",amount:67.50,date:"2026-04-15",type:"expense",source:"lunchmoney",category:"Bills"},
  {id:"lm-amzn-store-apr",payee:"Amazon Store Card",amount:264.50,date:"2026-04-16",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-claude-apr",payee:"Claude AI",amount:20,date:"2026-04-17",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-setapp-apr",payee:"Setapp",amount:12.49,date:"2026-04-18",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-applecare-apr",payee:"AppleCare One",amount:19.99,date:"2026-04-19",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-1pw-apr",payee:"1Password (annual)",amount:35.88,date:"2026-04-20",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-fidelity-apr",payee:"Fidelity 401k",amount:800,date:"2026-04-21",type:"expense",source:"lunchmoney",category:"Savings"},
  {id:"lm-tello-apr",payee:"Tello (Biz)",amount:6.92,date:"2026-04-21",type:"expense",source:"lunchmoney",category:"Bills"},
  {id:"lm-iptv-apr",payee:"UHF IPTV",amount:1.99,date:"2026-04-23",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-aspire-apr",payee:"Aspire Student Loans",amount:370,date:"2026-04-26",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-disney-apr",payee:"Disney+",amount:21.99,date:"2026-04-26",type:"expense",source:"lunchmoney",category:"Subscription"},
  {id:"lm-vidiq-apr",payee:"VidIQ",amount:7.50,date:"2026-04-26",type:"expense",source:"lunchmoney",category:"Business"},
  {id:"lm-amex-biz2-apr",payee:"AMEX Biz Platinum (2)",amount:500,date:"2026-04-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-spark2-apr",payee:"Capital One Spark (2)",amount:257.50,date:"2026-04-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-applecard-apr",payee:"Apple Card",amount:300,date:"2026-04-30",type:"expense",source:"lunchmoney",category:"Debt"},
];

// ─── OmniFocus data (real IDs from OF export) ────────────────────────────────
const OF_PROJECTS = {
  "📆 Day 2 Day":                        { color:"#64748B" },
  "🔴 Sell 300 Planners 📖":             { color:"#EF4444" },
  "🔴Publish Project Guidance Platform👨‍💻":{ color:"#F97316" },
  "🟢Eliminate CC Debt 💳 🚫":           { color:"#22C55E" },
  "⚪️Complete Scrum Master certification":{ color:"#94A3B8" },
  "🟢Buy Scan Home🏡":                   { color:"#10B981" },
  "🟢Generate +10% 💵✅":               { color:"#34D399" },
  "🔴Publish KIT/Dunbar Tribe👨‍💻":      { color:"#FB923C" },
  "🟣Cruise Vacation🚢":                 { color:"#A855F7" },
  "💡 Someday / Maybe":                  { color:"#475569" },
};
function ofColor(project) { return (OF_PROJECTS[project]||{color:"#64748B"}).color; }

const INITIAL_OF_TASKS = [
  // ── 📆 Day 2 Day ──────────────────────────────────────────────────────────
  {id:"dwM3S3696R3.10", name:"Review and Plan 13 Weeks",                        project:"📆 Day 2 Day", flagged:false, dueDate:"2025-12-28"},
  {id:"p-DxIXfnIj8.32", name:"Review/Plan for the Month 🧐",                   project:"📆 Day 2 Day", flagged:false, dueDate:"2026-01-03"},
  {id:"dXBcYUdFILR.5",  name:"30 day check in with Camiel",                    project:"📆 Day 2 Day", flagged:false, dueDate:"2026-02-28"},
  {id:"cNcbUkWSSy7",    name:"Contact Amex",                                    project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-06"},
  {id:"mMeo0wwtBaG",    name:"Reach out to Cap 1",                              project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-06"},
  {id:"nDcMxhJRDxT",    name:"contact VHI about dental coverage recently",      project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-06"},
  {id:"jQ2cHNAHzfz",    name:"Research Driver Requirements",                    project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-06"},
  {id:"dflLeX2fybx",    name:"Review finances",                                 project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-07"},
  {id:"a5dDk9t8bkB",    name:"Shoot Posts",                                     project:"📆 Day 2 Day", flagged:true,  dueDate:"2026-03-07"},
  {id:"iVOmXt1_oE_",    name:"Audit my accomplishments and skills",             project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-07"},
  {id:"lO-lt79f0SK",    name:"Finish DorianOS",                                 project:"📆 Day 2 Day", flagged:true,  dueDate:"2026-03-07"},
  {id:"dRpJxgOKzX5",    name:"Plan/Review the Week ✍️",                        project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-08"},
  {id:"c51cUwozVU8",    name:"Project Review",                                  project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-08"},
  {id:"gt9ZD8RoQW1",    name:'Write my "40 Pages"',                             project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-09"},
  {id:"es1-sOTgHU_",    name:"Cancel Setapp and consider buying individual apps",project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-10"},
  {id:"aylJ3u3LAfy",    name:"Perform a structured personal audit",              project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-11"},
  {id:"aL_XN-P-72Y",    name:"Prepare for Demetra",                             project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-25"},
  {id:"cq45trpTIDS",    name:"How to Restore Recovered Photos Using EXIF Metadata",project:"📆 Day 2 Day",flagged:false,dueDate:"2026-03-25"},
  {id:"dwM3S3696R3",    name:"Review and Plan 13 Weeks",                        project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-29"},
  {id:"kwDSo3VJ1mz",    name:"Review routine",                                  project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-31"},
  {id:"dXBcYUdFILR",    name:"30 day check in with Camiel",                     project:"📆 Day 2 Day", flagged:false, dueDate:"2026-03-31"},
  {id:"dosOzYg1pJt",    name:"Pay Georgia Annual Business Filing",              project:"📆 Day 2 Day", flagged:false, dueDate:"2026-04-01"},
  {id:"hzk-CjEq43L",    name:"Deep Room organization",                          project:"📆 Day 2 Day", flagged:false, dueDate:"2026-04-05"},
  {id:"fmHiRJnnfib",    name:"Call Cool-Ray",                                   project:"📆 Day 2 Day", flagged:false, dueDate:"2026-04-12"},
  {id:"mvehNoctJTj",    name:"Update Bio",                                      project:"📆 Day 2 Day", flagged:false, dueDate:"2026-04-20"},
  {id:"p-DxIXfnIj8",    name:"Review/Plan for the Month 🧐",                   project:"📆 Day 2 Day", flagged:false, dueDate:"2026-04-26"},
  {id:"jhAB7q3CnBJ",    name:"Golf head swap",                                  project:"📆 Day 2 Day", flagged:false, dueDate:"2026-05-30"},
  {id:"dNiLq3_SH4A",    name:"Pay Registered Agent",                            project:"📆 Day 2 Day", flagged:false, dueDate:"2028-04-01"},
  // No-date Day 2 Day
  {id:"hr4-G8mjFpw",    name:"Reach out to MyDelta for HSA",                    project:"📆 Day 2 Day", flagged:false, dueDate:null},
  {id:"aJfpE_MHyEA",    name:"Contacting UMR",                                  project:"📆 Day 2 Day", flagged:false, dueDate:null},
  {id:"lveblyTpVRj",    name:"Call for floor plans",                            project:"📆 Day 2 Day", flagged:false, dueDate:null},
  {id:"fd2u6UG5zkV",    name:"Choose investments from Zurich and send to CFP",  project:"📆 Day 2 Day", flagged:false, dueDate:null},
  {id:"fb0btma8ISj",    name:"Check revenue.ie",                                project:"📆 Day 2 Day", flagged:false, dueDate:null},
  {id:"lIYSubWpkIy",    name:"Finish PowerPoint",                               project:"📆 Day 2 Day", flagged:false, dueDate:null},
  {id:"oaHq_tj1pMx",    name:"Digital Tools Audit",                             project:"📆 Day 2 Day", flagged:false, dueDate:null},
  {id:"cn2EiZGmGhv",    name:"Owe Inish $400",                                  project:"📆 Day 2 Day", flagged:true,  dueDate:null},

  // ── 🔴 Sell 300 Planners ──────────────────────────────────────────────────
  {id:"ieb6qJDeADF",    name:"Publish From the Ground Up newsletter",           project:"🔴 Sell 300 Planners 📖", flagged:false, dueDate:"2026-03-06"},
  {id:"mbKL0-n0rxu",    name:"Batch shoot content for the week",                project:"🔴 Sell 300 Planners 📖", flagged:false, dueDate:"2026-03-07"},
  {id:"ay_Heuqd2y0",    name:"Post Instagram content",                          project:"🔴 Sell 300 Planners 📖", flagged:false, dueDate:"2026-03-07"},
  {id:"nkojUErOWVE",    name:"Resolve Email Issue",                             project:"🔴 Sell 300 Planners 📖", flagged:false, dueDate:"2026-03-08"},
  {id:"iJ_UgnxUcLV",    name:"Check remaining planner inventory & update sales count", project:"🔴 Sell 300 Planners 📖", flagged:false, dueDate:"2026-03-08"},
  {id:"k3b3XV9z__t",    name:"DM 5 past planner buyers for testimonials/photos",project:"🔴 Sell 300 Planners 📖", flagged:false, dueDate:null},
  {id:"c1NZcfhTNje",    name:"Decide: bundle deal or scarcity play for final inventory",project:"🔴 Sell 300 Planners 📖",flagged:false,dueDate:null},
  {id:"gmq8AcLxbqr",    name:"Write the 'why I created this planner' origin post",project:"🔴 Sell 300 Planners 📖",flagged:false,dueDate:null},

  // ── 🔴 Publish Project Guidance ───────────────────────────────────────────
  {id:"nLZgvXlLiL1",    name:"Work on pm platform",                             project:"🔴Publish Project Guidance Platform👨‍💻", flagged:true, dueDate:"2026-03-06"},

  // ── 🟢 Eliminate CC Debt ──────────────────────────────────────────────────
  {id:"emguwrDgKeO",    name:"Payoff AMEX",                                     project:"🟢Eliminate CC Debt 💳 🚫", flagged:false, dueDate:"2026-03-31"},
  {id:"jTC2PszLEKk",    name:"Payoff Apple",                                    project:"🟢Eliminate CC Debt 💳 🚫", flagged:false, dueDate:null},

  // ── ⚪️ Scrum Master ──────────────────────────────────────────────────────
  {id:"aNut0afK0r1",    name:"Complete Scrum Master certification",             project:"⚪️Complete Scrum Master certification", flagged:false, dueDate:null},
  {id:"eiRUnOMJDcv",    name:"Take Practice Test",                              project:"⚪️Complete Scrum Master certification", flagged:false, dueDate:null},
  {id:"lmhvcOw9GWi",    name:"Study (What does this look like?)",               project:"⚪️Complete Scrum Master certification", flagged:false, dueDate:null},
  {id:"oywZzlTkZ1s",    name:"Schedule Test",                                   project:"⚪️Complete Scrum Master certification", flagged:false, dueDate:null},
  {id:"iMLey5junIZ",    name:"Pass Test",                                       project:"⚪️Complete Scrum Master certification", flagged:false, dueDate:null},

  // ── 🟢 Buy Scan Home ──────────────────────────────────────────────────────
  {id:"ovAzDvcYBiw",    name:"Buy Scan Home 🏡",                                project:"🟢Buy Scan Home🏡", flagged:false, dueDate:"2026-03-15"},
  {id:"oqhWnbVyjiE",    name:"Decide scan home type",                           project:"🟢Buy Scan Home🏡", flagged:false, dueDate:null},
  {id:"fql0TxM27YM",    name:"Design the home",                                 project:"🟢Buy Scan Home🏡", flagged:false, dueDate:null},
  {id:"k4FKo4X15jp",    name:"Mortgage",                                        project:"🟢Buy Scan Home🏡", flagged:false, dueDate:null},

  // ── 🟢 Generate +10% ─────────────────────────────────────────────────────
  {id:"naXlY-d6ORw",    name:"Generate $500 extra per month",                   project:"🟢Generate +10% 💵✅", flagged:false, dueDate:null},
  {id:"p_7G0IfwP-R",    name:"Check UserTesting",                               project:"🟢Generate +10% 💵✅", flagged:false, dueDate:null},
  {id:"coMqPyisx2l",    name:"Explore freelance jobs",                          project:"🟢Generate +10% 💵✅", flagged:false, dueDate:null},

  // ── 🟣 Cruise Vacation ────────────────────────────────────────────────────
  {id:"k0sLEkAedZY",    name:"Cruise Vacation 🚢",                              project:"🟣Cruise Vacation🚢", flagged:false, dueDate:"2027-12-31"},
];

function ofDueLabel(dueDate) {
  if (!dueDate) return "nodate";
  const today = dateKey(TODAY);
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  const diff = Math.round((new Date(dueDate+"T12:00:00") - TODAY) / 86400000);
  if (diff <= 3) return "soon";
  return "upcoming";
}

function buildDays(start, n) { return Array.from({length:n},(_,i)=>addDays(start,i)); }
function buildWeeks(days) {
  const weeks=[]; let week=[];
  for (let i=0;i<days[0].getDay();i++) week.push(null);
  for (const d of days) { week.push(d); if(week.length===7){weeks.push(week);week=[];} }
  if (week.length){ while(week.length<7) week.push(null); weeks.push(week); }
  return weeks;
}
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ═════════════════════════════════════════════════════════════════════════════
// App
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [themeName, setThemeName] = useState("slate");
  const t = THEMES[themeName];

  const [section,       setSection]       = useState("payoff");
  const [debts,         setDebts]         = useState(INITIAL_DEBTS);
  const [strategy,      setStrategy]      = useState("avalanche");
  const [extraPayment,  setExtraPayment]  = useState(500);
  const [activeDebtTab, setActiveDebtTab] = useState("chart");

  const {schedule, accounts, monthlyBudget: debtMonthly} = useMemo(
    ()=>computeAmortization(debts, strategy, extraPayment),
    [debts, strategy, extraPayment]
  );
  const totalDebt         = debts.reduce((s,d)=>s+d.balance,0);
  const totalInterestPaid = accounts.reduce((s,a)=>s+a.totalInterest,0);
  const payoffMonths      = schedule.length;
  const payoffDate        = (() => { const d=new Date(); d.setMonth(d.getMonth()+payoffMonths); return d; })();
  const updateDebt = (id,field,val) => setDebts(p=>p.map(d=>d.id===id?{...d,[field]:parseFloat(val)||0}:d));
  const chartData = schedule.filter((_,i)=>i%Math.max(1,Math.floor(schedule.length/60))===0||i===schedule.length-1);

  const [startBal,       setStartBal]       = useState(4952);
  const [cfBudget,       setCfBudget]       = useState(6500);
  const [numDays,        setNumDays]        = useState(60);
  const [showLM,         setShowLM]         = useState(true);
  const [lmData,         setLmData]         = useState(LM_RECURRING);
  const [lmSyncStatus,   setLmSyncStatus]   = useState("idle"); // "idle"|"loading"|"done"|"error"
  const [charges,        setCharges]        = useState([]);
  const [dragItem,       setDragItem]       = useState(null);
  const [dragOver,       setDragOver]       = useState(null);
  const [addModal,       setAddModal]       = useState(null);
  const [newCharge,      setNewCharge]      = useState({payee:"",amount:"",type:"expense",category:"Manual"});
  const [filterCat,      setFilterCat]      = useState("All");
  const [selectedDay,    setSelectedDay]    = useState(null);
  const [activeView,     setActiveView]     = useState("calendar");

  // ── OmniFocus state ──────────────────────────────────────────────────────────
  const [ofTasks,        setOfTasks]        = useState(INITIAL_OF_TASKS);
  const [ofView,         setOfView]         = useState("dashboard");
  const [ofMonth,        setOfMonth]        = useState(new Date(2026,2,1));
  const [ofFilter,       setOfFilter]       = useState("All");
  const [ofDragItem,     setOfDragItem]     = useState(null);
  const [ofDragOver,     setOfDragOver]     = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [ofScriptCopied, setOfScriptCopied] = useState(false);

  const ofFiltered = useMemo(()=>{
    if (ofFilter==="Flagged") return ofTasks.filter(t=>t.flagged);
    if (ofFilter==="Overdue") return ofTasks.filter(t=>t.dueDate && t.dueDate<dateKey(TODAY));
    if (ofFilter!=="All") return ofTasks.filter(t=>t.project===ofFilter);
    return ofTasks;
  },[ofTasks,ofFilter]);

  const ofStats = useMemo(()=>({
    flagged: ofTasks.filter(t=>t.flagged).length,
    overdue: ofTasks.filter(t=>t.dueDate&&t.dueDate<dateKey(TODAY)).length,
    today:   ofTasks.filter(t=>t.dueDate===dateKey(TODAY)).length,
    noDate:  ofTasks.filter(t=>!t.dueDate).length,
  }),[ofTasks]);

  const ofByDate = useMemo(()=>{
    const m={};
    for (const t of ofTasks){if(t.dueDate){if(!m[t.dueDate])m[t.dueDate]=[];m[t.dueDate].push(t);}}
    return m;
  },[ofTasks]);

  const ofOnDragStart = useCallback((e,task)=>{setOfDragItem(task);e.dataTransfer.effectAllowed="move";},[]);
  const ofOnDragOver  = useCallback((e,k)=>{e.preventDefault();setOfDragOver(k);},[]);
  const ofOnDrop = useCallback((e,newDate)=>{
    e.preventDefault();
    if(!ofDragItem||ofDragItem.dueDate===newDate){setOfDragItem(null);setOfDragOver(null);return;}
    setOfTasks(p=>p.map(t=>t.id===ofDragItem.id?{...t,dueDate:newDate}:t));
    setPendingChanges(p=>[...p.filter(c=>c.id!==ofDragItem.id),{id:ofDragItem.id,name:ofDragItem.name,oldDate:ofDragItem.dueDate,newDate}]);
    setOfDragItem(null);setOfDragOver(null);
  },[ofDragItem]);

  const BRIDGE_URL = "http://localhost:3131";
  const [bridgeStatus, setBridgeStatus] = useState("unknown");
  const [syncStatus,   setSyncStatus]   = useState("idle");

  const checkBridge = useCallback(async () => {
    try {
      const r = await fetch(`${BRIDGE_URL}/health`, {signal: AbortSignal.timeout(2000)});
      setBridgeStatus(r.ok ? "online" : "offline");
    } catch { setBridgeStatus("offline"); }
  }, []);

  const [refreshStatus, setRefreshStatus] = useState("idle"); // "idle"|"loading"|"done"|"error"

  const fetchOFTasks = useCallback(async () => {
    setRefreshStatus("loading");
    try {
      const r = await fetch(`${BRIDGE_URL}/tasks`, {signal: AbortSignal.timeout(120000)});
      const data = await r.json();
      if (data.success && data.tasks.length > 0) {
        setOfTasks(data.tasks);
        setOfFilter("All");
        setRefreshStatus("done");
        setTimeout(() => setRefreshStatus("idle"), 3000);
      } else throw new Error(data.error || "No tasks returned");
    } catch (err) {
      console.error("Fetch OF tasks failed:", err.message);
      setRefreshStatus("error");
      setTimeout(() => setRefreshStatus("idle"), 4000);
    }
  }, []);

  // Check bridge whenever Tasks tab is opened
  useEffect(()=>{
    if (section==="tasks") checkBridge();
  },[section]);

  async function syncToOmniFocus() {
    if (!pendingChanges.length) return;
    setSyncStatus("syncing");
    try {
      const res = await fetch(`${BRIDGE_URL}/sync`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({changes: pendingChanges.map(c=>({id:c.id, name:c.name, newDate:c.newDate}))})
      });
      const data = await res.json();
      if (data.success) {
        setSyncStatus("done");
        setPendingChanges([]);
        setTimeout(()=>setSyncStatus("idle"), 3000);
      } else throw new Error(data.error);
    } catch {
      setSyncStatus("error");
      setTimeout(()=>setSyncStatus("idle"), 4000);
    }
  }

  function copyFallbackScript(){
    if(!pendingChanges.length) return;
    const lines=pendingChanges.map(c=>`  set due date of (first flattened task whose id = "${c.id}") to date "${c.newDate}"`);
    const script=`tell application "OmniFocus"\n  tell document 1\n${lines.join("\n")}\n  end tell\nend tell`;
    navigator.clipboard.writeText(script).then(()=>{setOfScriptCopied(true);setTimeout(()=>setOfScriptCopied(false),2500);});
  }

  const debtCharges = useMemo(()=>{
    const res=[]; const days=buildDays(TODAY,numDays); const seen=new Set();
    for (const d of days) {
      if (d.getDate()===1) {
        const mk=`${d.getFullYear()}-${d.getMonth()}`;
        if (!seen.has(mk)){ seen.add(mk); res.push({id:`debt-${mk}`,payee:"Debt Payoff Budget",amount:debtMonthly,date:dateKey(d),type:"expense",source:"debt-calculator",category:"Debt",_isDebtPayment:true}); }
      }
    }
    return res;
  },[numDays,debtMonthly]);

  const days  = useMemo(()=>buildDays(TODAY,numDays),[numDays]);
  const weeks = useMemo(()=>buildWeeks(days),[days]);

  const syncLM = useCallback(async () => {
    setLmSyncStatus("loading");
    try {
      const r = await fetch(`/api/lunchmoney?endpoint=recurring`, {signal: AbortSignal.timeout(15000)});
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const items = data.recurring_expenses ?? [];

      const today = new Date(); today.setHours(0,0,0,0);
      const windowEnd = addDays(today, numDays);

      function projectDates(item) {
        if (!item.billing_date) return [];
        const anchor = new Date(item.billing_date + "T12:00:00");
        const dates = [];
        const advance = (d, cadence) => {
          switch (cadence) {
            case "monthly":        return new Date(d.getFullYear(), d.getMonth()+1, d.getDate());
            case "every 3 months": return new Date(d.getFullYear(), d.getMonth()+3, d.getDate());
            case "twice a year":   return new Date(d.getFullYear(), d.getMonth()+6, d.getDate());
            case "yearly":         return new Date(d.getFullYear()+1, d.getMonth(), d.getDate());
            default:               return null;
          }
        };
        if (item.cadence === "monthly" || item.cadence === "every 3 months" ||
            item.cadence === "twice a year" || item.cadence === "yearly") {
          let d = new Date(anchor);
          // wind forward until >= today
          while (d < today) { const n = advance(d, item.cadence); if (!n) break; d = n; }
          while (d <= windowEnd) { dates.push(dateKey(d)); const n = advance(d, item.cadence); if (!n) break; d = n; }
        } else {
          // custom / unknown — include if billing_date falls in window
          if (anchor >= today && anchor <= windowEnd) dates.push(dateKey(anchor));
        }
        return dates;
      }

      const mapped = items.flatMap(item => {
        const amt = parseFloat(item.amount);
        return projectDates(item).map(date => ({
          id: `lm-api-${item.id}-${date}`,
          payee: item.payee,
          amount: Math.abs(amt),
          date,
          type: amt < 0 ? "income" : "expense",
          category: item.category_name || "Manual",
          source: "lunchmoney",
        }));
      });

      if (mapped.length > 0) setLmData(mapped);
      setLmSyncStatus("done");
      setTimeout(() => setLmSyncStatus("idle"), 3000);
    } catch (err) {
      console.error("LM sync failed:", err.message);
      setLmSyncStatus("error");
      setTimeout(() => setLmSyncStatus("idle"), 4000);
    }
  }, [numDays]);

  const allCharges = useMemo(()=>[...(showLM?lmData:[]),...charges,...debtCharges],[showLM,lmData,charges,debtCharges]);

  const hiddenLMIds = useMemo(()=>new Set(charges.filter(c=>c._originalId).map(c=>c._originalId)),[charges]);

  const dayMap = useMemo(()=>{
    const m={}; for (const c of allCharges){if(!m[c.date])m[c.date]=[];m[c.date].push(c);} return m;
  },[allCharges]);

  const runBal = useMemo(()=>{
    const res={}; let bal=startBal; const ms={};
    for (const d of days){
      const k=dateKey(d); const mk=`${d.getFullYear()}-${d.getMonth()}`;
      if(!ms[mk])ms[mk]=0;
      const dc=dayMap[k]||[];
      const inc=dc.filter(c=>c.type==="income").reduce((s,c)=>s+c.amount,0);
      const exp=dc.filter(c=>c.type==="expense").reduce((s,c)=>s+c.amount,0);
      ms[mk]+=exp; bal+=inc-exp;
      res[k]={income:inc,expenses:exp,net:inc-exp,balance:bal,budgetUsed:ms[mk],budgetRemaining:cfBudget-ms[mk]};
    }
    return res;
  },[days,dayMap,startBal,cfBudget]);

  const visForDay = useCallback((k)=>(dayMap[k]||[]).filter(c=>!(c.source==="lunchmoney"&&hiddenLMIds.has(c.id))),[dayMap,hiddenLMIds]);

  const onDragStart = useCallback((e,c)=>{setDragItem(c);e.dataTransfer.effectAllowed="move";},[]);
  const onDragOver  = useCallback((e,k)=>{e.preventDefault();setDragOver(k);},[]);
  const onDrop = useCallback((e,targetDate)=>{
    e.preventDefault();
    if (!dragItem||dragItem.date===targetDate){setDragItem(null);setDragOver(null);return;}
    if (dragItem.source==="lunchmoney") setCharges(p=>[...p,{...dragItem,id:uid(),date:targetDate,source:"manual-lm",_originalId:dragItem.id}]);
    else if (dragItem.source!=="debt-calculator") setCharges(p=>p.map(c=>c.id===dragItem.id?{...c,date:targetDate}:c));
    setDragItem(null);setDragOver(null);
  },[dragItem]);

  const removeCharge   = useCallback((id)=>setCharges(p=>p.filter(c=>c.id!==id)),[]);
  const addManualCharge = ()=>{
    if (!newCharge.payee||!newCharge.amount||!addModal) return;
    setCharges(p=>[...p,{id:uid(),payee:newCharge.payee,amount:parseFloat(newCharge.amount),type:newCharge.type,category:newCharge.category,date:addModal,source:"manual"}]);
    setNewCharge({payee:"",amount:"",type:"expense",category:"Manual"});
    setAddModal(null);
  };

  const selCharges = selectedDay ? visForDay(selectedDay) : [];
  const selStats   = selectedDay ? runBal[selectedDay] : null;
  const todayEOD   = runBal[dateKey(TODAY)]?.balance ?? startBal;

  // ── Dynamic CSS ──────────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    body { background:${t.bg}; margin:0; }
    input[type=range] { accent-color:${t.accent}; width:100%; cursor:pointer; }
    input[type=number], input[type=text], select {
      background:${t.inputBg}; border:1px solid ${t.inputBd}; color:${t.text};
      padding:6px 10px; border-radius:6px; font-family:inherit; font-size:13px; outline:none; transition:border .15s;
    }
    input:focus, select:focus { border-color:${t.accent}; box-shadow:0 0 0 3px ${t.accent}22; }
    select option { background:${t.surface}; color:${t.text}; }
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:${t.bg}; }
    ::-webkit-scrollbar-thumb { background:${t.scrollThumb}; border-radius:4px; }
    .btn {
      background:${t.surface2}; border:1px solid ${t.border3}; color:${t.textMuted};
      padding:6px 14px; border-radius:6px; cursor:pointer; font-family:inherit;
      font-size:11px; text-transform:uppercase; letter-spacing:.08em; transition:all .15s; white-space:nowrap;
    }
    .btn:hover { border-color:${t.accent}; color:${t.accent}; background:${t.accent}11; }
    .btn.active { background:${t.accent}1a; border-color:${t.accent}; color:${t.accent}; font-weight:600; }
    .tab-btn {
      background:none; border:none; border-bottom:2px solid transparent; cursor:pointer;
      font-family:inherit; font-size:12px; letter-spacing:.08em; text-transform:uppercase;
      padding:10px 20px; color:${t.textDim}; transition:all .15s;
    }
    .tab-btn.active { color:${t.accent}; border-bottom-color:${t.accent}; }
    .tab-btn:hover { color:${t.textMuted}; }
    .nav-btn {
      background:none; border:none; border-bottom:2px solid transparent; cursor:pointer;
      font-family:'Syne',sans-serif; font-size:12px; font-weight:700; letter-spacing:.06em;
      text-transform:uppercase; padding:0 22px; height:54px; color:${t.textDim}; transition:all .15s;
    }
    .nav-btn.active { color:${t.accent}; border-bottom-color:${t.accent}; }
    .nav-btn:hover { color:${t.textMuted}; }
    .theme-pill {
      background:${t.surface2}; border:1px solid ${t.border3}; color:${t.textMuted};
      padding:5px 10px; border-radius:20px; cursor:pointer; font-family:inherit;
      font-size:12px; transition:all .15s; display:inline-flex; align-items:center; gap:5px;
    }
    .theme-pill:hover { border-color:${t.border3}; color:${t.textSub}; }
    .theme-pill.active { background:${t.accent}1a; border-color:${t.accent}; color:${t.accent}; font-weight:600; }
    .chip {
      display:flex; align-items:center; gap:3px; padding:2px 6px; border-radius:4px;
      font-size:10px; cursor:grab; user-select:none; margin:1px 0;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; transition:filter .1s;
    }
    .chip:hover { filter:brightness(1.15); }
    .chip:active { cursor:grabbing; opacity:.6; }
    .day-cell {
      border:1px solid ${t.border}; padding:4px 4px 26px; min-height:88px;
      position:relative; cursor:pointer; vertical-align:top; transition:background .12s;
    }
    .day-cell:hover { background:${t.cellHover}; }
    .day-cell.today { border-color:${t.accent}; border-width:2px; }
    .day-cell.drag-over { background:${t.cellDrag}!important; border-color:${t.accent}; }
    .day-cell.selected { background:${t.cellSel}; }
    .debt-row:hover { background:${t.surface2}; }
    .add-btn {
      position:absolute; top:3px; right:3px; width:16px; height:16px;
      border-radius:50%; border:1px solid ${t.border3}; background:none; color:${t.textDim};
      cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .15s; line-height:1; padding:0;
    }
    .day-cell:hover .add-btn { opacity:1; }
    .add-btn:hover { border-color:${t.accent}; color:${t.accent}; }
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:100; display:flex; align-items:center; justify-content:center; }
    .modal { background:${t.surface}; border:1px solid ${t.border2}; border-radius:12px; padding:24px; min-width:320px; box-shadow:0 24px 64px rgba(0,0,0,.35); }
    .stat-card { background:${t.surface}; padding:18px 22px; border-right:1px solid ${t.border2}; }
    .stat-card:last-child { border-right:none; }
    .side-stat { background:${t.surface2}; border:1px solid ${t.border}; padding:10px 12px; border-radius:8px; }
    .list-item { display:flex; align-items:center; gap:8px; padding:6px 10px; border:1px solid ${t.border2}; border-radius:7px; transition:background .12s; }
    .list-item:hover { background:${t.surface2}; }
    .list-item.income { background:${t.accent}0d; border-color:${t.accent}30; }
    .list-item.debt-payment { background:${t.dangerBg}; border-color:${t.dangerBd}; }
  `;

  const ChartTooltip = ({active,payload,label}) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{background:t.surface,border:`1px solid ${t.border2}`,padding:"10px 14px",borderRadius:8,fontSize:12,boxShadow:`0 8px 24px rgba(0,0,0,.25)`}}>
        <div style={{color:t.accentSub,fontWeight:600,marginBottom:6,fontSize:11}}>Month {label}</div>
        {payload.map(p=>(
          <div key={p.name} style={{color:p.color,marginBottom:2}}>
            <span style={{color:t.textMuted}}>{p.name}: </span>{fmt(p.value)}
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:t.bg,minHeight:"100vh",color:t.text,lineHeight:1.5}}>
      <style>{CSS}</style>

      {/* ── Nav ── */}
      <div style={{borderBottom:`1px solid ${t.border2}`,display:"flex",alignItems:"center",height:54,background:t.surface,paddingRight:16,position:"sticky",top:0,zIndex:50}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:t.accent,letterSpacing:"-0.02em",padding:"0 20px",borderRight:`1px solid ${t.border2}`,height:"100%",display:"flex",alignItems:"center",flexShrink:0}}>
          DORIAN OS
        </div>
        {[["payoff","💳 Debt Payoff"],["cashflow","📅 Cash Flow"],["tasks","✅ Tasks"]].map(([s,label])=>(
          <button key={s} className={`nav-btn ${section===s?"active":""}`} onClick={()=>setSection(s)}>{label}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",gap:18,alignItems:"center"}}>
          {[
            {label:"Debt/mo",    value:fmt(debtMonthly), color:t.danger},
            {label:"Debt-free",  value:payoffDate.toLocaleDateString("en-US",{month:"short",year:"numeric"}), color:t.accent},
            {label:"Cash today", value:fmt(todayEOD),    color:t.accentSub},
          ].map(s=>(
            <div key={s.label} style={{textAlign:"right"}}>
              <div style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",marginBottom:1}}>{s.label}</div>
              <div style={{fontSize:13,fontWeight:600,color:s.color,fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
            </div>
          ))}
          {/* Theme switcher */}
          <div style={{display:"flex",gap:4,paddingLeft:14,borderLeft:`1px solid ${t.border2}`,marginLeft:4}}>
            {Object.entries(THEMES).map(([key,th])=>(
              <button key={key} className={`theme-pill ${themeName===key?"active":""}`} onClick={()=>setThemeName(key)}>
                <span>{th.icon}</span>
                <span style={{fontSize:10}}>{th.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════ DEBT PAYOFF ════════════ */}
      {section==="payoff" && (
        <div>
          {/* Stat bar */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:`1px solid ${t.border2}`}}>
            {[
              {label:"Total Debt",      value:fmt(totalDebt),         sub:"current balance",          color:t.danger},
              {label:"Payoff Date",     value:payoffDate.toLocaleDateString("en-US",{month:"short",year:"numeric"}), sub:`${payoffMonths} months`, color:t.accent},
              {label:"Total Interest",  value:fmt(totalInterestPaid), sub:"cost of carrying debt",    color:t.warning},
              {label:"Monthly Payment", value:fmt(debtMonthly),       sub:`+${fmt(extraPayment)} extra`, color:t.accentSub},
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".12em",marginBottom:8,fontWeight:500}}>{s.label}</div>
                <div style={{fontSize:26,fontWeight:600,color:s.color,letterSpacing:"-0.03em",marginBottom:4,fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
                <div style={{fontSize:11,color:t.textMuted}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{padding:"14px 24px",borderBottom:`1px solid ${t.border2}`,display:"flex",gap:24,alignItems:"center",flexWrap:"wrap",background:t.surface}}>
            <div>
              <div style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8,fontWeight:500}}>Strategy</div>
              <div style={{display:"flex",gap:6}}>
                {[["avalanche","Avalanche"],["snowball","Snowball"],["equal","Equal Split"]].map(([v,l])=>(
                  <button key={v} className={`btn ${strategy===v?"active":""}`} onClick={()=>setStrategy(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{flex:1,minWidth:220}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:8}}>
                <span style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>Extra Monthly</span>
                <span style={{fontSize:15,color:t.accent,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmt(extraPayment)}</span>
              </div>
              <input type="range" min={0} max={5000} step={50} value={extraPayment} onChange={e=>setExtraPayment(+e.target.value)}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:t.textFaint,marginTop:3}}><span>$0</span><span>$5,000</span></div>
            </div>
            <div style={{padding:"10px 16px",background:t.dangerBg,border:`1px solid ${t.dangerBd}`,borderRadius:8,fontSize:12,flexShrink:0}}>
              <div style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",marginBottom:3,fontWeight:500}}>↓ Feeds Cash Flow</div>
              <div style={{color:t.danger,fontWeight:600}}>{fmt(debtMonthly)}/mo on the 1st</div>
            </div>
          </div>

          {/* Sub-tabs */}
          <div style={{borderBottom:`1px solid ${t.border2}`,padding:"0 24px",display:"flex",background:t.surface}}>
            {["chart","schedule","accounts"].map(tab=>(
              <button key={tab} className={`tab-btn ${activeDebtTab===tab?"active":""}`} onClick={()=>setActiveDebtTab(tab)}>{tab}</button>
            ))}
          </div>

          <div style={{padding:"24px"}}>

            {activeDebtTab==="chart" && (
              <div>
                <div style={{fontSize:10,color:t.textDim,textTransform:"uppercase",letterSpacing:".12em",marginBottom:12,fontWeight:500}}>Total Debt Drawdown</div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{top:10,right:10,left:10,bottom:0}}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={t.accent} stopOpacity={.2}/>
                        <stop offset="100%" stopColor={t.accent} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid}/>
                    <XAxis dataKey="month" stroke={t.chartAxis} tick={{fill:t.textDim,fontSize:10}} tickFormatter={v=>`M${v}`}/>
                    <YAxis stroke={t.chartAxis} tick={{fill:t.textDim,fontSize:10}} tickFormatter={v=>fmt(v)} width={78}/>
                    <Tooltip content={<ChartTooltip/>}/>
                    <Area type="monotone" dataKey="totalRemaining" name="Total Remaining" stroke={t.accent} fill="url(#dg)" strokeWidth={2.5} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>

                <div style={{marginTop:28}}>
                  <div style={{fontSize:10,color:t.textDim,textTransform:"uppercase",letterSpacing:".12em",marginBottom:12,fontWeight:500}}>Per Card</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{top:10,right:10,left:10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid}/>
                      <XAxis dataKey="month" stroke={t.chartAxis} tick={{fill:t.textDim,fontSize:10}} tickFormatter={v=>`M${v}`}/>
                      <YAxis stroke={t.chartAxis} tick={{fill:t.textDim,fontSize:10}} tickFormatter={v=>fmt(v)} width={78}/>
                      <Tooltip content={<ChartTooltip/>}/>
                      <Legend wrapperStyle={{fontSize:11,color:t.textMuted}}/>
                      {debts.filter(d=>d.balance>0).map((d,i)=>(
                        <Line key={d.id} type="monotone" dataKey={d.name} stroke={DEBT_COLORS[i%DEBT_COLORS.length]} strokeWidth={1.5} dot={false}/>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{marginTop:28}}>
                  <div style={{fontSize:10,color:t.textDim,textTransform:"uppercase",letterSpacing:".12em",marginBottom:10,fontWeight:500}}>Payoff Order</div>
                  {[...accounts].filter(a=>a.paidOffMonth).sort((a,b)=>a.paidOffMonth-b.paidOffMonth).map((a,i)=>{
                    const pd=new Date(); pd.setMonth(pd.getMonth()+a.paidOffMonth);
                    return (
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:t.surface,borderRadius:8,border:`1px solid ${t.border2}`,marginBottom:6}}>
                        <span style={{fontSize:11,color:t.textFaint,width:24,fontWeight:600}}>#{i+1}</span>
                        <div style={{width:9,height:9,borderRadius:"50%",background:DEBT_COLORS[debts.findIndex(dd=>dd.id===a.id)%DEBT_COLORS.length],flexShrink:0}}/>
                        <span style={{flex:1,fontSize:13,color:t.textSub,fontWeight:500}}>{a.name}</span>
                        <span style={{fontSize:12,color:t.textMuted}}>Month {a.paidOffMonth}</span>
                        <span style={{fontSize:12,color:t.textDim}}>{pd.toLocaleDateString("en-US",{month:"short",year:"numeric"})}</span>
                        <span style={{fontSize:11,color:t.danger}}>({fmtFull(a.totalInterest)} int.)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeDebtTab==="schedule" && (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:`2px solid ${t.border2}`}}>
                      {["Month","Date","Payment","Interest","Principal","Balance"].map(h=>(
                        <th key={h} style={{padding:"8px 14px",textAlign:"right",color:t.textDim,fontSize:10,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row,i)=>{
                      const prev=i>0?schedule[i-1].totalRemaining:totalDebt;
                      const pd=new Date(); pd.setMonth(pd.getMonth()+row.month);
                      return (
                        <tr key={row.month} className="debt-row" style={{borderBottom:`1px solid ${t.border}`}}>
                          <td style={{padding:"8px 14px",color:t.textDim,textAlign:"right"}}>{row.month}</td>
                          <td style={{padding:"8px 14px",color:t.textMuted,textAlign:"right"}}>{pd.toLocaleDateString("en-US",{month:"short",year:"numeric"})}</td>
                          <td style={{padding:"8px 14px",color:t.textSub,textAlign:"right"}}>{fmtFull(row.monthlyBudget)}</td>
                          <td style={{padding:"8px 14px",color:t.danger,textAlign:"right"}}>{fmtFull(row.totalInterest)}</td>
                          <td style={{padding:"8px 14px",color:t.accent,textAlign:"right"}}>{fmtFull(prev-row.totalRemaining)}</td>
                          <td style={{padding:"8px 14px",color:t.text,textAlign:"right",fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{fmtFull(row.totalRemaining)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeDebtTab==="accounts" && (
              <div>
                <div style={{fontSize:12,color:t.textMuted,marginBottom:14}}>Edit any field — updates the forecast and cash flow in real-time.</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:`2px solid ${t.border2}`}}>
                      {["","Account","Balance","APR %","Min Pmt","Paid Off","Int. Cost"].map(h=>(
                        <th key={h} style={{padding:"8px 14px",textAlign:"left",color:t.textDim,fontSize:10,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map((d,i)=>{
                      const acc=accounts.find(a=>a.id===d.id);
                      const mo=acc?.paidOffMonth; const pd=mo?new Date():null; if(pd)pd.setMonth(pd.getMonth()+mo);
                      return (
                        <tr key={d.id} className="debt-row" style={{borderBottom:`1px solid ${t.border}`}}>
                          <td style={{padding:"10px 14px"}}><div style={{width:10,height:10,borderRadius:"50%",background:DEBT_COLORS[i%DEBT_COLORS.length]}}/></td>
                          <td style={{padding:"10px 14px",color:t.textSub,fontWeight:500}}>{d.name}</td>
                          <td style={{padding:"10px 14px"}}><input type="number" value={d.balance} step="0.01" onChange={e=>updateDebt(d.id,"balance",e.target.value)} style={{width:105}}/></td>
                          <td style={{padding:"10px 14px"}}><input type="number" value={d.apr} step="0.01" onChange={e=>updateDebt(d.id,"apr",e.target.value)} style={{width:72}}/></td>
                          <td style={{padding:"10px 14px"}}><input type="number" value={d.minPayment} step="1" onChange={e=>updateDebt(d.id,"minPayment",e.target.value)} style={{width:72}}/></td>
                          <td style={{padding:"10px 14px",color:mo?t.accent:t.textDim,fontSize:12}}>{mo?`${pd.toLocaleDateString("en-US",{month:"short",year:"numeric"})} (M${mo})`:"—"}</td>
                          <td style={{padding:"10px 14px",color:t.danger,fontSize:12}}>{acc?fmtFull(acc.totalInterest):"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:`2px solid ${t.border2}`}}>
                      <td colSpan={2} style={{padding:"12px 14px",color:t.accent,fontWeight:600}}>TOTAL</td>
                      <td style={{padding:"12px 14px",color:t.accent,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmtFull(totalDebt)}</td>
                      <td colSpan={3}/>
                      <td style={{padding:"12px 14px",color:t.danger,fontWeight:700}}>{fmtFull(totalInterestPaid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ CASH FLOW ════════════ */}
      {section==="cashflow" && (
        <div>
          {/* Controls header */}
          <div style={{padding:"14px 24px",borderBottom:`1px solid ${t.border2}`,background:t.surface}}>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>Start</span>
                <input type="number" value={startBal} onChange={e=>setStartBal(+e.target.value)} style={{width:96}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",fontWeight:500}}>Budget/mo</span>
                <input type="number" value={cfBudget} onChange={e=>setCfBudget(+e.target.value)} style={{width:96}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {[30,60,90].map(n=>(
                  <button key={n} className={`btn ${numDays===n?"active":""}`} onClick={()=>setNumDays(n)}>{n}d</button>
                ))}
              </div>
              <button className={`btn ${showLM?"active":""}`} onClick={()=>setShowLM(v=>!v)}>{showLM?"✓ ":""}Lunch Money</button>
              <button className="btn" onClick={syncLM} disabled={lmSyncStatus==="loading"} style={{opacity:lmSyncStatus==="loading"?.6:1}}>
                {lmSyncStatus==="loading"?"Syncing…":lmSyncStatus==="done"?"✓ Synced":lmSyncStatus==="error"?"✕ Error":"↻ Sync LM"}
              </button>
              <div style={{marginLeft:"auto",padding:"6px 14px",background:t.dangerBg,border:`1px solid ${t.dangerBd}`,borderRadius:8,fontSize:12,flexShrink:0}}>
                <span style={{color:t.textDim,fontSize:10}}>From Payoff: </span>
                <span style={{color:t.danger,fontWeight:600}}>{fmt(debtMonthly)}/mo</span>
                <span style={{color:t.textDim,fontSize:10}}> · 1st of month</span>
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:10}}>
              {[["calendar","📅 Calendar"],["list","📋 List"]].map(([v,l])=>(
                <button key={v} className={`btn ${activeView===v?"active":""}`} onClick={()=>setActiveView(v)}>{l}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["All",...Object.keys(CATEGORY_COLORS).filter(k=>k!=="income"),"income"].map(cat=>(
                <button key={cat} onClick={()=>setFilterCat(cat)} style={{
                  background: filterCat===cat?(CATEGORY_COLORS[cat]||t.accent)+"22":t.surface2,
                  color: CATEGORY_COLORS[cat]||t.accent,
                  border: `1px solid ${filterCat===cat?(CATEGORY_COLORS[cat]||t.accent):t.border2}`,
                  padding:"3px 12px",borderRadius:20,fontSize:10,textTransform:"uppercase",
                  letterSpacing:".07em",cursor:"pointer",transition:"all .15s",fontWeight: filterCat===cat?600:400,
                }}>{cat}</button>
              ))}
            </div>
          </div>

          {/* ── LIST VIEW ── */}
          {activeView==="list" && (
            <div style={{padding:"0 24px 60px",maxWidth:680,margin:"0 auto"}}>
              {days.filter(d=>{
                const k=dateKey(d);
                const vis=visForDay(k).filter(c=>filterCat==="All"||c.category===filterCat||(filterCat==="income"&&c.type==="income"));
                return vis.length>0||k===dateKey(TODAY);
              }).map((d,idx,arr)=>{
                const k=dateKey(d); const stats=runBal[k]; const isToday=k===dateKey(TODAY);
                const vis=visForDay(k).filter(c=>filterCat==="All"||c.category===filterCat||(filterCat==="income"&&c.type==="income"));
                const inc=vis.filter(c=>c.type==="income"); const exp=vis.filter(c=>c.type==="expense");
                return (
                  <div key={k} style={{display:"flex"}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:34,flexShrink:0}}>
                      <div style={{
                        width:11,height:11,borderRadius:"50%",marginTop:20,flexShrink:0,
                        background:isToday?t.accent:stats?.net>0?t.accentSub:stats?.net<0?t.danger:t.border3,
                        border:`2px solid ${isToday?t.accent:t.border2}`,
                        boxShadow:isToday?`0 0 8px ${t.accent}66`:undefined,
                      }}/>
                      {idx<arr.length-1&&<div style={{width:1,flex:1,background:t.border2,minHeight:14}}/>}
                    </div>
                    <div style={{flex:1,padding:"14px 0 14px 14px",borderBottom:`1px solid ${t.border}`}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:vis.length?10:0}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                          <span style={{fontSize:13,fontWeight:600,color:isToday?t.accent:t.textSub}}>
                            {d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                          </span>
                          {isToday&&<span style={{fontSize:9,color:t.accent,textTransform:"uppercase",letterSpacing:".12em",fontWeight:700}}>today</span>}
                        </div>
                        {stats&&(
                          <div style={{display:"flex",gap:16,alignItems:"center"}}>
                            {stats.net!==0&&<span style={{fontSize:11,fontWeight:600,color:stats.net>0?t.accent:t.danger}}>{fmtSigned(stats.net)}</span>}
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:16,fontWeight:700,color:stats.balance>=0?t.text:t.danger,fontVariantNumeric:"tabular-nums"}}>{fmt(stats.balance)}</div>
                              <div style={{fontSize:9,color:stats.budgetRemaining>=0?t.textDim:t.danger,fontWeight:500}}>bgt {fmt(stats.budgetRemaining)} left</div>
                            </div>
                          </div>
                        )}
                      </div>
                      {vis.length>0&&(
                        <div style={{display:"flex",flexDirection:"column",gap:4}}>
                          {inc.map(c=>(
                            <div key={c.id} className="list-item income" draggable onDragStart={e=>onDragStart(e,c)}>
                              <span style={{fontSize:11,color:t.accent,fontWeight:700}}>↑</span>
                              <span style={{flex:1,fontSize:13,color:t.textSub,fontWeight:500}}>{c.payee}</span>
                              <span style={{fontSize:13,fontWeight:700,color:t.accent,fontVariantNumeric:"tabular-nums"}}>+{fmt(c.amount)}</span>
                              {c.source!=="lunchmoney"&&<button onClick={()=>removeCharge(c.id)} style={{background:"none",border:"none",color:t.textDim,cursor:"pointer",fontSize:17,lineHeight:1,padding:"0 2px"}}>×</button>}
                            </div>
                          ))}
                          {exp.map(c=>(
                            <div key={c.id} className={`list-item ${c._isDebtPayment?"debt-payment":""}`} draggable={!c._isDebtPayment} onDragStart={e=>!c._isDebtPayment&&onDragStart(e,c)}>
                              <div style={{width:8,height:8,borderRadius:"50%",background:CATEGORY_COLORS[c.category]||t.textDim,flexShrink:0}}/>
                              <span style={{flex:1,fontSize:13,color:t.text}}>{c.payee}{c._isDebtPayment&&<span style={{fontSize:9,color:t.danger,marginLeft:6,fontWeight:600}}>⚡ payoff</span>}</span>
                              <span style={{fontSize:10,color:t.textDim,marginRight:8}}>{c.category}</span>
                              <span style={{fontSize:13,fontWeight:700,color:t.danger,fontVariantNumeric:"tabular-nums"}}>−{fmt(c.amount)}</span>
                              {c.source!=="lunchmoney"&&!c._isDebtPayment&&<button onClick={()=>removeCharge(c.id)} style={{background:"none",border:"none",color:t.textDim,cursor:"pointer",fontSize:17,lineHeight:1,padding:"0 2px"}}>×</button>}
                            </div>
                          ))}
                          <button className="btn" style={{alignSelf:"flex-start",padding:"2px 10px",fontSize:10,marginTop:2}} onClick={()=>setAddModal(k)}>+ add</button>
                        </div>
                      )}
                      {vis.length===0&&<button className="btn" style={{padding:"2px 10px",fontSize:10}} onClick={()=>setAddModal(k)}>+ add charge</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CALENDAR VIEW ── */}
          {activeView==="calendar" && (
            <div style={{display:"flex"}}>
              <div style={{flex:1,overflowX:"auto"}}>
                {(()=>{
                  const groups=[]; let cur=null; let curWks=[];
                  for (const wk of weeks){
                    const ref=wk.find(d=>d!==null); if(!ref)continue;
                    const mk=`${ref.getFullYear()}-${ref.getMonth()}`;
                    if(mk!==cur){if(cur!==null)groups.push({mk:cur,weeks:curWks});cur=mk;curWks=[];}
                    curWks.push(wk);
                  }
                  if(cur) groups.push({mk:cur,weeks:curWks});

                  return groups.map(({mk,weeks:mw})=>{
                    const [yr,mo]=mk.split("-").map(Number);
                    return (
                      <div key={mk}>
                        <div style={{padding:"8px 14px 6px",fontSize:11,fontWeight:600,color:t.textMuted,textTransform:"uppercase",letterSpacing:".15em",borderBottom:`1px solid ${t.border}`,background:t.surface}}>
                          {MONTH_NAMES[mo]} {yr}
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse"}}>
                          <thead>
                            <tr style={{background:t.surface2}}>
                              {DOW.map(d=><th key={d} style={{padding:"4px 6px",fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",textAlign:"left",width:"14.28%",fontWeight:500,borderBottom:`1px solid ${t.border}`}}>{d}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {mw.map((wk,wi)=>(
                              <tr key={wi}>
                                {wk.map((d,di)=>{
                                  if(!d)return <td key={di} style={{border:`1px solid ${t.border}`,minHeight:88,opacity:.15}}/>;
                                  const k=dateKey(d); const isToday=k===dateKey(TODAY); const isSel=selectedDay===k;
                                  const stats=runBal[k];
                                  const vis=visForDay(k).filter(c=>filterCat==="All"||c.category===filterCat||(filterCat==="income"&&c.type==="income"));
                                  return (
                                    <td key={di} className={`day-cell${isToday?" today":""}${dragOver===k?" drag-over":""}${isSel?" selected":""}`}
                                      onDragOver={e=>onDragOver(e,k)} onDragLeave={()=>setDragOver(null)}
                                      onDrop={e=>onDrop(e,k)} onClick={()=>setSelectedDay(isSel?null:k)}>
                                      <button className="add-btn" onClick={e=>{e.stopPropagation();setAddModal(k);}}>+</button>
                                      <div style={{fontSize:11,fontWeight:600,color:isToday?t.accent:t.textMuted,marginBottom:2}}>{d.getDate()}</div>
                                      <div style={{overflow:"hidden",maxHeight:58}}>
                                        {vis.slice(0,3).map(c=>(
                                          <div key={c.id} className="chip"
                                            style={{background:(CATEGORY_COLORS[c.type==="income"?"income":c.category]||t.accent)+"22",color:CATEGORY_COLORS[c.type==="income"?"income":c.category]||t.accent}}
                                            draggable={!c._isDebtPayment} onDragStart={e=>{e.stopPropagation();!c._isDebtPayment&&onDragStart(e,c);}} onClick={e=>e.stopPropagation()}>
                                            {c.type==="income"?"↑":"↓"} {c.amount<100?`$${c.amount}`:`$${Math.round(c.amount)}`}{c._isDebtPayment?"⚡":""}
                                          </div>
                                        ))}
                                        {vis.length>3&&<div style={{fontSize:9,color:t.textDim,marginTop:1}}>+{vis.length-3} more</div>}
                                      </div>
                                      {stats&&(
                                        <div style={{position:"absolute",bottom:0,left:0,right:0,borderTop:`1px solid ${t.border}`,padding:"2px 5px",background:t.surface}}>
                                          <div style={{fontSize:8,color:stats.budgetRemaining>=0?t.textDim:t.danger,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:500}}>
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
                  });
                })()}
              </div>

              {/* Side panel */}
              {selectedDay&&selStats&&(
                <div style={{width:272,borderLeft:`1px solid ${t.border2}`,padding:18,flexShrink:0,background:t.surface}}>
                  <div style={{fontSize:12,fontWeight:600,color:t.textMuted,marginBottom:16}}>
                    {new Date(selectedDay+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                    {[
                      {label:"Cash Bal",  value:fmt(selStats.balance),          color:selStats.balance>=0?t.accent:t.danger},
                      {label:"Bgt Left",  value:fmt(selStats.budgetRemaining),  color:selStats.budgetRemaining>=0?t.accentSub:t.danger},
                      {label:"Income",    value:fmt(selStats.income),            color:t.accent},
                      {label:"Expenses",  value:fmt(selStats.expenses),          color:t.danger},
                    ].map(s=>(
                      <div key={s.label} className="side-stat">
                        <div style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",marginBottom:4,fontWeight:500}}>{s.label}</div>
                        <div style={{fontSize:16,fontWeight:700,color:s.color,fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:10,fontWeight:600,color:t.textDim,textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Charges</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {selCharges.length===0&&<div style={{fontSize:12,color:t.textDim,padding:"8px 0"}}>No charges this day.</div>}
                    {selCharges.map(c=>(
                      <div key={c.id} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",background:c._isDebtPayment?t.dangerBg:t.surface2,border:`1px solid ${c._isDebtPayment?t.dangerBd:t.border}`,borderRadius:7}}>
                        <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:CATEGORY_COLORS[c.type==="income"?"income":c.category]||t.accent}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,color:t.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{c.payee}</div>
                          <div style={{fontSize:9,color:t.textDim}}>{c._isDebtPayment?"⚡ payoff calc":c.category}</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:c.type==="income"?t.accent:t.danger,flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{c.type==="income"?"+":"−"}{fmt(c.amount)}</div>
                        {c.source!=="lunchmoney"&&!c._isDebtPayment&&<button onClick={()=>removeCharge(c.id)} style={{background:"none",border:"none",color:t.textDim,cursor:"pointer",fontSize:17,lineHeight:1,padding:"0 2px"}}>×</button>}
                      </div>
                    ))}
                  </div>
                  <button className="btn" style={{width:"100%",marginTop:14,textAlign:"center"}} onClick={()=>setAddModal(selectedDay)}>+ Add Charge</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}


      {/* ════════════ TASKS ════════════ */}
      {section==="tasks" && (
        <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 54px)"}}>

          {/* Stat bar */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:`1px solid ${t.border2}`,flexShrink:0}}>
            {[
              {label:"Overdue",  value:ofStats.overdue, color:t.danger,    sub:"need attention"},
              {label:"Due Today",value:ofStats.today,   color:t.warning,   sub:"on the docket"},
              {label:"Flagged",  value:ofStats.flagged, color:"#F59E0B",   sub:"marked priority"},
              {label:"No Date",  value:ofStats.noDate,  color:t.textMuted, sub:"someday tasks"},
            ].map(s=>(
              <div key={s.label} className="stat-card">
                <div style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".12em",marginBottom:8,fontWeight:500}}>{s.label}</div>
                <div style={{fontSize:30,fontWeight:600,color:s.color,letterSpacing:"-0.03em",fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
                <div style={{fontSize:11,color:t.textMuted}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 20px",borderBottom:`1px solid ${t.border2}`,background:t.surface,flexShrink:0,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:6}}>
              {[["dashboard","☰ List"],["calendar","📅 Calendar"]].map(([v,l])=>(
                <button key={v} className={`btn ${ofView===v?"active":""}`} onClick={()=>setOfView(v)}>{l}</button>
              ))}
            </div>
            <div style={{width:1,height:24,background:t.border2}}/>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {["All","Overdue","Flagged","📆 Day 2 Day","🔴 Sell 300 Planners 📖","🔴Publish Project Guidance Platform👨‍💻","🟢Eliminate CC Debt 💳 🚫","⚪️Complete Scrum Master certification","🟢Buy Scan Home🏡"].map(f=>(
                <button key={f} className={`btn ${ofFilter===f?"active":""}`}
                  onClick={()=>setOfFilter(f)}
                  style={ofFilter===f&&!["All","Overdue","Flagged"].includes(f)?{borderColor:ofColor(f),color:ofColor(f),background:ofColor(f)+"1a"}:{}}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
              {/* Refresh tasks from OF */}
              <button
                className={`btn ${refreshStatus==="done"?"active":""}`}
                disabled={bridgeStatus!=="online" || refreshStatus==="loading"}
                onClick={fetchOFTasks}
                style={{
                  borderColor: refreshStatus==="error"?t.danger:refreshStatus==="done"?t.accent:"",
                  color: refreshStatus==="error"?t.danger:refreshStatus==="done"?t.accent:"",
                  opacity: bridgeStatus!=="online"?0.4:1,
                  cursor: bridgeStatus!=="online"?"not-allowed":"pointer",
                }}>
                {refreshStatus==="loading"?"⏳ Fetching from OF...":refreshStatus==="done"?"✓ Up to date":refreshStatus==="error"?"✗ Fetch failed":"↻ Refresh OF"}
              </button>
              {/* Bridge status — always visible */}
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",
                border:`1px solid ${bridgeStatus==="online"?t.accent:bridgeStatus==="offline"?t.danger:t.border3}`,
                borderRadius:6,cursor:"pointer"}}
                onClick={checkBridge}
                title="Click to recheck bridge status">
                <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                  background:bridgeStatus==="online"?t.accent:bridgeStatus==="offline"?t.danger:"#64748B"}}/>
                <span style={{fontSize:10,color:bridgeStatus==="online"?t.accent:bridgeStatus==="offline"?t.danger:t.textDim,
                  fontFamily:"'Syne',sans-serif",fontWeight:700,letterSpacing:".06em",textTransform:"uppercase"}}>
                  {bridgeStatus==="online"?"Bridge live":bridgeStatus==="offline"?"Bridge offline":"Bridge..."}
                </span>
              </div>
              {[["Inbox","omnifocus:///inbox"],["Today","omnifocus:///today"],["Flagged","omnifocus:///flagged"],["Forecast","omnifocus:///forecast"]].map(([label,href])=>(
                <a key={label} href={href} style={{fontSize:10,color:t.textMuted,textDecoration:"none",padding:"4px 10px",border:`1px solid ${t.border3}`,borderRadius:6,fontFamily:"'Syne',sans-serif",fontWeight:700,letterSpacing:".06em",textTransform:"uppercase",transition:"color .15s,border-color .15s"}}
                  onMouseOver={e=>{e.currentTarget.style.color=t.accent;e.currentTarget.style.borderColor=t.accent;}}
                  onMouseOut={e=>{e.currentTarget.style.color=t.textMuted;e.currentTarget.style.borderColor=t.border3;}}>
                  {label} ↗
                </a>
              ))}
            </div>
          </div>

          <div style={{flex:1,display:"flex",overflow:"hidden"}}>

            {/* ── LIST VIEW ── */}
            {ofView==="dashboard" && (
              <div style={{flex:1,overflow:"auto",padding:20,display:"flex",flexDirection:"column",gap:20}}>
                {Object.entries(
                  ofFiltered.reduce((acc,t)=>{(acc[t.project]=acc[t.project]||[]).push(t);return acc;},{})
                ).map(([project,tasks])=>(
                  <div key={project}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:ofColor(project),flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:700,color:t.textMuted,textTransform:"uppercase",letterSpacing:".1em",fontFamily:"'Syne',sans-serif"}}>{project}</span>
                      <span style={{fontSize:10,color:t.textDim}}>({tasks.length})</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {tasks.map(task=>{
                        const due=ofDueLabel(task.dueDate);
                        const dueColor={overdue:t.danger,today:t.warning,soon:t.accentSub,upcoming:t.textDim,nodate:t.textDim}[due];
                        const dueIcon={overdue:"⚠️ Overdue · ",today:"🔴 Today · ",soon:"🟡 Soon · ",upcoming:"📅 ",nodate:""}[due];
                        return (
                          <div key={task.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
                            background:t.surface,border:`1px solid ${due==="overdue"?t.dangerBd:t.border2}`,
                            borderLeft:`3px solid ${ofColor(task.project)}`,borderRadius:7,
                            transition:"background .12s",cursor:"default",
                            background:due==="overdue"?t.dangerBg:t.surface}}
                            onMouseOver={e=>e.currentTarget.style.background=t.surface2}
                            onMouseOut={e=>e.currentTarget.style.background=due==="overdue"?t.dangerBg:t.surface}>
                            {task.flagged&&<span style={{fontSize:11,flexShrink:0}}>🚩</span>}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,color:t.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{task.name}</div>
                              {task.dueDate&&<div style={{fontSize:10,color:dueColor,marginTop:2}}>{dueIcon}{task.dueDate}</div>}
                            </div>
                            <a href={`omnifocus:///task/${task.id}`}
                              style={{fontSize:10,color:t.textDim,textDecoration:"none",padding:"3px 8px",border:`1px solid ${t.border3}`,borderRadius:5,flexShrink:0,transition:"all .15s"}}
                              onMouseOver={e=>{e.currentTarget.style.color=ofColor(task.project);e.currentTarget.style.borderColor=ofColor(task.project);}}
                              onMouseOut={e=>{e.currentTarget.style.color=t.textDim;e.currentTarget.style.borderColor=t.border3;}}>
                              Open ↗
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {ofFiltered.length===0&&<div style={{textAlign:"center",color:t.textDim,paddingTop:60,fontSize:14}}>No tasks match this filter.</div>}
              </div>
            )}

            {/* ── CALENDAR VIEW ── */}
            {ofView==="calendar" && (
              <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",borderBottom:`1px solid ${t.border2}`,background:t.surface,flexShrink:0}}>
                  <button className="btn" onClick={()=>setOfMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()-1);return n;})}>‹</button>
                  <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:t.text,minWidth:160,textAlign:"center"}}>
                    {MONTH_NAMES[ofMonth.getMonth()]} {ofMonth.getFullYear()}
                  </span>
                  <button className="btn" onClick={()=>setOfMonth(m=>{const n=new Date(m);n.setMonth(n.getMonth()+1);return n;})}>›</button>
                  <span style={{marginLeft:"auto",fontSize:10,color:t.textDim}}>Drag tasks to reschedule</span>
                </div>
                <div style={{flex:1,overflow:"auto",padding:10}}>
                  {(()=>{
                    const yr=ofMonth.getFullYear(),mo=ofMonth.getMonth();
                    const firstDay=new Date(yr,mo,1).getDay();
                    const daysInMonth=new Date(yr,mo+1,0).getDate();
                    const cells=[...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
                    const rows=[];for(let i=0;i<cells.length;i+=7)rows.push(cells.slice(i,i+7));
                    return (
                      <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
                        <thead><tr>{DOW.map(d=><th key={d} style={{fontSize:9,color:t.textDim,fontWeight:600,padding:"4px 6px",textAlign:"left",textTransform:"uppercase",letterSpacing:".08em"}}>{d}</th>)}</tr></thead>
                        <tbody>
                          {rows.map((row,ri)=>(
                            <tr key={ri}>
                              {row.map((day,di)=>{
                                if(!day) return <td key={di} style={{border:`1px solid ${t.border}`,minHeight:90,opacity:.1}}/>;
                                const k=`${yr}-${String(mo+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                                const isToday=k===dateKey(TODAY);
                                const isDragOver=ofDragOver===k;
                                const tasks=ofByDate[k]||[];
                                return (
                                  <td key={di} style={{border:`1px solid ${isToday?t.accent:t.border}`,borderWidth:isToday?2:1,
                                    padding:"4px 4px 4px",minHeight:90,verticalAlign:"top",
                                    background:isDragOver?t.cellDrag:isToday?t.accent+"0a":t.bg,transition:"background .12s"}}
                                    onDragOver={e=>ofOnDragOver(e,k)} onDragLeave={()=>setOfDragOver(null)} onDrop={e=>ofOnDrop(e,k)}>
                                    <div style={{fontSize:11,fontWeight:600,color:isToday?t.accent:t.textMuted,marginBottom:3}}>{day}</div>
                                    {tasks.slice(0,3).map(task=>(
                                      <div key={task.id} draggable onDragStart={e=>ofOnDragStart(e,task)}
                                        style={{fontSize:9,padding:"2px 5px",borderRadius:3,marginBottom:2,cursor:"grab",
                                          background:ofColor(task.project)+"22",color:ofColor(task.project),
                                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                                          borderLeft:`2px solid ${ofColor(task.project)}`}}>
                                        {task.flagged?"🚩 ":""}{task.name}
                                      </div>
                                    ))}
                                    {tasks.length>3&&<div style={{fontSize:9,color:t.textDim}}>+{tasks.length-3}</div>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ── Pending sync sidebar ── */}
            {pendingChanges.length>0&&(
              <div style={{width:240,borderLeft:`1px solid ${t.border2}`,padding:14,background:t.surface,flexShrink:0,display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:13,color:t.accent}}>Pending ({pendingChanges.length})</div>
                  {/* Bridge status dot */}
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:bridgeStatus==="online"?t.accent:bridgeStatus==="offline"?t.danger:"#64748B"}}/>
                    <span style={{fontSize:9,color:t.textDim,textTransform:"uppercase",letterSpacing:".06em"}}>
                      {bridgeStatus==="online"?"Bridge live":bridgeStatus==="offline"?"Bridge offline":"Checking..."}
                    </span>
                  </div>
                </div>

                <div style={{fontSize:10,color:t.textDim,lineHeight:1.5}}>
                  {bridgeStatus==="online"
                    ? "Bridge is running. Click Sync to push changes directly to OmniFocus."
                    : "Start the bridge server to enable one-click sync, or use the clipboard fallback."}
                </div>

                <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column",gap:5}}>
                  {pendingChanges.map(c=>(
                    <div key={c.id} style={{padding:"7px 10px",background:t.surface2,border:`1px solid ${t.border2}`,borderRadius:6}}>
                      <div style={{fontSize:11,color:t.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
                      <div style={{fontSize:10,color:t.textDim,marginTop:2}}>{c.oldDate||"—"} → <span style={{color:t.accent}}>{c.newDate}</span></div>
                    </div>
                  ))}
                </div>

                {/* Primary: live sync (when bridge online) */}
                {bridgeStatus==="online"&&(
                  <button className={`btn ${syncStatus==="done"?"active":""}`}
                    style={{width:"100%",textAlign:"center",
                      background:syncStatus==="error"?t.dangerBg:syncStatus==="done"?t.accent+"1a":"",
                      borderColor:syncStatus==="error"?t.danger:syncStatus==="done"?t.accent:"",
                      color:syncStatus==="error"?t.danger:syncStatus==="done"?t.accent:""}}
                    disabled={syncStatus==="syncing"}
                    onClick={syncToOmniFocus}>
                    {syncStatus==="syncing"?"⏳ Syncing...":syncStatus==="done"?"✓ Synced to OmniFocus":syncStatus==="error"?"✗ Sync failed — retry?":"⚡ Sync to OmniFocus"}
                  </button>
                )}

                {/* Fallback: clipboard */}
                <button className={`btn ${ofScriptCopied?"active":""}`}
                  style={{width:"100%",textAlign:"center"}}
                  onClick={copyFallbackScript}>
                  {ofScriptCopied?"✓ Copied!":bridgeStatus==="online"?"Copy AppleScript (fallback)":"Copy AppleScript"}
                </button>

                <div style={{display:"flex",gap:6}}>
                  <button className="btn" style={{flex:1,textAlign:"center"}} onClick={checkBridge}>↻ Check bridge</button>
                  <button className="btn" style={{flex:1,textAlign:"center"}} onClick={()=>setPendingChanges([])}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {addModal&&(
        <div className="modal-overlay" onClick={()=>setAddModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:800,color:t.accent,marginBottom:18}}>
              Add Charge
              <span style={{fontSize:13,color:t.textDim,fontFamily:"'Inter',sans-serif",fontWeight:400,marginLeft:10}}>
                {new Date(addModal+"T12:00:00").toLocaleDateString("en-US",{month:"long",day:"numeric"})}
              </span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input placeholder="Payee / description" value={newCharge.payee} onChange={e=>setNewCharge(p=>({...p,payee:e.target.value}))} style={{width:"100%"}} autoFocus/>
              <input type="number" placeholder="Amount" value={newCharge.amount} onChange={e=>setNewCharge(p=>({...p,amount:e.target.value}))} style={{width:"100%"}}/>
              <div style={{display:"flex",gap:8}}>
                <select value={newCharge.type} onChange={e=>setNewCharge(p=>({...p,type:e.target.value}))} style={{flex:1}}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <select value={newCharge.category} onChange={e=>setNewCharge(p=>({...p,category:e.target.value}))} style={{flex:1}}>
                  {Object.keys(CATEGORY_COLORS).filter(k=>k!=="income").map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div style={{display:"flex",gap:8,marginTop:6}}>
                <button className="btn" style={{flex:1}} onClick={()=>setAddModal(null)}>Cancel</button>
                <button className="btn active" style={{flex:1}} onClick={addManualCharge}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
