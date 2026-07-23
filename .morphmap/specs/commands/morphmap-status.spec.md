spec: task
name: "morphmap-status"
inherits: project
tags: [commands, status, e2e]
---

## Intent

Implement the `/morphmap-status` command skill (SKILL.md is missing) and e2e test it. The skill reads `.morphmap/morphmap.mindmap.md` branch headers only (~15 lines), outputs a text summary with branches, status, ETA, budget, blocker count. No markmap render. Cheap, thinking off.

## Decisions

- Status reads only `##` branch headers (not leaf details)
- Output format: text summary with branch name, status emoji, leaf counts
- No HTML render — text only
- Cheap model (deepseek-v4-flash, thinking off) per prompt config
- Report includes: branch count, done/pending/blocked counts, blocker list

## Boundaries

### Allowed Changes
- `skills/status/SKILL.md` (CREATE — file is missing)
- `prompts/morphmap-status.md` (update if needed)
- `.morphmap/specs/commands/morphmap-status.spec.md` (this file)

### Forbidden
- Do NOT modify the mindmap markdown
- Do NOT modify other skill files
- Do NOT modify agent definitions

## Completion Criteria

Scenario: Status skill file exists
  Test:
    Package: morphmap-status
    Filter: skill_exists
  Given the status skill directory exists
  When status is implemented
  Then `skills/status/SKILL.md` exists with OKF frontmatter and Phase structure

Scenario: Status outputs text summary
  Test:
    Package: morphmap-status
    Filter: text_summary
  Given the mindmap has multiple branches
  When status runs
  Then output is text (not HTML) with branch names and status markers

Scenario: Status includes blocker count
  Test:
    Package: morphmap-status
    Filter: blocker_count
  Given the mindmap has 🔴 blocked branches
  When status runs
  Then output includes blocker count and list

Scenario: Status includes done/pending counts
  Test:
    Package: morphmap-status
    Filter: counts
  Given the mindmap has ✅ done and ⬜ pending branches
  When status runs
  Then output includes done/pending counts

Scenario: Status does not render HTML
  Test:
    Package: morphmap-status
    Filter: no_html
  Given status runs
  When output is generated
  Then no HTML file is created (text only)

## Out of Scope

- Adding HTML rendering to status
- Reading leaf details (branch headers only)
