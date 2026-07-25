---
description: "MorphMap Mode — switch agent mode (research/brainstorm/plan/implement/review). Validates transition legality via mech modeGate."
thinking: medium
skill: morphmap-mode
restore: true
---

## Task

Switch the agent mode to the specified target. Validate the transition against the mode transition matrix. Update AGENTS.md frontmatter with the new mode.

Current mode: read from AGENTS.md `mode:` frontmatter field.
Target mode: $@

### Mode transition rules

| From | Allowed targets |
|------|----------------|
| research | research, brainstorm |
| brainstorm | research, brainstorm, plan |
| plan | research, brainstorm, plan, implement, review |
| implement | all modes |
| review | research, brainstorm, review |

### Mode tool policies

| Mode | Allowed | Blocked |
|------|---------|---------|
| research 🔍 | read, bash, search, mcp, vcc_recall, ctx_*, interview | write, edit, subagent, workflow, intercom, browser, generate_* |
| brainstorm 💡 | research + write | edit, bash(unsafe), subagent, workflow, intercom |
| plan 📋 | brainstorm + edit | bash(unsafe), subagent, workflow, intercom |
| implement 🔨 | all tools | none |
| review 👁️ | read, search, mcp, vcc_recall, ctx_*, interview, subagent(read-only) | write, edit, bash, workflow, intercom |

### Steps

1. Parse target mode from $@ (must be one of: research, brainstorm, plan, implement, review)
2. Read current mode from AGENTS.md `mode:` frontmatter
3. Validate transition legality via MODE_TRANSITION matrix
4. If illegal → state what's allowed, suggest intermediate steps. Stop.
5. If legal → update AGENTS.md `mode:` field
6. Notify user of the mode switch + tool policy summary
7. Log to ## decisions: `- [mode] switched from <old> to <new> · reason: <from input or 'user requested'>`
8. Commit with `jj commit -m 'mode: switch to <new>'`
