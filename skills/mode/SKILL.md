---
name: morphmap-mode
description: Switch agent mode (research/brainstorm/plan/implement/review). Validates transition legality and updates AGENTS.md.
user-invocable: true
argument-hint: "<research|brainstorm|plan|implement|review>"
---

# MorphMap Mode

Switch the agent operating mode. Each mode restricts which tools the agent can use.

## Modes

| Mode | Purpose | Writes? | Bash? | Delegate? |
|------|---------|---------|-------|-----------|
| research 🔍 | Investigate codebase, search docs, gather facts | no | yes(read-only) | no |
| brainstorm 💡 | Generate ideas, explore options, note-taking | yes(notes) | yes(read-only) | no |
| plan 📋 | Write specs, design architecture, roadmap | yes(specs) | no | no |
| implement 🔨 | Build, commit, test, delegate | yes | yes | yes |
| review 👁️ | Audit, critique, verify — read-only | no | no | subagent(read-only) |

## Transition Rules

The mode transition matrix defines which mode switches are legal:

```
research → research, brainstorm
brainstorm → research, brainstorm, plan
plan → research, brainstorm, plan, implement, review
implement → all
review → research, brainstorm, review
```

Illegal transitions (e.g., research → implement) require an intermediate step (research → brainstorm → plan → implement) or explicit human override.

## Usage

```
/mode research     # switch to research mode
/mode brainstorm   # switch to brainstorm mode
/mode plan         # switch to plan mode
/mode implement    # switch to full implementation mode
/mode review       # switch to review mode
```

The agent will:
1. Read current mode from AGENTS.md
2. Validate the transition legality
3. Update AGENTS.md `mode:` frontmatter
4. Log the switch to ## decisions
5. Commit with jj
