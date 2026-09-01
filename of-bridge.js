#!/usr/bin/env node
/**
 * Dorian OS — OmniFocus Bridge Server
 * Runs on your Mac at http://localhost:3131
 * Receives task changes from the Vercel app and writes them to OmniFocus via AppleScript.
 *
 * Start:  node of-bridge.js
 * Stop:   Ctrl+C (or it auto-runs via launchd if you set that up)
 */

const http = require("http");
const { exec } = require("child_process");
const { isAllowedOrigin } = require("./bridge-cors.js");

const PORT = 3131;
// Claude sometimes wraps JSON replies in a ```json fence despite instructions not to.
function stripJsonFence(text) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

// ─── AppleScript builder ──────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toAppleScriptDate(iso) {
  const [yr, mo, dy] = iso.split("-");
  return `${MONTHS[parseInt(mo)-1]} ${parseInt(dy)}, ${yr}`;
}

function buildScript(changes) {
  const lines = changes.map(c => {
    // Try ID first, fall back to name if ID lookup fails
    const byId   = `first flattened task whose id = "${c.id}"`;
    const byName = `first flattened task whose name = "${(c.name||"").replace(/\\/g,"\\\\").replace(/"/g,'\\"')}"`;
    const lookup = c.id ? byId : byName;

    if (c.complete) {
      return `  set completed of (${lookup}) to true`;
    }
    if (c.newDate) {
      const dateStr = toAppleScriptDate(c.newDate);
      return `  set due date of (${lookup}) to date "${dateStr}"`;
    }
    if (c.newDate === null) {
      return `  set due date of (${lookup}) to missing value`;
    }
    return "";
  }).filter(Boolean);

  if (!lines.length) return null;

  return `tell application "OmniFocus"
  tell document 1
${lines.join("\n")}
  end tell
end tell`;
}

// ─── Run AppleScript ──────────────────────────────────────────────────────────
const fs   = require("fs");
const path = require("path");
const os   = require("os");

