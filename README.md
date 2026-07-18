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
        └── localhost:3131 (of-bridge.js) ─────► OmniFocus (AppleScript)
                                           └────► Claude API (Insights)
```

- **Frontend**: React 18 + Recharts, deployed on Vercel
- **API proxy**: `api/lunchmoney.js` — Vercel serverless function that keeps your Lunch Money token server-side
- **Local bridge**: `of-bridge.js` — Node.js HTTP server that runs on your Mac, talks to OmniFocus via AppleScript, and calls Claude's API for conversation insights

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

## Dev

```bash
npm install
npm run dev
```
