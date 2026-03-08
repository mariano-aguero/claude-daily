# 🗓️ claude-daily

> Automate your daily standup from Claude Code. Generates reports from git history, PRs, and a persistent work log — just type `/daily`.

[![CI](https://github.com/mariano-aguero/claude-daily/actions/workflows/ci.yml/badge.svg)](https://github.com/mariano-aguero/claude-daily/actions/workflows/ci.yml)
[![Install with skills CLI](https://img.shields.io/badge/npx%20skills%20add-claude--daily-blue)](https://skills.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Install

### Via install script (recommended — enables auto-logging)

```bash
git clone https://github.com/mariano-aguero/claude-daily.git
cd claude-daily
chmod +x install.sh
./install.sh
```

This installs the skill **and** registers background hooks that auto-log your sessions without any manual action.

### Via skills CLI (skill only — no auto-logging hooks)

```bash
npx skills add mariano-aguero/claude-daily
```

> **Note:** The skills CLI installs only the commands. Auto-logging requires the hooks from `install.sh`.

## Commands

| Command | What it does |
|---------|-------------|
| `/daily` | Generates your daily standup from git + PRs + work log |
| `/log <msg>` | Logs a manual entry (meetings, decisions, blockers) |
| `/log-auto` | Summarizes your current session from git |
| `/log-week` | Generates a weekly review for retrospectives or syncs |
| `/log-clear` | Archives the log and starts fresh |

## Daily cheatsheet

### Typical flow

```
Morning        →  /daily              ← report of previous day's work
During the day →  /log "message"      ← meetings, decisions, blockers
On close       →  /log-auto           ← auto-summarize session from git
Monday         →  /log-clear          ← start the week fresh
```

### Tags for `/log`

```bash
/log "design team sync"
/log "[BLOCKER] waiting for staging access"   # → Blockers section
/log "[TODAY] start Stripe integration"       # → Today section
```

### What runs automatically

- **On every session close** → writes an `[AUTO-STOP]` entry to the worklog
- **On every session start** → injects the worklog into Claude's context

> Requires installation via `install.sh`. Hooks are not installed by `npx skills add`.

---

## How it works

```
 During the day                          Next morning
 ──────────────                          ──────────────
 Work normally with Claude Code    →     /daily
 Sessions auto-logged on close           └─► Standup report ready
 /log "met with design team"
 /log "[BLOCKER] waiting on staging"
```

`/daily` cross-references multiple sources automatically:

- **Git log** → commits since last working day (Friday-aware on Mondays)
- **Branches** → what you're currently working on
- **GitHub PRs** → open, merged, waiting for review (requires `gh` CLI)
- **Work log** → manual entries and auto-logged session summaries

### Example output

```
## Daily Standup - Monday 09/03/2026

### ✅ Yesterday (what I did)
- Refactored the auth module (3 commits)
- Merged PR #142: fix rate limiting on API

### 🔨 Today (what I'll do)
- Continue Stripe integration (branch: feat/stripe-checkout)
- PR #145 waiting for review

### 🚧 Blockers
- Waiting for access to staging environment
```

## Background hooks (installed by `install.sh`)

| Hook | Trigger | What it does |
|------|---------|-------------|
| `save-session-notes.js` | Every session end | Auto-logs `[AUTO-STOP]` entry to work log |
| `worklog-context.js` | Every session start | Injects recent work log into Claude's context |

These run automatically — you don't need to do anything.

## Work log tags

```
/log [BLOCKER] waiting for prod access     → appears in Blockers
/log [TODAY] start Stripe integration      → prioritized in Today
/log [HOY] empezar integración con Stripe  → same as TODAY (Spanish)
```

Auto-generated (you don't write these):

```
[AUTO-STOP]   → written by the session stop hook on every close
[AUTO]        → written by /log-auto when you run it manually
```

## Persistence

```
~/.daily-worklog/
├── current.md              ← active log (last 3 days)
└── archive/
    ├── 2026-03-08-09-30.md ← from /log-clear (timestamped)
    └── 2026-03-05.md       ← from auto-archival via /log
```

Entries older than 3 days are automatically archived when you run `/log`. The window is configurable via `WORKLOG_DAYS`.

## Configuration

Both hooks are configurable via environment variables in `~/.claude/settings.json`:

```json
{
  "env": {
    "WORKLOG_DAYS": "5",
    "WORKLOG_ENTRIES": "10"
  }
}
```

| Variable | Default | Effect |
|----------|---------|--------|
| `WORKLOG_DAYS` | `3` | Days of history injected at session start and shown in session notes |
| `WORKLOG_ENTRIES` | `5` | Max entries injected into context at session start |

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)
- Node.js 18+
- Git
- Python 3.12+
- (Optional) [GitHub CLI](https://cli.github.com/) for PR info

## Limitations

- **Single repo per `/daily` run** — git history is read from the current repository only. Use `/log` to manually record cross-repo work.
- **Hook auto-logging requires `install.sh`** — `npx skills add` gives you the commands but not the background auto-logging.

## Compatibility

This skill follows the [Agent Skills](https://agentskills.io) open standard and works with Claude Code, GitHub Copilot, Cursor, Codex CLI, and any agent supporting the SKILL.md format.

## License

MIT
