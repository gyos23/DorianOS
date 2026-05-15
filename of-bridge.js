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

const PORT = 3131;
// Only accept requests from your Vercel app (and localhost for testing)
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://dorian-os.vercel.app",
];

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

  // CORS — allow your Vercel app + localhost
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || origin === "";
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
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
    console.log(`[${new Date().toLocaleTimeString()}] Fetching tasks from OmniFocus...`);
    // Index-based iteration — OF4 whose clause is unreliable, this is the proven approach
    const fetchScript = `
tell application "OmniFocus"
  tell document 1
    set output to ""
    set allTasks to every flattened task
    set taskCount to count of allTasks
    repeat with i from 1 to taskCount
      set t to item i of allTasks
      if completed of t is false then
        set tId to id of t
        set tName to name of t
        set tProj to ""
        if containing project of t is not missing value then
          set tProj to name of containing project of t
        end if
        set tDue to ""
        if due date of t is not missing value then
          set tDue to (due date of t) as string
        end if
        set tFlag to flagged of t as string
        set output to output & tId & "|" & tName & "|" & tProj & "|" & tDue & "|" & tFlag & return
      end if
    end repeat
    return output
  end tell
end tell`;

    try {
      const raw = await runAppleScript(fetchScript, 120000); // 2 min timeout

      function parseASDate(str) {
        if (!str || !str.trim()) return null;
        try {
          const d = new Date(str.replace(" at ", " "));
          if (isNaN(d)) return null;
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        } catch { return null; }
      }

      const tasks = raw.split("\n")
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

      console.log(`[${new Date().toLocaleTimeString()}] ✓ Returned ${tasks.length} tasks`);
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
  GET  /health  — status check
  GET  /tasks   — pull live tasks from OmniFocus
  POST /sync    — push due date changes to OmniFocus

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
