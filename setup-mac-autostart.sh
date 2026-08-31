#!/usr/bin/env bash
# Dorian OS — one-time setup: store your Claude API key locally and make
# bridge-supervisor.js start automatically at login, so you never need to
# run a terminal command again. Safe to re-run any time (e.g. to rotate
# your key) — it just overwrites the previous setup.
#
# Usage:
#   ./setup-mac-autostart.sh          (recommended — prompts, hides input)
#   ./setup-mac-autostart.sh sk-...   (key as an argument — lands in your
#                                      shell history, only use if you don't
#                                      mind that)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_FILE="$HOME/.dorianos-bridge.env"
PLIST_LABEL="com.dorianos.bridge-supervisor"
PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_LABEL}.plist"

if [ "$(uname)" != "Darwin" ]; then
  echo "This script sets up a macOS LaunchAgent — it won't work on this OS."
  echo "You can still run the supervisor manually: node bridge-supervisor.js"
  exit 1
fi

NODE_PATH="$(command -v node || true)"
if [ -z "$NODE_PATH" ]; then
  echo "Couldn't find node on your PATH. Install Node.js first, then re-run this script."
  exit 1
fi

# Escape values before dropping them into XML — a path containing &, <, >,
# or a quote (e.g. ~/Projects/R&D/DorianOS) would otherwise produce a
# malformed plist that launchctl refuses to load.
xml_escape() {
  local s="$1"
  # Bash 5.2+ treats a bare & in the replacement as a backreference to the
  # match (like sed) — must escape it as \& to get a literal ampersand.
  s="${s//&/\&amp;}"
  s="${s//</\&lt;}"
  s="${s//>/\&gt;}"
  s="${s//\"/\&quot;}"
  s="${s//\'/\&apos;}"
  printf '%s' "$s"
}
NODE_PATH_XML="$(xml_escape "$NODE_PATH")"
SCRIPT_DIR_XML="$(xml_escape "$SCRIPT_DIR")"

if [ "${1:-}" != "" ]; then
  API_KEY="$1"
else
  echo "Paste your Anthropic API key (input is hidden, not saved to shell history):"
  read -r -s API_KEY
  echo
fi

if [ -z "$API_KEY" ]; then
  echo "No key entered — aborting."
  exit 1
fi

# Store the key in a file only your user account can read.
umask 077
printf 'ANTHROPIC_API_KEY=%s\n' "$API_KEY" > "$SECRETS_FILE"
chmod 600 "$SECRETS_FILE"
echo "✓ Saved key to $SECRETS_FILE (permissions locked to your user only)"

# Unload any previous version of this LaunchAgent so re-running is safe.
if [ -f "$PLIST_PATH" ]; then
  launchctl unload -w "$PLIST_PATH" 2>/dev/null || true
fi

mkdir -p "$(dirname "$PLIST_PATH")"
cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_PATH_XML}</string>
    <string>${SCRIPT_DIR_XML}/bridge-supervisor.js</string>
  </array>
  <key>WorkingDirectory</key><string>${SCRIPT_DIR_XML}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${SCRIPT_DIR_XML}/.bridge-supervisor.log</string>
  <key>StandardErrorPath</key><string>${SCRIPT_DIR_XML}/.bridge-supervisor.log</string>
</dict>
</plist>
PLIST
echo "✓ Wrote LaunchAgent to $PLIST_PATH (no key stored in this file — it reads $SECRETS_FILE)"

launchctl load -w "$PLIST_PATH"
echo "✓ Loaded — the supervisor will now start automatically every login"

sleep 1
if curl -s -m 3 http://127.0.0.1:3130/status > /dev/null 2>&1; then
  echo "✓ Supervisor is up at http://localhost:3130"
else
  echo "⚠ Supervisor didn't respond yet — check ${SCRIPT_DIR}/.bridge-supervisor.log"
fi

echo
echo "Done. Open the dashboard's Tasks tab — Start/Stop Bridge should work now,"
echo "with nothing left to run by hand, even after a restart."