function runAppleScript(script, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `dorianOS_${Date.now()}.applescript`);
    fs.writeFileSync(tmpFile, script, "utf8");
    exec(`osascript "${tmpFile}"`, { timeout }, (err, stdout, stderr) => {
      fs.unlink(tmpFile, ()=>{});
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";

  // CORS — allow your Vercel app (production + previews) + localhost
  const allowed = isAllowedOrigin(origin);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    // Chrome's Private Network Access check: a public HTTPS page (the
    // Vercel preview) fetching a private address (localhost) has to get
    // this back on the preflight, or the browser blocks the request
    // before it ever reaches us — a plain Allow-Origin isn't enough.
    if (req.headers["access-control-request-private-network"] === "true") {
      res.setHeader("Access-Control-Allow-Private-Network", "true");
    }
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204); res.end(); return;
  }

  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "1.1.0" }));
    return;
  }

  // ── Live task fetch endpoint ──────────────────────────────────────────────
  if (req.method === "GET" && req.url === "/tasks") {
    console.log(`[${new Date().toLocaleTimeString()}] Fetching active tasks from OmniFocus...`);
    const fetchScript = `
tell application "OmniFocus"
  tell document 1
    set output to ""

    -- 1. Inbox tasks
    set inbTasks to every inbox task
    repeat with t in inbTasks
      if completed of t is false and dropped of t is false then
        set tDue to ""
        if due date of t is not missing value then
          set tDue to (due date of t) as string
        end if
        set output to output & (id of t) & "|" & (name of t) & "|📥 Inbox|" & tDue & "|" & (flagged of t as string) & linefeed
      end if
    end repeat

    -- 2. Active project leaf tasks
    set actProjs to every flattened project whose status is active status
    repeat with p in actProjs
      set pName to name of p
      set pTasks to every flattened task of p
      repeat with t in pTasks
        if completed of t is false and dropped of t is false and (number of tasks of t is 0) then
          set tDue to ""
          if due date of t is not missing value then
            set tDue to (due date of t) as string
          end if
          set output to output & (id of t) & "|" & (name of t) & "|" & pName & "|" & tDue & "|" & (flagged of t as string) & linefeed
        end if
      end repeat
    end repeat

    return output
  end tell
end tell`;

    try {
      const raw = await runAppleScript(fetchScript, 60000);

      function parseASDate(str) {
        if (!str || !str.trim()) return null;
        try {
          const d = new Date(str.replace(" at ", " "));
          if (!isNaN(d)) {
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          }
          // Fallback: DD/MM/YYYY
          const m = str.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
          if (m) {
            return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
          }
          return null;
        } catch { return null; }
      }

      const tasks = raw.split(/\r\n|\r|\n/)
        .filter(line => line.includes("|"))
        .map(line => {
          const parts = line.split("|");
          return {
            id:      parts[0] || "",
            name:    parts[1] || "",
            project: parts[2] || "",
            dueDate: parseASDate(parts[3]) || null,
            flagged: parts[4]?.trim() === "true",
          };
        })
        .filter(t => t.id && t.name);

      console.log(`[${new Date().toLocaleTimeString()}] ✓ Returned ${tasks.length} active tasks`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, tasks }));
    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] ✗ Error fetching tasks:`, err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Sync endpoint
  if (req.method === "POST" && req.url === "/sync") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { changes } = JSON.parse(body);
        if (!Array.isArray(changes) || changes.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "No changes provided" }));
          return;
        }

        const script = buildScript(changes);
        if (!script) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Could not build AppleScript from changes" }));
          return;
        }

        console.log(`[${new Date().toLocaleTimeString()}] Syncing ${changes.length} change(s) to OmniFocus...`);
        console.log("AppleScript:\n" + script);
        await runAppleScript(script);
        console.log(`[${new Date().toLocaleTimeString()}] ✓ Done`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, synced: changes.length }));
      } catch (err) {
        console.error(`[${new Date().toLocaleTimeString()}] ✗ Error:`, err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ── Insights endpoint ─────────────────────────────────────────────────────
  if (req.method === "GET" && req.url.startsWith("/insights")) {
    const params = new URL(req.url, "http://localhost").searchParams;
    const startStr = params.get("start") || (() => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })();
    const endStr   = params.get("end")   || new Date().toISOString().slice(0,10);
    const startMs  = new Date(startStr + "T00:00:00").getTime();
    const endMs    = new Date(endStr   + "T23:59:59").getTime();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set. Start bridge with: ANTHROPIC_API_KEY=your_key node of-bridge.js" }));
      return;
    }

    console.log(`[${new Date().toLocaleTimeString()}] Generating insights for ${startStr} → ${endStr}`);

    try {
      // Find all JSONL conversation files
      const projectsDir = path.join(os.homedir(), ".claude", "projects");
      const jsonlFiles = [];
      function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else if (entry.name.endsWith(".jsonl")) jsonlFiles.push(full);
        }
      }
      walk(projectsDir);

      // Extract user messages within date range
      const messages = [];
      for (const file of jsonlFiles) {
        const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            if (obj.type !== "user") continue;
            const ts = new Date(obj.timestamp).getTime();
            if (ts < startMs || ts > endMs) continue;
            const content = obj.message?.content;
            if (!content) continue;
            const text = typeof content === "string" ? content
              : Array.isArray(content) ? content.filter(b => b.type === "text").map(b => b.text).join(" ")
              : "";
            const clean = text.replace(/\s+/g, " ").trim();
            if (clean.length > 20) messages.push({ ts: obj.timestamp, text: clean.slice(0, 800) });
          } catch {}
        }
      }

      messages.sort((a, b) => new Date(a.ts) - new Date(b.ts));
      console.log(`[${new Date().toLocaleTimeString()}] Found ${messages.length} user messages in range`);

      if (messages.length === 0) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ themes: [], trends: [], summary: "No conversations found in this date range.", messageCount: 0 }));
        return;
      }

      // Build prompt — cap at ~60k chars
      const combined = messages.map(m => `[${m.ts.slice(0,10)}] ${m.text}`).join("\n");
      const capped = combined.slice(-60000);

      const prompt = `You are analyzing a person's Claude AI conversation history to surface insights about their thinking, goals, and patterns.

Date range: ${startStr} to ${endStr}
Total messages: ${messages.length}

Conversation excerpts (user messages only):
${capped}

Analyze this and return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence overview of what dominated this person's thinking this week",
  "themes": [
    { "name": "theme name", "description": "1-2 sentences", "color": "one of: #4ADE80 #38bdf8 #F87171 #FB923C #FBBF24 #A78BFA #F472B6 #34D399", "messageCount": N, "examples": ["brief example 1", "brief example 2"] }
  ],
  "pillars": [
    { "name": "pillar name (e.g. Finance, Business, Health, Work, Learning, Personal)", "percentage": N, "color": "hex" }
  ],
  "trends": [
    { "observation": "one concrete pattern or shift you noticed", "type": "positive|neutral|watch" }
  ],
  "topQuestions": ["the 3 most telling questions this person is wrestling with"]
}

