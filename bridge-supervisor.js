#!/usr/bin/env node
/**
 * Dorian OS — Bridge Supervisor
 * A tiny always-on helper that starts/stops of-bridge.js on request, so the
 * dashboard can toggle the bridge with a button instead of a terminal.
 *
 * Easiest setup: run ./setup-mac-autostart.sh once — it stores your API key
 * in a locked-down local file and installs a LaunchAgent so this script
 * starts itself at login. No terminal needed after that.
 *
 * Manual start (reads the key from the same local file, or from the env):
 *   node bridge-supervisor.js
 *   ANTHROPIC_API_KEY=your_key node bridge-supervisor.js
 *
 * It does not run OmniFocus commands itself — it only spawns/kills the real
 * of-bridge.js process, passing through its own env (including
 * ANTHROPIC_API_KEY) so the key only needs to live in one place.
 */

const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn, exec } = require("child_process");
const { isAllowedOrigin } = require("./bridge-cors.js");

const PORT = 3130;
const BRIDGE_SCRIPT = path.join(__dirname, "of-bridge.js");
const SECRETS_FILE = path.join(os.homedir(), ".dorianos-bridge.env");
const PLIST_LABEL = "com.dorianos.bridge-supervisor";
const PLIST_PATH = path.join(
  os.homedir(),
  "Library",
  "LaunchAgents",
  `${PLIST_LABEL}.plist`
);

// Load ANTHROPIC_API_KEY from the local secrets file if it isn't already
// set in the environment. Simple KEY=value parsing — no dependency needed.
function loadSecretsFile() {
  if (process.env.ANTHROPIC_API_KEY) return;
  try {
    const contents = fs.readFileSync(SECRETS_FILE, "utf8");
    for (const line of contents.split("\n")) {
      const match = line.match(/^ANTHROPIC_API_KEY=(.*)$/);
      if (match) {
        process.env.ANTHROPIC_API_KEY = match[1].trim();
        break;
      }
    }
  } catch {
    // no secrets file yet — fine, /start will report the missing key
  }
}
loadSecretsFile();

let child = null;

function isRunning() {
  return !!(child && child.exitCode === null && child.signalCode === null);
}

function startBridge() {
  if (isRunning()) return { started: false, reason: "already running" };
  child = spawn(process.execPath, [BRIDGE_SCRIPT], {
    cwd: __dirname,
    env: process.env,
    stdio: "ignore",
    detached: false,
  });
  child.on("exit", (code, signal) => {
    console.log(`[supervisor] of-bridge.js exited (code=${code}, signal=${signal})`);
  });
  console.log(`[supervisor] started of-bridge.js (pid ${child.pid})`);
  return { started: true };
}

function stopBridge() {
  if (!isRunning()) return Promise.resolve({ stopped: false, reason: "not running" });
  const pid = child.pid;
  const target = child;
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      console.log(`[supervisor] of-bridge.js (pid ${pid}) didn't exit in time, sending SIGKILL`);
      target.kill("SIGKILL");
      resolve({ stopped: true });
    }, 2000);
    target.once("exit", () => {
      clearTimeout(timer);
      console.log(`[supervisor] stopped of-bridge.js (pid ${pid})`);
      resolve({ stopped: true });
    });
    target.kill("SIGTERM");
  });
}

// Autostart is "enabled" iff the LaunchAgent plist exists — installed by
// setup-mac-autostart.sh. Disabling removes the plist (not just unloads
// it) so this stays accurate even if the bridge is later started
// manually — "installed" always means "will run at next login."
function autostartStatus() {
  return { installed: fs.existsSync(PLIST_PATH) };
}

function runLaunchctl(args) {
  return new Promise(resolve => {
    exec(`launchctl ${args}`, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || "";
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

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      running: isRunning(),
      pid: isRunning() ? child.pid : null,
      autostart: autostartStatus(),
    }));
    return;
  }

  if (req.method === "POST" && req.url === "/start") {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "ANTHROPIC_API_KEY isn't set. Run ./setup-mac-autostart.sh once, or restart with ANTHROPIC_API_KEY=your_key node bridge-supervisor.js",
      }));
      return;
    }
    const result = startBridge();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...result, running: isRunning() }));
    return;
  }

  if (req.method === "POST" && req.url === "/stop") {
    stopBridge().then(result => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ...result, running: isRunning() }));
    });
    return;
  }

  if (req.method === "POST" && req.url === "/autostart/disable") {
    if (!fs.existsSync(PLIST_PATH)) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ disabled: false, reason: "not installed" }));
      return;
    }
    // Tearing down this job kills this very process (a login helper has no
    // life outside its job), so: reply first (a delayed unload can still
    // race launchd's teardown against our own callback), delete the plist
    // file so status is correct immediately, then remove the job by label
    // (not by path — unlike `unload`, `remove` doesn't need the file to
    // still exist, so the delete-then-stop order is safe here).
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ disabled: true }));
    setTimeout(() => {
      try {
        fs.unlinkSync(PLIST_PATH);
      } catch {
        // already gone — fine
      }
      exec(`launchctl remove ${PLIST_LABEL}`, () => {
        process.exit(0);
      });
    }, 150);
    return;
  }

  if (req.method === "POST" && req.url === "/autostart/enable") {
    if (!fs.existsSync(PLIST_PATH)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "No LaunchAgent installed yet — run ./setup-mac-autostart.sh once from a terminal first.",
      }));
      return;
    }
    runLaunchctl(`load -w "${PLIST_PATH}"`).then(result => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ enabled: result.ok, ...result }));
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   Dorian OS — Bridge Supervisor           ║
║   Listening on http://localhost:${PORT}      ║
╚═══════════════════════════════════════════╝

Endpoints:
  GET  /status            — is of-bridge.js running? is autostart installed?
  POST /start              — spawn of-bridge.js
  POST /stop                — kill of-bridge.js
  POST /autostart/enable    — load the LaunchAgent (start at login)
  POST /autostart/disable   — unload the LaunchAgent (stops this process too)

${process.env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY is set." : "⚠ ANTHROPIC_API_KEY is NOT set — /start will fail until you run ./setup-mac-autostart.sh"}
Ready. Waiting for requests...
`);

  // The supervisor itself autostarts at login (via the LaunchAgent), so also
  // autostart of-bridge.js right away whenever we have a key for it — that's
  // what makes "log in and it's all just running" true end to end, instead
  // of still needing a manual Start Bridge click every time you reboot.
  if (process.env.ANTHROPIC_API_KEY) {
    const result = startBridge();
    console.log(
      result.started
        ? "[supervisor] auto-started of-bridge.js"
        : `[supervisor] skipped auto-start: ${result.reason}`
    );
  }
});

function shutdown() {
  if (isRunning()) child.kill("SIGTERM");
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
