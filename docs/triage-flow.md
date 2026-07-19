---
type: specification
topic: triage-flow
timestamp: 2026-07-19
tags: [triage, intake, classification, routing, scope-matching]
---

# Triage Flow

## Intake Sources

| Source | Trigger | Input format |
|--------|---------|-------------|
| Human | `/mindmap-amend "add rate limiting"` | Free text |
| GitHub issue | Webhook or `/mindmap-triage` | Issue title + body |
| GitHub PR | Webhook or `/mindmap-triage` | PR title + description |
| Email | CRON or `/mindmap-triage` | Subject + body |
| Chat | CRON or `/mindmap-triage` | Message text |

## Classification

Root Orchestrator classifies against branch `scope:` declarations.

### Step 1: Extract scope from mindmap

Parse `.mindmap.md` for all `##` branch headers with `scope:`:
```
## auth 🔄 — scope: authentication, login, OAuth, JWT, sessions, password reset
## editor-core ✅ — scope: typing, cursor, selection, block model, rendering
## theming ⬜ — scope: themes, colors, dark mode, light mode, CSS, syntax highlight
```

### Step 2: Search for match

```
ctx_search("<incoming task text>")
  → search against indexed .mindmap.md
  → returns top match with confidence score
```

### Step 3: Route or flag

```
confidence >0.8 → auto-route to matching branch
  intercom(branch, { type: "new:leaf", leaf: "<summary>", source: "GitHub #132" })
  log: "2026-07-19: routed #132 to auth/jwt [confidence: 0.91]"

confidence 0.5-0.8 → route with lower confidence
  intercom(branch, { type: "new:leaf", ..., confidence: 0.7 })
  branch agent validates match, accepts or rejects

confidence <0.5 → flag for human
  log: "2026-07-19: 'PDF export broken' — no matching branch [best: editor-core 0.42]"
  flag for /mindmap-review
```

## Scope Declaration Format

```
## <branch-name> <status> — scope: <comma-separated keywords> · <KPIs>
```

Keywords should cover:
- Domain terms (login, JWT, OAuth)
- File paths (src/auth/, packages/auth/)
- User-facing terms (sign in, register, forgot password)
- Error messages commonly associated

## PR Linkage

If PR description mentions existing leaf:
```
"Fixes login endpoint spec issue" → match leaf "- ⬜ login endpoint → specs/auth/login.spec"
→ no new leaf. Update status: "- 🔄 login endpoint → specs/auth/login.spec [source: GitHub #47]"
→ intercom(branch, { type: "leaf:pr", leaf: "login endpoint", pr: "#47" })
```

## Decision Log

All routing decisions logged to `## decisions`:

```markdown
## decisions ⬜ — log, not work
- 2026-07-19 14:32: routed GitHub #132 "Login 500 on + email" to auth/jwt [confidence: 0.91]
- 2026-07-19 14:35: GitHub PR #47 linked to auth/login-endpoint [exact match]
- 2026-07-19 14:40: "PDF export broken" — no match, flagged for human review [best: editor-core 0.42]
- 2026-07-19 14:45: human created new branch "export" via /mindmap-amend
```

## Triggers

| Trigger | v1 | v2 |
|---------|----|----|
| Human addition | `/mindmap-amend` (manual) | Same |
| GitHub issue | `/mindmap-triage` (manual or CRON) | Webhook auto |
| GitHub PR | `/mindmap-triage` (manual or CRON) | Webhook auto |
| Email | `/mindmap-triage` (manual) | IMAP/API polling |
| Chat | `/mindmap-triage` (manual) | Bot integration |
