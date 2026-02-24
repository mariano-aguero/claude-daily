#!/bin/bash
set -e

echo "🗑️  Uninstalling claude-daily..."

rm -rf "$HOME/.claude/skills/daily-standup"

echo "✅ Skill removed"
echo ""
echo "Note: Work log at ~/.daily-worklog/ was NOT deleted."
echo "      Remove it manually if you want: rm -rf ~/.daily-worklog"
