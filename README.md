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

### 3. Bridge supervisor (toggle the bridge from the dashboard)

A browser page can't spawn or kill a local process on its own, so the Tasks tab's **Start/Stop Bridge** button talks to a second, much lighter process — `bridge-supervisor.js` — that does that on its behalf.

**Recommended: one-time setup, fully automatic after that.**

```bash
./setup-mac-autostart.sh
```

This prompts for your Anthropic API key (input is hidden, never saved to shell history), stores it in `~/.dorianos-bridge.env` (permissions locked to your user only, never committed to git), and installs a LaunchAgent so `bridge-supervisor.js` starts itself every time you log in. After running it once, you never touch a terminal again — the Tasks tab's **Start/Stop Bridge** button and the **🟢 Auto-start ON** pill next to it are all you need. Safe to re-run any time, e.g. to rotate your key.

Only macOS is supported (it installs a LaunchAgent). Re-running with a new key just overwrites the old setup.

**Manual alternative**, if you'd rather not install a LaunchAgent:

```bash
ANTHROPIC_API_KEY=your_key node bridge-supervisor.js
```

It listens at `http://localhost:3130` and only starts/stops `of-bridge.js` for you — it doesn't touch OmniFocus itself. You'll need to leave this running in a terminal (or re-run it after every restart) since it isn't registered to start automatically.

**Turning autostart back off:** click the **🟢 Auto-start ON** pill in the Tasks tab, or run `launchctl unload -w ~/Library/LaunchAgents/com.dorianos.bridge-supervisor.plist`. Either stops the supervisor immediately and it won't relaunch at your next login — re-run `./setup-mac-autostart.sh` whenever you want it back.

## Dev

```bash
npm install
npm run dev
```
