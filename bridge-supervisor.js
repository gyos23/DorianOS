#!/usr/bin/env node
/**
 * Dorian OS — Bridge Supervisor
 * A tiny always-on helper that starts/stops of-bridge.js on request, so the
 * dashboard can toggle the bridge with a button instead of a terminal.
 *
 * Start once (ideally at login via a LaunchAgent — see README):
 *   ANTHROPIC_API_KEY=your_key node bridge-supervisor.js
 *
 * It does not run OmniFocus commands itself — it only spawns/kills the real
 * of-bridge.js process, which it launches with this process's own env, so
 * ANTHROPIC_API_KEY only needs to be set once, here.
 */

const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 3130;
const BRIDGE_SCRIPT = path.join(__dirname, "of-bridge.js");

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://dorian-os.vercel.app",
];

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

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || "";
  const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o)) || origin === "";
  if (allowed) res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ running: isRunning(), pid: isRunning() ? child.pid : null }));
    return;
  }

  if (req.method === "POST" && req.url === "/start") {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        error: "ANTHROPIC_API_KEY is not set on the supervisor process. Restart it with ANTHROPIC_API_KEY=your_key node bridge-supervisor.js",
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
  GET  /status  — is of-bridge.js running?
  POST /start   — spawn of-bridge.js
  POST /stop    — kill of-bridge.js

${process.env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY is set." : "⚠ ANTHROPIC_API_KEY is NOT set — /start will fail until you restart with it."}
Ready. Waiting for requests...
`);
});

function shutdown() {
  if (isRunning()) child.kill("SIGTERM");
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
