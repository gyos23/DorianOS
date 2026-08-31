# DorianOS

A personal operating system dashboard — a single-page React app that ties together financial tracking, cash flow planning, task management, and AI-powered self-reflection.

## What it is

**Debt Payoff** — Models credit card and loan payoff using avalanche, snowball, or equal-split strategies. Syncs live balances from Lunch Money and projects exact payoff dates and total interest costs per account.

**Cash Flow** — A 30/60/90-day calendar showing projected income and expenses from Lunch Money recurring items, with a running balance and monthly budget tracker. Items are draggable between dates. Debt payoff budget feeds in automatically from the Payoff tab.

**Tasks** — Pulls live tasks from OmniFocus via a local bridge server. Supports list and calendar views, per-project filters, and drag-to-reschedule with one-click sync back to OmniFocus. Falls back to an AppleScript clipboard copy when the bridge is offline.

**Insights** — Analyzes your recent Claude AI conversation history to surface themes, life pillars, patterns, and the questions you're most actively wrestling with. Powered by Claude Haiku via the local bridge.

## Architecture

```
browser (Vite/React) ──── /api/lunchmoney ────► Lunch Money API
        │                  (Vercel function)
        │
        ├── localhost:3131 (of-bridge.js) ─────► OmniFocus (AppleScript)
        │                                  └────► Claude API (Insights)
        │
        └── localhost:3130 (bridge-supervisor.js) ─► spawns/kills of-bridge.js
```

- **Frontend**: React 18 + Recharts, deployed on Vercel
- **API proxy**: `api/lunchmoney.js` — Vercel serverless function that keeps your Lunch Money token server-side
- **Local bridge**: `of-bridge.js` — Node.js HTTP server that runs on your Mac, talks to OmniFocus via AppleScript, and calls Claude's API for conversation insights
- **Bridge supervisor**: `bridge-supervisor.js` — optional tiny always-on helper that lets the dashboard's Start/Stop Bridge button spawn or kill `of-bridge.js` for you, instead of running it by hand in a terminal

## Setup

### 1. Vercel (frontend + LM proxy)

1. Connect the repo to Vercel
2. Add `LUNCHMONEY_TOKEN` to Vercel environment variables

### 2. Local bridge (OmniFocus + Insights)

Requires Node.js 18+ (uses built-in `fetch`).

```bash
ANTHROPIC_API_KEY=your_key node of-bridge.js
```

The bridge listens at `http://localhost:3131`. The app detects it automatically when you open the Tasks or Insights tabs. Without it, OmniFocus sync and Insights are unavailable; Debt Payoff and Cash Flow still work fully.

### 3. Bridge supervisor (optional — toggle the bridge from the dashboard)

A browser page can't spawn or kill a local process on its own, so the Tasks tab's **Start/Stop Bridge** button talks to a second, much lighter process — `bridge-supervisor.js` — that does that on its behalf. Run it once, with the same API key:

```bash
ANTHROPIC_API_KEY=your_key node bridge-supervisor.js
```

It listens at `http://localhost:3130` and only starts/stops `of-bridge.js` for you — it doesn't touch OmniFocus itself. Leave it running in the background (or set it up to start at login below); it uses negligible resources when the bridge itself is stopped.

**Optional: auto-start at login.** Create `~/Library/LaunchAgents/com.dorianos.bridge-supervisor.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.dorianos.bridge-supervisor</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/absolute/path/to/DorianOS/bridge-supervisor.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>ANTHROPIC_API_KEY</key><string>your_key</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>
```

Adjust the `node` path (`which node`) and the script path, then load it:

```bash
launchctl load ~/Library/LaunchAgents/com.dorianos.bridge-supervisor.plist
```

This plist stores your API key in plain text, readable only by your user account — fine for a personal machine, but keep the file's permissions private (`chmod 600`) and don't commit it.

## Dev

```bash
npm install
npm run dev
```
