#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
WORKLOG_DIR="$HOME/.daily-worklog"

echo "🗓️  Installing claude-daily..."
echo ""

# Copy skill to Claude Code skills directory
mkdir -p "$SKILLS_DIR"
cp -r "$SCRIPT_DIR/daily-standup" "$SKILLS_DIR/daily-standup"

echo "✅ Skill installed at $SKILLS_DIR/daily-standup"

# Initialize work log
mkdir -p "$WORKLOG_DIR/archive"
touch "$WORKLOG_DIR/current.md"

echo "✅ Work log initialized at $WORKLOG_DIR/current.md"
echo ""
echo "🎉 Done! Open Claude Code and try:"
echo "   /daily       → Generate your daily standup"
echo "   /log <msg>   → Log something manually"
echo "   /log-auto    → Auto-log your session"
echo "   /log-clear   → Archive and start fresh"
