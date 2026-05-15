// api/lunchmoney.js — Vercel serverless function
// Proxies Lunch Money API so the token never touches the frontend.
// Set LUNCHMONEY_TOKEN in Vercel Environment Variables.

export default async function handler(req, res) {
  const token = process.env.LUNCHMONEY_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "LUNCHMONEY_TOKEN not configured in Vercel env vars" });
  }

  // CORS — only needed if calling from browser directly (Vercel same-origin is fine)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const { endpoint } = req.query;

  // Whitelist allowed endpoints
  const ALLOWED = {
    "recurring":     "https://dev.lunchmoney.app/v1/recurring_expenses",
    "transactions":  "https://dev.lunchmoney.app/v1/transactions",
    "accounts":      "https://dev.lunchmoney.app/v1/plaid_accounts",
    "assets":        "https://dev.lunchmoney.app/v1/assets",
  };

  if (!ALLOWED[endpoint]) {
    return res.status(400).json({ error: `Unknown endpoint: ${endpoint}. Allowed: ${Object.keys(ALLOWED).join(", ")}` });
  }

  // Forward any query params (except our own `endpoint`) to LM
  const url = new URL(ALLOWED[endpoint]);
  for (const [key, val] of Object.entries(req.query)) {
    if (key !== "endpoint") url.searchParams.set(key, val);
  }

  try {
    const lmRes = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await lmRes.json();

    if (!lmRes.ok) {
      return res.status(lmRes.status).json({ error: data.error || "Lunch Money API error" });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
