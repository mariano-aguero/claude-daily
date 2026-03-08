#!/usr/bin/env node
/**
 * Stop hook — auto-logs a session summary to the daily worklog.
 * Part of claude-daily: https://github.com/mariano-aguero/claude-daily
 *
 * What it does:
 *   - Appends an [AUTO-STOP] entry to ~/.daily-worklog/current.md on session end
 *   - Writes a session snapshot to .claude/session-notes.md (if project has .claude/)
 *
 * Limitations:
 *   - Only logs sessions in git repositories. Non-git directories are skipped
 *     because there is no branch/commit info to include in the entry.
 *
 * Installed to: ~/.claude/hooks/daily-standup/save-session-notes.js
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

let input = {};
try {
  const raw = fs.readFileSync(0, "utf-8");
  if (raw.trim()) input = JSON.parse(raw);
} catch (err) {
  if (err instanceof SyntaxError) {
    process.stderr.write(`[save-session-notes] Warning: could not parse hook input: ${err.message}\n`);
  }
  // other read errors (no stdin, etc.) are silently ignored
}

// Prevent re-entry loops
if (input.stop_hook_active) process.exit(0);

const GIT_TIMEOUT = 5000;
const home = os.homedir();
// Use git rev-parse to correctly detect repos in monorepos, worktrees, and sub-directories
// (fs.existsSync(".git") fails for any path that isn't the repo root)
const isGitRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"],
  { encoding: "utf-8", timeout: GIT_TIMEOUT }).status === 0;
const now = new Date();
// Use local time for both date and time to avoid UTC/local mismatch around midnight
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
// Match the 3-day window used by worklog-context.js for consistent context injection
const CONTEXT_DAYS = 3;
const contextCutoff = new Date(Date.now() - CONTEXT_DAYS * 86400000);
const contextCutoffDate = `${contextCutoff.getFullYear()}-${String(contextCutoff.getMonth() + 1).padStart(2, "0")}-${String(contextCutoff.getDate()).padStart(2, "0")}`;
const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
const timestamp = now.toISOString();

const branch = isGitRepo
  ? spawnSync("git", ["branch", "--show-current"], { encoding: "utf-8", timeout: GIT_TIMEOUT }).stdout?.trim() ?? ""
  : "";
const statusOut = isGitRepo
  ? spawnSync("git", ["status", "--porcelain"], { encoding: "utf-8", timeout: GIT_TIMEOUT }).stdout?.trim() ?? ""
  : "";
const allModified = statusOut.split("\n").filter(Boolean);
const recentCommits = isGitRepo
  ? (spawnSync("git", ["log", "--format=%H %s", "-5"], { encoding: "utf-8", timeout: GIT_TIMEOUT })
      .stdout?.trim() ?? "")
      .split("\n")
      .filter(Boolean)
  : [];
// Derive display format (short hash + subject) from the same data
const logOut = recentCommits
  .slice(0, 3)
  .map((l) => { const i = l.indexOf(" "); return l.slice(0, 7) + l.slice(i); })
  .join("\n");

// --- Worklog auto-entry (always runs, regardless of project .claude/ directory) ---

const worklogPath = path.join(home, ".daily-worklog", "current.md");
let worklogLines = [];

// Directory creation is a hard dependency — fail visibly if it can't be created
fs.mkdirSync(path.dirname(worklogPath), { recursive: true });

try {
  worklogLines = fs.readFileSync(worklogPath, "utf-8").split("\n").filter(Boolean);
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

// Dedup: check by commit hash (new entries) OR by branch+message (old entries without hash)
// 40-line window covers ~8 sessions/day — sufficient for practical dedup without unbounded reads
const recentWindow = worklogLines.slice(-40).join("\n");
const alreadyLoggedByHash = recentCommits.some((c) => {
  const [hash] = c.split(" ");
  return hash && recentWindow.includes(hash.slice(0, 8));
});
const firstCommitMsg = recentCommits[0]?.split(" ").slice(1).join(" ") ?? "";
const alreadyLoggedByContent =
  branch &&
  firstCommitMsg.length > 5 &&
  recentWindow.includes("[AUTO-STOP]") &&
  recentWindow.includes(branch) &&
  recentWindow.includes(firstCommitMsg.slice(0, 30));

if (!alreadyLoggedByHash && !alreadyLoggedByContent && branch) {
  const topHash = recentCommits[0]?.split(" ")[0]?.slice(0, 8) ?? "";
  const commitMessages = recentCommits
    .slice(0, 3)
    .map((c) => c.split(" ").slice(1).join(" "))
    .filter(Boolean);
  const parts = [`branch: ${branch}${topHash ? ` (${topHash})` : ""}`];
  if (commitMessages.length) parts.push(`commits: "${commitMessages.map((m) => m.replace(/"/g, "'")).join('", "')}"`);

  if (allModified.length) parts.push(`${allModified.length} file${allModified.length > 1 ? "s" : ""} modified`);
  const entry = `- [${date} ${time}] [AUTO-STOP] ${parts.join(" — ")}`;
  try {
    fs.appendFileSync(worklogPath, `${entry}\n`);
  } catch (err) {
    process.stderr.write(`[save-session-notes] Failed to write worklog: ${err.message}\n`);
  }
  // Re-read so session-notes gets the updated list
  try {
    worklogLines = fs.readFileSync(worklogPath, "utf-8").split("\n").filter(Boolean);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

// --- Session notes (only if project has .claude/ directory) ---

const claudeDir = path.join(process.cwd(), ".claude");
if (!fs.existsSync(claudeDir)) process.exit(0);

// Skip if this project has its own save-session-notes hook
const localHookPath = path.join(claudeDir, "hooks", "save-session-notes.js");
if (fs.existsSync(localHookPath)) process.exit(0);

const lastEntries = worklogLines
  .filter((l) => {
    if (!l.trim() || l.includes("[COMPACT]")) return false;
    const m = l.match(/^- \[(\d{4}-\d{2}-\d{2})/);
    return !m || m[1] >= contextCutoffDate;
  })
  .slice(-5);
const notesPath = path.join(claudeDir, "session-notes.md");

let manualSection = "";
try {
  const existing = fs.readFileSync(notesPath, "utf-8");
  const autoIdx = existing.indexOf("<!-- auto-snapshot -->");
  const raw = autoIdx !== -1 ? existing.slice(0, autoIdx).trimEnd() : existing.trimEnd();
  const taskIdx = raw.indexOf("<!-- last-task -->");
  manualSection = taskIdx !== -1 ? raw.slice(0, taskIdx).trimEnd() : raw;
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

const lastTaskBlock = lastEntries.length
  ? [
      `<!-- last-task -->`,
      `## Last task context`,
      `_Auto-captured from work log at ${timestamp}_`,
      ``,
      ...lastEntries,
    ].join("\n")
  : "";

const sections = [];
if (manualSection) sections.push(manualSection);
if (lastTaskBlock) sections.push(lastTaskBlock);

sections.push(
  [
    `<!-- auto-snapshot -->`,
    `_Last updated: ${timestamp}_`,
    ``,
    `**Branch:** ${branch || "(none)"}`,
    `**Modified files:** ${allModified.length === 0 ? "none" : allModified.length > 5 ? `${allModified.length} files` : allModified.map(l => l.slice(3)).join(", ")}`,
    `**Recent commits:**`,
    logOut ? logOut.split("\n").map((l) => `- ${l}`).join("\n") : "- (none)",
  ].join("\n")
);

try {
  const tmpPath = `${notesPath}.tmp`;
  fs.writeFileSync(tmpPath, sections.join("\n\n"), "utf-8");
  fs.renameSync(tmpPath, notesPath);
} catch (err) {
  process.stderr.write(`[save-session-notes] Failed to write session notes: ${err.message}\n`);
}
