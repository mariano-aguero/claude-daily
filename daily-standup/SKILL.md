---
name: daily-standup
description: >-
  Generate daily standup reports from git history, PRs, and a persistent work log.
  Use when the user says "daily", "standup", "what did I do yesterday",
  "generate my daily", "daily sync", or asks for a summary of recent work.
license: MIT
metadata:
  author: mariano-aguero
  version: "1.0"
---

# Daily Standup Generator

Generate daily standup reports automatically by cross-referencing git activity, GitHub PRs, and a persistent work log.

## Commands

This skill provides four slash commands:

- `/daily` — Generate the full daily standup report
- `/log <message>` — Manually log a work entry
- `/log-auto` — Auto-log a summary of the current session from git
- `/log-clear` — Archive the current log and start fresh

## How `/daily` Works

When the user asks for their daily, execute these steps:

### Step 1: Gather Data

Run these commands one by one and collect the output:

```bash
date "+%A %d/%m/%Y"
git branch --show-current
git status --short
git log --since="2 days ago" --format="%h %s (%ar)" --no-merges
```

If GitHub CLI is available, also run:

```bash
gh pr list --author="@me" --state=all --limit=10
```

Check for the persistent work log:

```bash
cat ~/.daily-worklog/current.md
```

If any command fails, skip it and continue with available data.

### Step 2: Generate Report

Using all gathered data, produce a report in this format:

```
## Daily Standup - [today's date]

### ✅ Yesterday (what I did)
- [summarize commits, merged PRs, completed tasks from work log]

### 🔨 Today (what I'll do)
- [based on: in-progress branches, open PRs, pending work log items]

### 🚧 Blockers
- [items marked [BLOCKER] in work log, or PRs waiting for review]
```

### Rules

1. Be concise. One line per item.
2. Group related commits into a single item.
3. If no blockers exist, write "No blockers".
4. Items tagged `[BLOCKER]` in the work log always appear in Blockers.
5. Items tagged `[HOY]` / `[TODAY]` are prioritized in the Today section.
6. Use professional but direct language.

## How `/log` Works

When the user runs `/log <message>`:

1. Run `mkdir -p ~/.daily-worklog`
2. Get current time with `date "+%H:%M"`
3. Append to `~/.daily-worklog/current.md`:
   ```
   - [HH:MM] <message>
   ```
4. Confirm what was logged and show entry count.

Supported tags: `[BLOCKER]`, `[HOY]`, `[TODAY]`

## How `/log-auto` Works

When the user runs `/log-auto`:

1. Run `git log --since="1 hour ago" --format="- %s" --no-merges`
2. Run `git diff --name-only HEAD~3`
3. Run `git branch --show-current`
4. Generate a 1-3 line summary of the session
5. Append to `~/.daily-worklog/current.md`:
   ```
   - [HH:MM] [AUTO] <concise session summary>
   ```

## How `/log-clear` Works

When the user runs `/log-clear`:

1. Show current log contents
2. Move to `~/.daily-worklog/archive/YYYY-MM-DD.md`
3. Create empty `~/.daily-worklog/current.md`
4. Confirm archival with entry count.

## Work Log Persistence

The work log is stored at `~/.daily-worklog/current.md` and persists across sessions.

```
~/.daily-worklog/
├── current.md          ← active log
└── archive/
    ├── 2026-02-20.md   ← archived logs
    └── 2026-02-17.md
```

Entries older than 3 days should be automatically archived when `/log` is used.

## Tips for Best Results

- You don't need to log everything manually — `/daily` reads git history automatically
- Use `/log` for things that don't show up in git: meetings, decisions, blockers
- Run `/log-auto` before closing your session to capture what you did
- Run `/log-clear` on Monday mornings to start the week fresh
