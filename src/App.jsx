import { useState, useMemo, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

// ─── Shared helpers ───────────────────────────────────────────────────────────
const TODAY = new Date(2026, 1, 28);
const EUR = 1.182;

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function fmt(n) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.abs(n));
}
function fmtFull(n) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
}
function fmtSigned(n) { return (n>=0?"+":"-")+fmt(n); }
const uid = () => Math.random().toString(36).slice(2,9);

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
    let available = monthlyBudget;
    accounts = accounts.map(a => {
      if (a.remaining<=0) return a;
      const interest = (a.remaining*a.apr)/100/12;
      const newRemaining = a.remaining+interest;
      const payment = Math.min(a.minPayment, newRemaining);
      return {...a, remaining:newRemaining-payment, totalPaid:a.totalPaid+payment, totalInterest:a.totalInterest+interest, _interestThisMonth:interest, _minPaid:payment};
    });
    available -= accounts.reduce((s,a)=>s+(a._minPaid||0),0);
    let sorted = [...accounts];
    if (strategy==="avalanche") sorted.sort((a,b)=>b.apr-a.apr);
    else if (strategy==="snowball") sorted.sort((a,b)=>a.remaining-b.remaining);
    for (let acc of sorted) {
      if (available<=0.005 || acc.remaining<=0) continue;
      const idx = accounts.findIndex(a=>a.id===acc.id);
      const extra = Math.min(available, accounts[idx].remaining);
      accounts[idx].remaining -= extra; accounts[idx].totalPaid += extra; available -= extra;
    }
    accounts = accounts.map(a=>({...a, remaining:Math.max(0,a.remaining), paidOffMonth:a.paidOffMonth!==null?a.paidOffMonth:a.remaining<=0.005?month:null}));
    const totalRemaining = accounts.reduce((s,a)=>s+a.remaining,0);
    const totalInterest = accounts.reduce((s,a)=>s+(a._interestThisMonth||0),0);
    const point = {month,totalRemaining,totalInterest,monthlyBudget};
    accounts.forEach(a=>{ point[a.name]=parseFloat(a.remaining.toFixed(2)); });
    schedule.push(point);
  }
  return {schedule, accounts, monthlyBudget};
}

// ─── Cash flow data ───────────────────────────────────────────────────────────
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
  {id:"lm-amex-biz2-mar",payee:"AMEX Biz Platinum",amount:500,date:"2026-03-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-spark2-mar",payee:"Capital One Spark",amount:257.50,date:"2026-03-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-applecard-mar",payee:"Apple Card",amount:300,date:"2026-03-31",type:"expense",source:"lunchmoney",category:"Debt"},
  // April
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
  {id:"lm-clean-apr",payee:"Clean Ireland",amount:+(200*EUR).toFixed(2),date:"2026-04-11",type:"expense",source:"lunchmoney",category:"Housing"},
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
  {id:"lm-amex-biz2-apr",payee:"AMEX Biz Platinum",amount:500,date:"2026-04-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-spark2-apr",payee:"Capital One Spark",amount:257.50,date:"2026-04-29",type:"expense",source:"lunchmoney",category:"Debt"},
  {id:"lm-applecard-apr",payee:"Apple Card",amount:300,date:"2026-04-30",type:"expense",source:"lunchmoney",category:"Debt"},
];

function buildDays(startDate, n) {
  const days = [];
  for (let i=0;i<n;i++) days.push(addDays(startDate,i));
  return days;
}
function buildWeeks(days) {
  const weeks=[]; let week=[];
  const firstDay = days[0].getDay();
  for (let i=0;i<firstDay;i++) week.push(null);
  for (const d of days) {
    week.push(d);
    if (week.length===7){weeks.push(week);week=[];}
  }
  if (week.length){while(week.length<7)week.push(null);weeks.push(week);}
  return weeks;
}

