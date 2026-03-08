#!/usr/bin/env bash
set -e

export HOOKS_DIR="$HOME/.claude/hooks/daily-standup"
export SETTINGS="$HOME/.claude/settings.json"

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required to deregister hooks. Install it and re-run uninstall."; exit 1; }

echo "🗑️  Uninstalling claude-daily..."

# 1. Remove skill
if [ -d "$HOME/.claude/skills/daily-standup" ]; then
  rm -rf "$HOME/.claude/skills/daily-standup"
  echo "✅ Skill removed"
else
  echo "ℹ️  Skill not found, skipping"
fi

# 2. Remove hooks
if [ -d "$HOOKS_DIR" ]; then
  rm -rf "$HOOKS_DIR"
  echo "✅ Hooks removed"
else
  echo "ℹ️  Hooks not found, skipping"
fi

# 3. Unregister hooks from settings.json
if [ -f "$SETTINGS" ]; then
  node << 'NODEJS'
const fs = require('fs');

const settingsPath = process.env.SETTINGS;
const hooksDir = process.env.HOOKS_DIR;

let settings = {};
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
} catch (err) {
  process.stderr.write('❌ Could not parse settings.json: ' + err.message + '\n');
  process.stderr.write('   Fix or delete the file, then re-run uninstall to remove hook registrations.\n');
  process.exit(1);
}

const stopCmd = `node "${hooksDir}/save-session-notes.js"`;
const startCmd = `node "${hooksDir}/worklog-context.js"`;

function removeHook(arr, command) {
  return arr
    .map(entry => ({
      ...entry,
      hooks: (entry.hooks || []).filter(h => h.command !== command),
    }))
    .filter(entry => (entry.hooks || []).length > 0);
}

if (settings.hooks) {
  if (settings.hooks.Stop) settings.hooks.Stop = removeHook(settings.hooks.Stop, stopCmd);
  if (settings.hooks.SessionStart) settings.hooks.SessionStart = removeHook(settings.hooks.SessionStart, startCmd);
  // Clean up empty arrays and the hooks key itself if no hooks remain
  if (!settings.hooks.Stop?.length) delete settings.hooks.Stop;
  if (!settings.hooks.SessionStart?.length) delete settings.hooks.SessionStart;
  if (!Object.keys(settings.hooks).length) delete settings.hooks;
}

const tmpSettings = settingsPath + '.tmp';
fs.writeFileSync(tmpSettings, JSON.stringify(settings, null, 2));
fs.renameSync(tmpSettings, settingsPath);
console.log('✅ Hook registrations removed from settings.json');
NODEJS
fi

echo ""
echo "Note: Work log at ~/.daily-worklog/ was NOT deleted."
echo "      Remove it manually if you want: rm -rf ~/.daily-worklog"
