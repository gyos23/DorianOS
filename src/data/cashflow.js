export const EUR = 1.182;

export const CATEGORY_COLORS = {
  Debt: "#F87171",
  Housing: "#FB923C",
  Bills: "#FBBF24",
  Subscription: "#60A5FA",
  Business: "#A78BFA",
  Savings: "#34D399",
  Giving: "#F472B6",
  income: "#4ADE80",
  Manual: "#94A3B8",
};

export function isDebtCharge(charge, debts = []) {
  if (!charge) return false;
  if (charge._isDebtPayment) return true;
  if (charge.category === "Debt") return true;
  const payee = (charge.payee || "").toLowerCase().trim();
  if (!payee) return false;
  return debts.some((d) => {
    const debtName = (d.name || "").toLowerCase().trim();
    if (!debtName) return false;
    if (payee === debtName) return true;
    if (payee.includes(debtName) || debtName.includes(payee)) return true;
    const prefixes = [
      "amex",
      "apple card",
      "nbkc",
      "capital one",
      "spark",
      "paypal",
      "discover",
      "chase",
      "citi",
      "barclays",
    ];
    return prefixes.some((p) => payee.includes(p) && debtName.includes(p));
  });
}

export const LM_RECURRING = [
  { id: "lm-afa-mar", payee: "AFA ORTIZ", amount: 950, date: "2026-03-03", type: "income", source: "lunchmoney" },
  { id: "lm-salary-mar", payee: "AMACH Salary", amount: +(5000 * EUR).toFixed(2), date: "2026-03-28", type: "income", source: "lunchmoney" },
  { id: "lm-afa-apr", payee: "AFA ORTIZ", amount: 950, date: "2026-04-03", type: "income", source: "lunchmoney" },
  { id: "lm-salary-apr", payee: "AMACH Salary", amount: +(5000 * EUR).toFixed(2), date: "2026-04-28", type: "income", source: "lunchmoney" },
  { id: "lm-amex-biz-mar", payee: "AMEX Biz Platinum", amount: 1600, date: "2026-03-01", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-nbkc-mar", payee: "NBKC Card", amount: 60, date: "2026-03-01", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-co-spark-mar", payee: "Capital One Spark", amount: 60, date: "2026-03-01", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-chatgpt-mar", payee: "ChatGPT", amount: 20, date: "2026-03-01", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-mortgage-mar", payee: "Rocket Mortgage", amount: 937.17, date: "2026-03-02", type: "expense", source: "lunchmoney", category: "Housing" },
  { id: "lm-icloud-mar", payee: "iCloud+ 2TB", amount: 9.99, date: "2026-03-03", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-stjude-mar", payee: "St Jude", amount: 10.20, date: "2026-03-03", type: "expense", source: "lunchmoney", category: "Giving" },
  { id: "lm-irish-mar", payee: "Irish Bills", amount: +(1300 * EUR).toFixed(2), date: "2026-03-04", type: "expense", source: "lunchmoney", category: "Housing" },
  { id: "lm-klarna-mar", payee: "Klarna (water filter)", amount: +(99.66 * EUR).toFixed(2), date: "2026-03-04", type: "expense", source: "lunchmoney", category: "Bills" },
  { id: "lm-amzn-prime-mar", payee: "Amazon Prime", amount: 8, date: "2026-03-06", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-proton-mar", payee: "Proton Mail", amount: 12.99, date: "2026-03-06", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-sq-url", payee: "Squarespace URL", amount: 20, date: "2026-03-06", type: "expense", source: "lunchmoney", category: "Business" },
  { id: "lm-sq-annual", payee: "Squarespace (annual)", amount: 300, date: "2026-03-06", type: "expense", source: "lunchmoney", category: "Business" },
  { id: "lm-notion-mar", payee: "Notion", amount: 10, date: "2026-03-11", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-arcade-mar", payee: "Apple Arcade", amount: 6.99, date: "2026-03-14", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-tmob-mar", payee: "T-Mobile", amount: 35, date: "2026-03-15", type: "expense", source: "lunchmoney", category: "Bills" },
  { id: "lm-amex-delta-mar", payee: "AMEX Delta Platinum", amount: 500, date: "2026-03-15", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-amzn-store-mar", payee: "Amazon Store Card", amount: 264.50, date: "2026-03-16", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-claude-mar", payee: "Claude AI", amount: 20, date: "2026-03-17", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-setapp-mar", payee: "Setapp", amount: 12.49, date: "2026-03-18", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-applecare-mar", payee: "AppleCare One", amount: 19.99, date: "2026-03-19", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-fidelity-mar", payee: "Fidelity 401k", amount: 800, date: "2026-03-21", type: "expense", source: "lunchmoney", category: "Savings" },
  { id: "lm-tello-mar", payee: "Tello (Biz)", amount: 6.92, date: "2026-03-21", type: "expense", source: "lunchmoney", category: "Bills" },
  { id: "lm-iptv-mar", payee: "UHF IPTV", amount: 1.99, date: "2026-03-23", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-aspire-mar", payee: "Aspire Student Loans", amount: 370, date: "2026-03-26", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-disney-mar", payee: "Disney+", amount: 21.99, date: "2026-03-26", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-vidiq-mar", payee: "VidIQ", amount: 7.50, date: "2026-03-26", type: "expense", source: "lunchmoney", category: "Business" },
  { id: "lm-amex-biz2-mar", payee: "AMEX Biz Platinum (2)", amount: 500, date: "2026-03-29", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-spark2-mar", payee: "Capital One Spark (2)", amount: 257.50, date: "2026-03-29", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-applecard-mar", payee: "Apple Card", amount: 300, date: "2026-03-31", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-amex-biz-apr", payee: "AMEX Biz Platinum", amount: 1600, date: "2026-04-01", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-nbkc-apr", payee: "NBKC Card", amount: 60, date: "2026-04-01", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-spark-apr", payee: "Capital One Spark", amount: 60, date: "2026-04-01", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-chatgpt-apr", payee: "ChatGPT", amount: 20, date: "2026-04-01", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-canva-apr", payee: "Canva (annual)", amount: 119.99, date: "2026-04-02", type: "expense", source: "lunchmoney", category: "Business" },
  { id: "lm-ga-apr", payee: "GA Corp Registration", amount: 55, date: "2026-04-02", type: "expense", source: "lunchmoney", category: "Business" },
  { id: "lm-mortgage-apr", payee: "Rocket Mortgage", amount: 937.17, date: "2026-04-02", type: "expense", source: "lunchmoney", category: "Housing" },
  { id: "lm-icloud-apr", payee: "iCloud+ 2TB", amount: 9.99, date: "2026-04-03", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-stjude-apr", payee: "St Jude", amount: 10.20, date: "2026-04-03", type: "expense", source: "lunchmoney", category: "Giving" },
  { id: "lm-irish-apr", payee: "Irish Bills", amount: +(1300 * EUR).toFixed(2), date: "2026-04-04", type: "expense", source: "lunchmoney", category: "Housing" },
  { id: "lm-klarna-apr", payee: "Klarna (water filter)", amount: +(99.66 * EUR).toFixed(2), date: "2026-04-04", type: "expense", source: "lunchmoney", category: "Bills" },
  { id: "lm-amzn-prime-apr", payee: "Amazon Prime", amount: 8, date: "2026-04-06", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-proton-apr", payee: "Proton Mail", amount: 12.99, date: "2026-04-06", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-notion-apr", payee: "Notion", amount: 10, date: "2026-04-11", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-arcade-apr", payee: "Apple Arcade", amount: 6.99, date: "2026-04-14", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-tmob-apr", payee: "T-Mobile", amount: 35, date: "2026-04-15", type: "expense", source: "lunchmoney", category: "Bills" },
  { id: "lm-amex-delta-apr", payee: "AMEX Delta Platinum", amount: 500, date: "2026-04-15", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-gfl-apr", payee: "GFL Environmental", amount: 67.50, date: "2026-04-15", type: "expense", source: "lunchmoney", category: "Bills" },
  { id: "lm-amzn-store-apr", payee: "Amazon Store Card", amount: 264.50, date: "2026-04-16", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-claude-apr", payee: "Claude AI", amount: 20, date: "2026-04-17", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-setapp-apr", payee: "Setapp", amount: 12.49, date: "2026-04-18", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-applecare-apr", payee: "AppleCare One", amount: 19.99, date: "2026-04-19", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-1pw-apr", payee: "1Password (annual)", amount: 35.88, date: "2026-04-20", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-fidelity-apr", payee: "Fidelity 401k", amount: 800, date: "2026-04-21", type: "expense", source: "lunchmoney", category: "Savings" },
  { id: "lm-tello-apr", payee: "Tello (Biz)", amount: 6.92, date: "2026-04-21", type: "expense", source: "lunchmoney", category: "Bills" },
  { id: "lm-iptv-apr", payee: "UHF IPTV", amount: 1.99, date: "2026-04-23", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-aspire-apr", payee: "Aspire Student Loans", amount: 370, date: "2026-04-26", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-disney-apr", payee: "Disney+", amount: 21.99, date: "2026-04-26", type: "expense", source: "lunchmoney", category: "Subscription" },
  { id: "lm-vidiq-apr", payee: "VidIQ", amount: 7.50, date: "2026-04-26", type: "expense", source: "lunchmoney", category: "Business" },
  { id: "lm-amex-biz2-apr", payee: "AMEX Biz Platinum (2)", amount: 500, date: "2026-04-29", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-spark2-apr", payee: "Capital One Spark (2)", amount: 257.50, date: "2026-04-29", type: "expense", source: "lunchmoney", category: "Debt" },
  { id: "lm-applecard-apr", payee: "Apple Card", amount: 300, date: "2026-04-30", type: "expense", source: "lunchmoney", category: "Debt" },
];
