#!/usr/bin/env node
/**
 * SessionStart hook — injects recent work log entries into Claude's context.
 * Part of claude-daily: https://github.com/mariano-aguero/claude-daily
 *
 * Reads recent entries from ~/.daily-worklog/current.md and outputs them as a
 * <daily-worklog> block at session start.
 *
 * Configurable via environment variables:
 *   WORKLOG_ENTRIES  Max entries to inject (default: 5, minimum: 1; 0 is treated as 1)
 *   WORKLOG_DAYS     Window in days for dated entries (default: 3)
 *
 * Installed to: ~/.claude/hooks/daily-standup/worklog-context.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const worklogPath = path.join(os.homedir(), ".daily-worklog", "current.md");
const parsed = parseInt(process.env.WORKLOG_ENTRIES ?? "5", 10);
const maxEntries = Math.max(1, Number.isNaN(parsed) ? 5 : parsed);
const parsedDays = parseInt(process.env.WORKLOG_DAYS ?? "3", 10);
const daysWindow = Number.isNaN(parsedDays) ? 3 : Math.max(1, parsedDays);
// Use local time to match the local-time dates written by save-session-notes.js
const cutoffDay = new Date(Date.now() - daysWindow * 86400000);
const cutoffDate = `${cutoffDay.getFullYear()}-${String(cutoffDay.getMonth() + 1).padStart(2, "0")}-${String(cutoffDay.getDate()).padStart(2, "0")}`;

try {
  const entries = fs
    .readFileSync(worklogPath, "utf-8")
    .split("\n")
    .filter((l) => {
      if (!l.trim() || l.includes("[COMPACT]")) return false;
      // For dated entries, exclude those older than the configured window
      const m = l.match(/^- \[(\d{4}-\d{2}-\d{2})/);
      return !m || m[1] >= cutoffDate;
    })
    .slice(-maxEntries);

  if (entries.length) {
    process.stdout.write(`<daily-worklog>\n${entries.join("\n")}\n</daily-worklog>\n`);
  }
} catch (err) {
  if (err.code !== "ENOENT") throw err;
  // Worklog doesn't exist yet, nothing to inject
}
