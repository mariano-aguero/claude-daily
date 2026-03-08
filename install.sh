#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
export HOOKS_DIR="$HOME/.claude/hooks/daily-standup"
WORKLOG_DIR="$HOME/.daily-worklog"
export SETTINGS="$HOME/.claude/settings.json"

# Precondition checks
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 18+ is required. Install from https://nodejs.org"; exit 1; }
node -e "const v=parseInt(process.version.slice(1));if(v<18){console.error('❌ Node.js 18+ required (found '+process.version+')');process.exit(1)}"
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required."; exit 1; }
python3 -c "import sys; v=sys.version_info; exit(0 if (v.major,v.minor)>=(3,12) else 1)" 2>/dev/null \
  || { echo "❌ Python 3.12+ is required (found: $(python3 --version 2>&1))."; exit 1; }

echo "🗓️  Installing claude-daily..."
echo ""

# 1. Install skill
mkdir -p "$SKILLS_DIR"
if [ -d "$SKILLS_DIR/daily-standup" ]; then
  echo "⚠️  Existing installation found — updating..."
  echo "   Note: local customizations to SKILL.md will be overwritten."
  rm -rf "$SKILLS_DIR/daily-standup"
fi
cp -r "$SCRIPT_DIR/daily-standup" "$SKILLS_DIR/daily-standup"
echo "✅ Skill installed at $SKILLS_DIR/daily-standup"

# 2. Install hooks
mkdir -p "$HOOKS_DIR"
cp "$SCRIPT_DIR/hooks/save-session-notes.js" "$HOOKS_DIR/save-session-notes.js"
cp "$SCRIPT_DIR/hooks/worklog-context.js" "$HOOKS_DIR/worklog-context.js"
echo "✅ Hooks installed at $HOOKS_DIR"

# 3. Register hooks in ~/.claude/settings.json
node << 'NODEJS'
const fs = require('fs');
const path = require('path');

const settingsPath = process.env.SETTINGS;
const hooksDir = process.env.HOOKS_DIR;

let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.error('❌ ' + settingsPath + ' exists but contains invalid JSON.');
    console.error('   Fix or delete the file before running install.');
    process.exit(1);
  }
}

settings.hooks = settings.hooks || {};
settings.hooks.Stop = settings.hooks.Stop || [];
settings.hooks.SessionStart = settings.hooks.SessionStart || [];

function addHook(arr, command) {
  const exists = arr.some(entry =>
    (entry.hooks || []).some(h => h.command === command)
  );
  if (!exists) {
    arr.push({ hooks: [{ type: 'command', command }] });
    return true;
  }
  return false;
}

const stopCmd = `node "${hooksDir}/save-session-notes.js"`;
const startCmd = `node "${hooksDir}/worklog-context.js"`;

const addedStop = addHook(settings.hooks.Stop, stopCmd);
const addedStart = addHook(settings.hooks.SessionStart, startCmd);

fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
const tmpSettings = settingsPath + '.tmp';
fs.writeFileSync(tmpSettings, JSON.stringify(settings, null, 2));
fs.renameSync(tmpSettings, settingsPath);

if (addedStop) console.log('✅ Registered Stop hook (auto-log on session end)');
else console.log('ℹ️  Stop hook already registered');
if (addedStart) console.log('✅ Registered SessionStart hook (worklog context injection)');
else console.log('ℹ️  SessionStart hook already registered');
NODEJS

# 4. Initialize work log
mkdir -p "$WORKLOG_DIR/archive"
if [ -f "$WORKLOG_DIR/current.md" ]; then
  echo "ℹ️  Work log already exists at $WORKLOG_DIR/current.md (preserved)"
else
  touch "$WORKLOG_DIR/current.md"
  echo "✅ Work log initialized at $WORKLOG_DIR/current.md"
fi

echo ""
echo "🎉 Done! Open Claude Code and try:"
echo "   /daily       → Generate your daily standup"
echo "   /log <msg>   → Log something manually"
echo "   /log-auto    → Auto-log your session"
echo "   /log-clear   → Archive and start fresh"
echo ""
echo "   Auto-logging is now active — sessions are logged automatically on close."
