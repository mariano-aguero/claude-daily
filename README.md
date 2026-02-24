# 🗓️ claude-daily

> Automate your daily standup from Claude Code. Generates reports from git history, PRs, and a persistent work log — just type `/daily`.

[![Install with skills CLI](https://img.shields.io/badge/npx%20skills%20add-claude--daily-blue)](https://skills.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Install

### Via skills CLI (recommended)

```bash
npx skills add mariano-aguero/claude-daily
```

### Via Claude Code plugin marketplace

```
/plugin marketplace add mariano-aguero/claude-daily
```

### Manual install

```bash
git clone https://github.com/mariano-aguero/claude-daily.git
cd claude-daily
chmod +x install.sh
./install.sh
```

## Commands

| Command | What it does |
|---------|-------------|
| `/daily` | Generates your daily standup from git + PRs + work log |
| `/log <msg>` | Logs a manual entry (meetings, decisions, blockers) |
| `/log-auto` | Auto-summarizes your current session from git |
| `/log-clear` | Archives the log and starts fresh |

## How it works

```
 During the day                          Next morning
 ──────────────                          ──────────────
 Work normally with Claude Code    →     /daily
 /log "met with design team"             └─► Standup report ready
 /log "[BLOCKER] waiting on staging"
 /log-auto (before closing)
```

`/daily` cross-references multiple sources automatically:

- **Git log** → commits from the last 2 days
- **Branches** → what you're currently working on
- **GitHub PRs** → open, merged, waiting for review (requires `gh` CLI)
- **Work log** → manual entries with blockers and plans

### Example output

```
## Daily Standup - Monday 24/02/2026

### ✅ Yesterday (what I did)
- Refactored the auth module (3 commits)
- Merged PR #142: fix rate limiting on API

### 🔨 Today (what I'll do)
- Continue Stripe integration (branch: feat/stripe-checkout)
- PR #145 waiting for review

### 🚧 Blockers
- Waiting for access to staging environment
```

## Work log tags

Use tags in `/log` entries for smart categorization:

```
/log [BLOCKER] waiting for prod access     → appears in Blockers
/log [TODAY] start Stripe integration      → prioritized in Today
/log [HOY] empezar integración con Stripe  → same as TODAY (Spanish)
```

## Persistence

The work log lives at `~/.daily-worklog/current.md` and survives between Claude Code sessions.

```
~/.daily-worklog/
├── current.md          ← active log
└── archive/
    ├── 2026-02-20.md
    └── 2026-02-17.md
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)
- Git
- (Optional) [GitHub CLI](https://cli.github.com/) for PR info

## Compatibility

This skill follows the [Agent Skills](https://agentskills.io) open standard and works with:

- Claude Code
- GitHub Copilot
- Cursor
- Codex CLI
- Any agent supporting the SKILL.md format

## License

MIT