const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [section, setSection] = useState("payoff"); // "payoff" | "cashflow"

  // ── Shared debt state (lifted so cashflow can read it) ──
  const [debts, setDebts] = useState(INITIAL_DEBTS.map((d,i)=>({...d,color:DEBT_COLORS[i]})));
  const [strategy, setStrategy] = useState("avalanche");
  const [extraPayment, setExtraPayment] = useState(500);

  const { schedule, accounts, monthlyBudget: debtMonthlyBudget } = useMemo(
    () => computeAmortization(debts, strategy, extraPayment),
    [debts, strategy, extraPayment]
  );
  const totalDebt = debts.reduce((s,d)=>s+d.balance,0);
  const totalInterestPaid = accounts.reduce((s,a)=>s+a.totalInterest,0);
  const payoffMonths = schedule.length;
  const payoffDate = new Date(); payoffDate.setMonth(payoffDate.getMonth()+payoffMonths);
  const updateDebt = (id,field,val) => setDebts(prev=>prev.map(d=>d.id===id?{...d,[field]:parseFloat(val)||0}:d));
  const chartData = schedule.filter((_,i)=>i%Math.max(1,Math.floor(schedule.length/60))===0||i===schedule.length-1);

  const CustomTooltip = ({active,payload,label})=>{
    if (!active||!payload?.length) return null;
    return (
      <div style={{background:"#0d1f0f",border:"1px solid #2d5a2d",padding:"12px 16px",borderRadius:8,fontSize:12}}>
        <div style={{color:"#6EE7B7",fontWeight:700,marginBottom:6}}>Month {label}</div>
        {payload.map(p=>(
          <div key={p.name} style={{color:p.color,marginBottom:2}}>
            <span style={{color:"#94A3B8"}}>{p.name}: </span>{fmt(p.value)}
          </div>
        ))}
      </div>
    );
  };

  // ── Cash flow state ──
  const [startingBalance, setStartingBalance] = useState(4952);
  const [cfMonthlyBudget, setCfMonthlyBudget] = useState(6500);
  const [numDays, setNumDays] = useState(60);
  const [showLM, setShowLM] = useState(true);
  const [charges, setCharges] = useState([]);
  const [dragItem, setDragItem] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [showAddModal, setShowAddModal] = useState(null);
  const [newCharge, setNewCharge] = useState({payee:"",amount:"",type:"expense",category:"Manual"});
  const [filterCategory, setFilterCategory] = useState("All");
  const [selectedDay, setSelectedDay] = useState(null);
  const [activeView, setActiveView] = useState("calendar");
  const [activeDebtTab, setActiveDebtTab] = useState("chart");

  // Inject debt payment as a cash flow charge (1st of each month in window)
  const debtCharges = useMemo(() => {
    const result = [];
    const days = buildDays(TODAY, numDays);
    const seenMonths = new Set();
    for (const d of days) {
      if (d.getDate() === 1) {
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        if (!seenMonths.has(mk)) {
          seenMonths.add(mk);
          result.push({
            id: `debt-payment-${mk}`,
            payee: `Debt Payoff Budget`,
            amount: debtMonthlyBudget,
            date: dateKey(d),
            type: "expense",
            source: "debt-calculator",
            category: "Debt",
            _isDebtPayment: true,
          });
        }
      }
    }
    return result;
  }, [numDays, debtMonthlyBudget]);

  const days = useMemo(()=>buildDays(TODAY,numDays),[numDays]);
  const weeks = useMemo(()=>buildWeeks(days),[days]);

  const allCharges = useMemo(()=>{
    const lm = showLM ? LM_RECURRING : [];
    return [...lm,...charges,...debtCharges];
  },[showLM,charges,debtCharges]);

  const hiddenLMIds = useMemo(()=>new Set(charges.filter(c=>c._originalId).map(c=>c._originalId)),[charges]);

  const dayMap = useMemo(()=>{
    const map={};
    for (const c of allCharges){if(!map[c.date])map[c.date]=[];map[c.date].push(c);}
    return map;
  },[allCharges]);

  const runningBalance = useMemo(()=>{
    const result={}; let bal=startingBalance; let monthSpend={};
    for (const d of days){
      const key=dateKey(d);
      const mk=`${d.getFullYear()}-${d.getMonth()}`;
      if(!monthSpend[mk])monthSpend[mk]=0;
      const dayCharges=dayMap[key]||[];
      const income=dayCharges.filter(c=>c.type==="income").reduce((s,c)=>s+c.amount,0);
      const expenses=dayCharges.filter(c=>c.type==="expense").reduce((s,c)=>s+c.amount,0);
      monthSpend[mk]+=expenses; bal+=income-expenses;
      result[key]={income,expenses,net:income-expenses,balance:bal,budgetUsed:monthSpend[mk],budgetRemaining:cfMonthlyBudget-monthSpend[mk]};
    }
    return result;
  },[days,dayMap,startingBalance,cfMonthlyBudget]);

  const visibleChargesForDay = useCallback((key)=>{
    const all=dayMap[key]||[];
    return all.filter(c=>!(c.source==="lunchmoney"&&hiddenLMIds.has(c.id)));
  },[dayMap,hiddenLMIds]);

  const onDragStart = useCallback((e,charge)=>{setDragItem(charge);e.dataTransfer.effectAllowed="move";},[]);
  const onDragOver = useCallback((e,key)=>{e.preventDefault();setDragOver(key);},[]);
  const onDrop = useCallback((e,targetDate)=>{
    e.preventDefault();
    if (!dragItem||dragItem.date===targetDate){setDragItem(null);setDragOver(null);return;}
    if (dragItem.source==="lunchmoney"){
      const cloned={...dragItem,id:uid(),date:targetDate,source:"manual-lm",_originalId:dragItem.id};
      setCharges(prev=>[...prev.filter(c=>c.id!==dragItem.id),cloned]);
    } else if (dragItem.source!=="debt-calculator"){
      setCharges(prev=>prev.map(c=>c.id===dragItem.id?{...c,date:targetDate}:c));
    }
    setDragItem(null);setDragOver(null);
  },[dragItem]);

  const removeCharge = useCallback((id)=>setCharges(prev=>prev.filter(c=>c.id!==id)),[]);

  const addManualCharge = ()=>{
    if (!newCharge.payee||!newCharge.amount||!showAddModal) return;
    setCharges(prev=>[...prev,{id:uid(),payee:newCharge.payee,amount:parseFloat(newCharge.amount),type:newCharge.type,category:newCharge.category,date:showAddModal,source:"manual"}]);
    setNewCharge({payee:"",amount:"",type:"expense",category:"Manual"});
    setShowAddModal(null);
  };

  const selectedCharges = selectedDay ? visibleChargesForDay(selectedDay) : [];
  const selectedStats = selectedDay ? runningBalance[selectedDay] : null;

  // ── Shared styles ──
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
    * { box-sizing: border-box; }
    input[type=range] { accent-color: #4ADE80; }
    input[type=number], input[type=text], select {
      background:#0d1f0f;border:1px solid #2d5a2d;color:#e2f4e2;
      padding:5px 8px;border-radius:4px;font-family:inherit;font-size:12px;
    }
    input:focus,select:focus{outline:1px solid #4ADE80;border-color:#4ADE80;}
    ::-webkit-scrollbar{width:4px;height:4px;}
    ::-webkit-scrollbar-track{background:#0d1f0f;}
    ::-webkit-scrollbar-thumb{background:#2d5a2d;border-radius:2px;}
    .btn{background:#0d1f0f;border:1px solid #2d5a2d;color:#6a8a6a;padding:6px 14px;border-radius:4px;cursor:pointer;font-family:inherit;font-size:11px;text-transform:uppercase;letter-spacing:.08em;transition:all .2s;}
    .btn:hover{border-color:#4ADE80;color:#4ADE80;}
    .btn.active{background:#1a3a1a;border-color:#4ADE80;color:#4ADE80;}
    .tab-btn{background:none;border:none;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:.1em;text-transform:uppercase;padding:8px 20px;color:#4a6a4a;transition:all .2s;}
    .tab-btn.active{color:#4ADE80;border-bottom:2px solid #4ADE80;}
    .chip{display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:3px;font-size:10px;cursor:grab;user-select:none;margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;transition:opacity .15s;}
    .chip:active{cursor:grabbing;opacity:.7;}
    .chip:hover{filter:brightness(1.2);}
    .day-cell{border:1px solid #0d1f0d;padding:4px 4px 26px 4px;min-height:90px;transition:background .15s;position:relative;cursor:pointer;vertical-align:top;}
    .day-cell.today{border-color:#4ADE80;}
    .day-cell.drag-over{background:#0d2a0d!important;border-color:#4ADE80;}
    .day-cell:hover{background:#081408;}
    .debt-row:hover{background:#0a180a;}
    .add-btn{position:absolute;top:2px;right:2px;width:16px;height:16px;border-radius:50%;border:1px solid #2d5a2d;background:none;color:#4a6a4a;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;}
    .day-cell:hover .add-btn{opacity:1;}
    .add-btn:hover{border-color:#4ADE80;color:#4ADE80;}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:100;display:flex;align-items:center;justify-content:center;}
    .modal{background:#0a180a;border:1px solid #2d5a2d;border-radius:10px;padding:24px;min-width:320px;}
    .nav-btn{background:none;border:none;cursor:pointer;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;letter-spacing:.06em;padding:16px 28px;color:#2d5a2d;transition:all .2s;border-bottom:2px solid transparent;}
    .nav-btn.active{color:#4ADE80;border-bottom:2px solid #4ADE80;}
    .nav-btn:hover{color:#86EFAC;}
  `;

  return (
    <div style={{fontFamily:"'DM Mono','Courier New',monospace",background:"#050e06",minHeight:"100vh",color:"#e2f4e2"}}>
      <style>{CSS}</style>

      {/* ── Top nav ── */}
      <div style={{borderBottom:"1px solid #1a2e1a",display:"flex",alignItems:"center",padding:"0 24px",gap:0}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#4ADE80",letterSpacing:"-0.02em",padding:"16px 24px 16px 0",borderRight:"1px solid #1a2e1a",marginRight:8}}>
          DORIAN OS
        </div>
        {[["payoff","💳  DEBT PAYOFF"],["cashflow","📅  CASH FLOW"]].map(([s,label])=>(
          <button key={s} className={`nav-btn ${section===s?"active":""}`} onClick={()=>setSection(s)}>{label}</button>
        ))}
        {/* Live bridge stat */}
        <div style={{marginLeft:"auto",display:"flex",gap:24,alignItems:"center",fontSize:11}}>
          <div style={{textAlign:"right"}}>
            <div style={{color:"#4a6a4a",fontSize:9,textTransform:"uppercase",letterSpacing:".1em"}}>Debt Payment / mo</div>
            <div style={{color:"#F87171",fontWeight:500}}>{fmt(debtMonthlyBudget)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:"#4a6a4a",fontSize:9,textTransform:"uppercase",letterSpacing:".1em"}}>Debt-free</div>
            <div style={{color:"#4ADE80",fontWeight:500}}>{payoffDate.toLocaleDateString("en-US",{month:"short",year:"numeric"})}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:"#4a6a4a",fontSize:9,textTransform:"uppercase",letterSpacing:".1em"}}>Cash EOD today</div>
            <div style={{color:"#86EFAC",fontWeight:500}}>{fmt(runningBalance[dateKey(TODAY)]?.balance??startingBalance)}</div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* DEBT PAYOFF SECTION                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {section==="payoff" && (
        <div>
          {/* Stats bar */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,background:"#1a2e1a"}}>
            {[
              {label:"Total Debt",value:fmt(totalDebt),sub:"current balance"},
              {label:"Payoff Date",value:payoffDate.toLocaleDateString("en-US",{month:"short",year:"numeric"}),sub:`${payoffMonths} months`},
              {label:"Total Interest",value:fmt(totalInterestPaid),sub:"cost of debt"},
              {label:"Monthly Payment",value:fmt(debtMonthlyBudget),sub:`+${fmt(extraPayment)} extra`},
            ].map(s=>(
              <div key={s.label} style={{background:"#050e06",padding:"16px 20px"}}>
                <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".12em",marginBottom:6}}>{s.label}</div>
                <div style={{fontSize:22,fontWeight:500,color:"#4ADE80",letterSpacing:"-0.02em"}}>{s.value}</div>
                <div style={{fontSize:10,color:"#2d5a2d",marginTop:2}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{padding:"16px 24px",borderBottom:"1px solid #1a2e1a",display:"flex",gap:24,alignItems:"center",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>Strategy</div>
              <div style={{display:"flex",gap:6}}>
                {[["avalanche","Avalanche"],["snowball","Snowball"],["equal","Equal"]].map(([v,l])=>(
                  <button key={v} className={`btn ${strategy===v?"active":""}`} onClick={()=>setStrategy(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{flex:1,minWidth:240}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em"}}>Extra Monthly</span>
                <span style={{fontSize:13,color:"#4ADE80",fontWeight:500}}>{fmt(extraPayment)}</span>
              </div>
              <input type="range" min={0} max={5000} step={50} value={extraPayment} onChange={e=>setExtraPayment(+e.target.value)} style={{width:"100%",cursor:"pointer"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#2d5a2d",marginTop:2}}><span>$0</span><span>$5,000</span></div>
            </div>
            <div style={{padding:"8px 14px",background:"#0a180a",border:"1px solid #1a3a1a",borderRadius:6,fontSize:11}}>
              <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em",marginBottom:2}}>↓ Feeds into Cash Flow</div>
              <div style={{color:"#F87171"}}>{fmt(debtMonthlyBudget)}/mo as "Debt Payoff Budget"</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{borderBottom:"1px solid #1a2e1a",padding:"0 24px",display:"flex"}}>
            {["chart","schedule","accounts"].map(t=>(
              <button key={t} className={`tab-btn ${activeDebtTab===t?"active":""}`} onClick={()=>setActiveDebtTab(t)}>{t}</button>
            ))}
          </div>

          <div style={{padding:"24px"}}>
            {/* CHART */}
            {activeDebtTab==="chart" && (
              <div>
                <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Total Debt Drawdown</div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{top:10,right:10,left:10,bottom:0}}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4ADE80" stopOpacity={.3}/>
                        <stop offset="100%" stopColor="#4ADE80" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a"/>
                    <XAxis dataKey="month" stroke="#2d5a2d" tick={{fill:"#4a6a4a",fontSize:10}} tickFormatter={v=>`M${v}`}/>
                    <YAxis stroke="#2d5a2d" tick={{fill:"#4a6a4a",fontSize:10}} tickFormatter={v=>fmt(v)} width={75}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="totalRemaining" name="Total Remaining" stroke="#4ADE80" fill="url(#dg)" strokeWidth={2} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>

                <div style={{marginTop:20}}>
                  <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Per Card</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{top:10,right:10,left:10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2e1a"/>
                      <XAxis dataKey="month" stroke="#2d5a2d" tick={{fill:"#4a6a4a",fontSize:10}} tickFormatter={v=>`M${v}`}/>
                      <YAxis stroke="#2d5a2d" tick={{fill:"#4a6a4a",fontSize:10}} tickFormatter={v=>fmt(v)} width={75}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend wrapperStyle={{fontSize:10,color:"#6a8a6a"}}/>
                      {debts.filter(d=>d.balance>0).map((d,i)=>(
                        <Line key={d.id} type="monotone" dataKey={d.name} stroke={DEBT_COLORS[i%DEBT_COLORS.length]} strokeWidth={1.5} dot={false}/>
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div style={{marginTop:20}}>
                  <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em",marginBottom:8}}>Payoff Order</div>
                  {[...accounts].filter(a=>a.paidOffMonth).sort((a,b)=>a.paidOffMonth-b.paidOffMonth).map((a,i)=>{
                    const d=new Date(); d.setMonth(d.getMonth()+a.paidOffMonth);
                    return (
                      <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 12px",background:"#0a180a",borderRadius:6,border:"1px solid #1a2e1a",marginBottom:4}}>
                        <span style={{fontSize:10,color:"#2d5a2d",width:18}}>#{i+1}</span>
                        <div style={{width:8,height:8,borderRadius:"50%",background:DEBT_COLORS[debts.findIndex(dd=>dd.id===a.id)%DEBT_COLORS.length]}}/>
                        <span style={{flex:1,fontSize:12,color:"#86EFAC"}}>{a.name}</span>
                        <span style={{fontSize:11,color:"#4a6a4a"}}>M{a.paidOffMonth}</span>
                        <span style={{fontSize:11,color:"#6a8a6a"}}>{d.toLocaleDateString("en-US",{month:"short",year:"numeric"})}</span>
                        <span style={{fontSize:10,color:"#2d5a2d"}}>({fmtFull(a.totalInterest)} int.)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SCHEDULE */}
            {activeDebtTab==="schedule" && (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #2d5a2d"}}>
                      {["Month","Date","Payment","Interest","Principal","Balance"].map(h=>(
                        <th key={h} style={{padding:"8px 12px",textAlign:"right",color:"#4a6a4a",fontSize:9,textTransform:"uppercase",letterSpacing:".1em",fontWeight:400}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((row,i)=>{
                      const prevBal=i>0?schedule[i-1].totalRemaining:totalDebt;
                      const d=new Date(); d.setMonth(d.getMonth()+row.month);
                      return (
                        <tr key={row.month} className="debt-row" style={{borderBottom:"1px solid #0d1f0d"}}>
                          <td style={{padding:"6px 12px",color:"#4a6a4a",textAlign:"right"}}>{row.month}</td>
                          <td style={{padding:"6px 12px",color:"#6a8a6a",textAlign:"right"}}>{d.toLocaleDateString("en-US",{month:"short",year:"numeric"})}</td>
                          <td style={{padding:"6px 12px",color:"#86EFAC",textAlign:"right"}}>{fmtFull(row.monthlyBudget)}</td>
                          <td style={{padding:"6px 12px",color:"#F87171",textAlign:"right"}}>{fmtFull(row.totalInterest)}</td>
                          <td style={{padding:"6px 12px",color:"#4ADE80",textAlign:"right"}}>{fmtFull(prevBal-row.totalRemaining)}</td>
                          <td style={{padding:"6px 12px",color:"#e2f4e2",textAlign:"right",fontWeight:500}}>{fmtFull(row.totalRemaining)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ACCOUNTS */}
            {activeDebtTab==="accounts" && (
              <div>
                <div style={{fontSize:11,color:"#4a6a4a",marginBottom:12}}>Edit any field — updates forecast + cash flow in real-time.</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid #2d5a2d"}}>
                      {["","Account","Balance","APR %","Min Pmt","Paid Off","Interest"].map(h=>(
                        <th key={h} style={{padding:"8px 12px",textAlign:"left",color:"#4a6a4a",fontSize:9,textTransform:"uppercase",letterSpacing:".1em",fontWeight:400}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map((d,i)=>{
                      const acc=accounts.find(a=>a.id===d.id);
                      const mo=acc?.paidOffMonth; const pd=mo?new Date():null;
                      if(pd)pd.setMonth(pd.getMonth()+mo);
                      return (
                        <tr key={d.id} className="debt-row" style={{borderBottom:"1px solid #0d1f0d"}}>
                          <td style={{padding:"10px 12px"}}><div style={{width:10,height:10,borderRadius:"50%",background:DEBT_COLORS[i%DEBT_COLORS.length]}}/></td>
                          <td style={{padding:"10px 12px",color:"#86EFAC"}}>{d.name}</td>
                          <td style={{padding:"10px 12px"}}><input type="number" value={d.balance} step="0.01" onChange={e=>updateDebt(d.id,"balance",e.target.value)} style={{width:100}}/></td>
                          <td style={{padding:"10px 12px"}}><input type="number" value={d.apr} step="0.01" onChange={e=>updateDebt(d.id,"apr",e.target.value)} style={{width:70}}/></td>
                          <td style={{padding:"10px 12px"}}><input type="number" value={d.minPayment} step="1" onChange={e=>updateDebt(d.id,"minPayment",e.target.value)} style={{width:70}}/></td>
                          <td style={{padding:"10px 12px",color:mo?"#4ADE80":"#4a6a4a",fontSize:11}}>{mo?`${pd.toLocaleDateString("en-US",{month:"short",year:"numeric"})} (M${mo})`:"—"}</td>
                          <td style={{padding:"10px 12px",color:"#F87171",fontSize:11}}>{acc?fmtFull(acc.totalInterest):"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:"1px solid #2d5a2d"}}>
                      <td colSpan={2} style={{padding:"12px",color:"#4ADE80",fontWeight:500}}>TOTAL</td>
                      <td style={{padding:"12px",color:"#4ADE80",fontWeight:500}}>{fmtFull(totalDebt)}</td>
                      <td colSpan={3}/>
                      <td style={{padding:"12px",color:"#F87171",fontWeight:500}}>{fmtFull(totalInterestPaid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CASH FLOW SECTION                                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {section==="cashflow" && (
        <div>
          {/* Header controls */}
          <div style={{padding:"16px 24px",borderBottom:"1px solid #1a2e1a"}}>
            <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em"}}>Starting $</span>
                <input type="number" value={startingBalance} onChange={e=>setStartingBalance(+e.target.value)} style={{width:95}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em"}}>Monthly Budget</span>
                <input type="number" value={cfMonthlyBudget} onChange={e=>setCfMonthlyBudget(+e.target.value)} style={{width:95}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em"}}>Days</span>
                {[30,60,90].map(n=>(
                  <button key={n} className={`btn ${numDays===n?"active":""}`} onClick={()=>setNumDays(n)}>{n}</button>
                ))}
              </div>
              <button className={`btn ${showLM?"active":""}`} onClick={()=>setShowLM(v=>!v)}>{showLM?"✓ ":""}Lunch Money</button>
              {/* Debt bridge badge */}
              <div style={{marginLeft:"auto",padding:"6px 12px",background:"#F8717122",border:"1px solid #F8717144",borderRadius:6,fontSize:11}}>
                <span style={{color:"#4a6a4a",fontSize:9}}>From Payoff: </span>
                <span style={{color:"#F87171",fontWeight:500}}>{fmt(debtMonthlyBudget)}/mo</span>
                <span style={{color:"#4a6a4a",fontSize:9}}> shown on 1st</span>
              </div>
            </div>

            {/* View toggle + filters */}
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              {[["calendar","📅 Calendar"],["list","📋 List"]].map(([v,l])=>(
                <button key={v} className={`btn ${activeView===v?"active":""}`} onClick={()=>setActiveView(v)}>{l}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {["All",...Object.keys(CATEGORY_COLORS).filter(k=>k!=="income"),"income"].map(cat=>(
                <button key={cat} onClick={()=>setFilterCategory(cat)} style={{
                  background:filterCategory===cat?(CATEGORY_COLORS[cat]||"#4ADE80")+"33":"#0d1f0f",
                  color:CATEGORY_COLORS[cat]||"#4ADE80",
                  border:`1px solid ${filterCategory===cat?(CATEGORY_COLORS[cat]||"#4ADE80"):"#1a2e1a"}`,
                  cursor:"pointer",padding:"2px 10px",borderRadius:999,fontSize:10,textTransform:"uppercase",letterSpacing:".08em",
                }}>{cat}</button>
              ))}
            </div>
          </div>

          {/* ── LIST VIEW ── */}
          {activeView==="list" && (
            <div style={{padding:"0 24px 40px",maxWidth:680}}>
              {days.filter(d=>{
                const key=dateKey(d);
                const vis=visibleChargesForDay(key).filter(c=>filterCategory==="All"||c.category===filterCategory||(filterCategory==="income"&&c.type==="income"));
                return vis.length>0||key===dateKey(TODAY);
              }).map((d,i,arr)=>{
                const key=dateKey(d); const stats=runningBalance[key]; const isToday=key===dateKey(TODAY);
                const vis=visibleChargesForDay(key).filter(c=>filterCategory==="All"||c.category===filterCategory||(filterCategory==="income"&&c.type==="income"));
                const income=vis.filter(c=>c.type==="income"); const expenses=vis.filter(c=>c.type==="expense");
                return (
                  <div key={key} style={{display:"flex",gap:0}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:isToday?"#4ADE80":stats?.net>0?"#34D399":stats?.net<0?"#F87171":"#2d5a2d",border:`2px solid ${isToday?"#4ADE80":"#1a2e1a"}`,marginTop:18,flexShrink:0}}/>
                      {i<arr.length-1&&<div style={{width:1,flex:1,background:"#1a2e1a",minHeight:12}}/>}
                    </div>
                    <div style={{flex:1,padding:"12px 0 12px 12px",borderBottom:"1px solid #0a180a"}}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:vis.length?8:0}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                          <span style={{fontSize:13,fontWeight:500,color:isToday?"#4ADE80":"#86EFAC"}}>{d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                          {isToday&&<span style={{fontSize:9,color:"#4ADE80",textTransform:"uppercase",letterSpacing:".12em"}}>today</span>}
                        </div>
                        {stats&&(
                          <div style={{display:"flex",gap:16,alignItems:"center"}}>
                            {stats.net!==0&&<span style={{fontSize:11,color:stats.net>0?"#4ADE80":"#F87171"}}>{fmtSigned(stats.net)} net</span>}
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:14,fontWeight:500,color:stats.balance>=0?"#e2f4e2":"#F87171"}}>{fmt(stats.balance)}</div>
                              <div style={{fontSize:9,color:stats.budgetRemaining>=0?"#4a6a4a":"#F87171"}}>bgt {fmt(stats.budgetRemaining)} left</div>
                            </div>
                          </div>
                        )}
                      </div>
                      {vis.length>0&&(
                        <div style={{display:"flex",flexDirection:"column",gap:3}}>
                          {income.map(c=>(
                            <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 8px",background:"#4ADE8011",border:"1px solid #4ADE8022",borderRadius:5}} draggable onDragStart={e=>onDragStart(e,c)}>
                              <span style={{fontSize:10,color:"#4ADE80"}}>↑</span>
                              <span style={{flex:1,fontSize:12,color:"#86EFAC"}}>{c.payee}</span>
                              <span style={{fontSize:12,fontWeight:500,color:"#4ADE80"}}>+{fmt(c.amount)}</span>
                              {c.source!=="lunchmoney"&&c.source!=="debt-calculator"&&<button onClick={()=>removeCharge(c.id)} style={{background:"none",border:"none",color:"#4a6a4a",cursor:"pointer",fontSize:13}}>×</button>}
                            </div>
                          ))}
                          {expenses.map(c=>(
                            <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 8px",background:c._isDebtPayment?"#F8717111":"#0a180a",border:`1px solid ${c._isDebtPayment?"#F8717133":"#1a2e1a"}`,borderRadius:5}} draggable={!c._isDebtPayment} onDragStart={e=>!c._isDebtPayment&&onDragStart(e,c)}>
                              <div style={{width:7,height:7,borderRadius:"50%",background:CATEGORY_COLORS[c.category]||"#4a6a4a",flexShrink:0}}/>
                              <span style={{flex:1,fontSize:12,color:"#e2f4e2"}}>{c.payee}{c._isDebtPayment&&<span style={{fontSize:9,color:"#F87171",marginLeft:6}}>↗ payoff</span>}</span>
                              <span style={{fontSize:9,color:"#4a6a4a",marginRight:4}}>{c.category}</span>
                              <span style={{fontSize:12,fontWeight:500,color:"#F87171"}}>-{fmt(c.amount)}</span>
                              {c.source!=="lunchmoney"&&!c._isDebtPayment&&<button onClick={()=>removeCharge(c.id)} style={{background:"none",border:"none",color:"#4a6a4a",cursor:"pointer",fontSize:13}}>×</button>}
                            </div>
                          ))}
                          <button className="btn" style={{alignSelf:"flex-start",padding:"2px 10px",fontSize:10,marginTop:2}} onClick={()=>setShowAddModal(key)}>+ add</button>
                        </div>
                      )}
                      {vis.length===0&&<button className="btn" style={{padding:"2px 10px",fontSize:10}} onClick={()=>setShowAddModal(key)}>+ add charge</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CALENDAR VIEW ── */}
          {activeView==="calendar" && (
            <div style={{display:"flex",gap:0}}>
              <div style={{flex:1,overflowX:"auto"}}>
                {(()=>{
                  const monthGroups=[]; let currentMonth=null; let currentWeeks=[];
                  for (const week of weeks){
                    const refDay=week.find(d=>d!==null); if(!refDay)continue;
                    const mk=`${refDay.getFullYear()}-${refDay.getMonth()}`;
                    if(mk!==currentMonth){if(currentMonth!==null)monthGroups.push({month:currentMonth,weeks:currentWeeks});currentMonth=mk;currentWeeks=[];}
                    currentWeeks.push(week);
                  }
                  if(currentMonth)monthGroups.push({month:currentMonth,weeks:currentWeeks});

                  return monthGroups.map(({month,weeks:mWeeks})=>{
                    const [yr,mo]=month.split("-").map(Number);
                    return (
                      <div key={month}>
                        <div style={{padding:"10px 14px 4px",fontSize:10,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".15em",borderBottom:"1px solid #0d1f0d"}}>{MONTH_NAMES[mo]} {yr}</div>
                        <table style={{width:"100%",borderCollapse:"collapse"}}>
                          <thead>
                            <tr>{DOW.map(d=><th key={d} style={{padding:"3px 6px",fontSize:8,color:"#2d5a2d",textTransform:"uppercase",letterSpacing:".1em",textAlign:"left",width:"14.28%",fontWeight:400}}>{d}</th>)}</tr>
                          </thead>
                          <tbody>
                            {mWeeks.map((week,wi)=>(
                              <tr key={wi}>
                                {week.map((d,di)=>{
                                  if(!d)return <td key={di} className="day-cell" style={{opacity:.2}}/>;
                                  const key=dateKey(d); const isToday=key===dateKey(TODAY);
                                  const stats=runningBalance[key]; const isDragOver=dragOver===key; const isSelected=selectedDay===key;
                                  const visible=visibleChargesForDay(key).filter(c=>filterCategory==="All"||c.category===filterCategory||(filterCategory==="income"&&c.type==="income"));
                                  return (
                                    <td key={di} className={`day-cell${isToday?" today":""}${isDragOver?" drag-over":""}`}
                                      style={{background:isSelected?"#0a1e0a":undefined}}
                                      onDragOver={e=>onDragOver(e,key)} onDragLeave={()=>setDragOver(null)}
                                      onDrop={e=>onDrop(e,key)} onClick={()=>setSelectedDay(isSelected?null:key)}>
                                      <button className="add-btn" onClick={e=>{e.stopPropagation();setShowAddModal(key);}}>+</button>
                                      <div style={{fontSize:11,fontWeight:500,color:isToday?"#4ADE80":"#6a8a6a",marginBottom:2}}>{d.getDate()}</div>
                                      <div style={{overflow:"hidden",maxHeight:56}}>
                                        {visible.slice(0,3).map(c=>(
                                          <div key={c.id} className="chip"
                                            style={{background:(CATEGORY_COLORS[c.type==="income"?"income":c.category]||"#4ADE80")+"22",color:CATEGORY_COLORS[c.type==="income"?"income":c.category]||"#4ADE80"}}
                                            draggable={!c._isDebtPayment} onDragStart={e=>{e.stopPropagation();!c._isDebtPayment&&onDragStart(e,c);}} onClick={e=>e.stopPropagation()}>
                                            {c.type==="income"?"↑":"↓"} {c.amount<100?`$${c.amount}`:`$${Math.round(c.amount)}`}{c._isDebtPayment?"⚡":""}
                                          </div>
                                        ))}
                                        {visible.length>3&&<div style={{fontSize:8,color:"#4a6a4a"}}>+{visible.length-3} more</div>}
                                      </div>
                                      {stats&&(
                                        <div style={{position:"absolute",bottom:0,left:0,right:0,borderTop:"1px solid #0d1f0d",padding:"2px 4px",background:"#050e06"}}>
                                          <div style={{fontSize:8,color:stats.budgetRemaining>=0?"#4a6a4a":"#F87171",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
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
              {selectedDay&&selectedStats&&(
                <div style={{width:256,borderLeft:"1px solid #1a2e1a",padding:"16px",flexShrink:0}}>
                  <div style={{fontSize:10,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".12em",marginBottom:12}}>
                    {new Date(selectedDay+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                    {[
                      {label:"Cash Bal",value:fmt(selectedStats.balance),color:selectedStats.balance>=0?"#4ADE80":"#F87171"},
                      {label:"Bgt Left",value:fmt(selectedStats.budgetRemaining),color:selectedStats.budgetRemaining>=0?"#34D399":"#F87171"},
                      {label:"Income",value:fmt(selectedStats.income),color:"#4ADE80"},
                      {label:"Expenses",value:fmt(selectedStats.expenses),color:"#F87171"},
                    ].map(s=>(
                      <div key={s.label} style={{background:"#0a180a",border:"1px solid #1a2e1a",padding:"8px 10px",borderRadius:6}}>
                        <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em",marginBottom:3}}>{s.label}</div>
                        <div style={{fontSize:14,fontWeight:500,color:s.color}}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:9,color:"#4a6a4a",textTransform:"uppercase",letterSpacing:".1em",marginBottom:6}}>Charges</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {selectedCharges.length===0&&<div style={{fontSize:12,color:"#2d5a2d"}}>No charges</div>}
                    {selectedCharges.map(c=>(
                      <div key={c.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:c._isDebtPayment?"#F8717111":"#0a180a",border:`1px solid ${c._isDebtPayment?"#F8717133":"#1a2e1a"}`,borderRadius:5}}>
                        <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:CATEGORY_COLORS[c.type==="income"?"income":c.category]||"#4ADE80"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,color:"#86EFAC",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.payee}</div>
                          <div style={{fontSize:8,color:"#4a6a4a"}}>{c._isDebtPayment?"↗ payoff calculator":c.category}</div>
                        </div>
                        <div style={{fontSize:11,fontWeight:500,color:c.type==="income"?"#4ADE80":"#F87171",flexShrink:0}}>{c.type==="income"?"+":"-"}{fmt(c.amount)}</div>
                        {c.source!=="lunchmoney"&&!c._isDebtPayment&&<button onClick={()=>removeCharge(c.id)} style={{background:"none",border:"none",color:"#4a6a4a",cursor:"pointer",fontSize:13}}>×</button>}
                      </div>
                    ))}
                  </div>
                  <button className="btn" style={{width:"100%",marginTop:10,textAlign:"center"}} onClick={()=>setShowAddModal(selectedDay)}>+ Add Charge</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {showAddModal&&(
        <div className="modal-overlay" onClick={()=>setShowAddModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:"#4ADE80",marginBottom:14}}>
              Add Charge — {new Date(showAddModal+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"})}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input placeholder="Payee / description" value={newCharge.payee} onChange={e=>setNewCharge(p=>({...p,payee:e.target.value}))} style={{width:"100%"}}/>
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
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button className="btn" style={{flex:1}} onClick={()=>setShowAddModal(null)}>Cancel</button>
                <button className="btn active" style={{flex:1}} onClick={addManualCharge}>Add</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