Return only valid JSON, no markdown.`;

      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const claudeData = await claudeRes.json();
      if (!claudeRes.ok) throw new Error(claudeData.error?.message || "Claude API error");

      const raw = claudeData.content?.[0]?.text || "{}";
      const insights = JSON.parse(stripJsonFence(raw));
      insights.messageCount = messages.length;
      insights.dateRange = { start: startStr, end: endStr };

      console.log(`[${new Date().toLocaleTimeString()}] ✓ Insights generated (${insights.themes?.length || 0} themes)`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(insights));
    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] ✗ Insights error:`, err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ── Financial advice endpoint ─────────────────────────────────────────────
  if (req.method === "POST" && req.url === "/financial-advice") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const {
          debts = [],
          startBal = 0,
          debtMonthly = 0,
          cfBudget = 0,
          forecasts = {},
          cashZeroDate = null,
        } = JSON.parse(body || "{}");

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }));
          return;
        }

        const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
        const debtLines = debts
          .filter(d => (d.balance || 0) > 0)
          .sort((a, b) => b.balance - a.balance)
          .map(d => `- ${d.name}: $${(d.balance || 0).toFixed(2)} at ${d.apr}% APR, $${d.minPayment}/mo min`)
          .join("\n");

        const prompt = `You are a direct, no-fluff personal finance advisor. Analyze this financial snapshot and return prioritized, actionable advice. Be specific — name actual accounts, amounts, and dates where relevant.

DEBTS (sorted by balance):
${debtLines}
Total debt: $${totalDebt.toFixed(2)}
Monthly debt payments: $${debtMonthly.toFixed(2)}

CASH FLOW:
Current balance: $${startBal.toFixed(2)}
Monthly spending budget: $${cfBudget.toFixed(2)}
End of today: ${forecasts?.eod != null ? "$" + forecasts.eod.toFixed(2) : "unknown"}
End of week (${forecasts?.eowLabel || "this week"}): ${forecasts?.eow != null ? "$" + forecasts.eow.toFixed(2) : "outside forecast window"}
End of month (${forecasts?.eomLabel || "this month"}): ${forecasts?.eom != null ? "$" + forecasts.eom.toFixed(2) : "outside forecast window"}
${cashZeroDate ? `⚠ Balance goes NEGATIVE on ${cashZeroDate} — this is urgent` : "Balance stays positive through the forecast window"}

Return JSON only, no markdown, no code fences:
{
  "summary": "2-3 direct sentences: honest assessment of their situation and the single most important thing to focus on right now",
  "freeFlow": <number: estimated monthly discretionary cash after all known debt payments and budget commitments — can be negative>,
  "debtFocus": "<one sentence: which specific debt to attack hardest right now and the exact reason why>",
  "immediate": ["specific action 1 (do today or this week)", "action 2", "action 3"],
  "thisMonth": ["specific thing to do or avoid this month 1", "thing 2"],
  "watchOut": ["specific risk or pattern to watch 1", "risk 2"]
}`;

        console.log(`[${new Date().toLocaleTimeString()}] Generating financial advice...`);
        const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const claudeData = await claudeRes.json();
        if (!claudeRes.ok) throw new Error(claudeData.error?.message || "Claude API error");

        const advice = JSON.parse(stripJsonFence(claudeData.content?.[0]?.text || "{}"));
        console.log(`[${new Date().toLocaleTimeString()}] ✓ Financial advice generated`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(advice));
      } catch (err) {
        console.error(`[${new Date().toLocaleTimeString()}] ✗ Financial advice error:`, err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404); res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   Dorian OS — OmniFocus Bridge v1.1.0    ║
║   Listening on http://localhost:${PORT}      ║
╚═══════════════════════════════════════════╝

Endpoints:
  GET  /health           — status check
  GET  /tasks            — pull live tasks from OmniFocus
  POST /sync             — push due date changes to OmniFocus
  GET  /insights?start=  — generate AI insights from Claude conversations

Ready. Waiting for requests...
Press Ctrl+C to stop.
`);
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Is the bridge already running?`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});
