#!/bin/bash
# Initialize the daily worklog directory structure
set -e

WORKLOG_DIR="$HOME/.daily-worklog"

mkdir -p "$WORKLOG_DIR/archive"

if [ ! -f "$WORKLOG_DIR/current.md" ]; then
    touch "$WORKLOG_DIR/current.md"
    echo "✅ Work log initialized at $WORKLOG_DIR/current.md"
else
    echo "ℹ️  Work log already exists at $WORKLOG_DIR/current.md"
fi
