# MorphMap

![MorphMap](cover.png)

AI-native project management for [pi](https://github.com/earendil-works/pi-coding-agent). Mindmap-based, agent-delegated, contract-verified.

**Describe what you want. Agents plan the tree. Branch agents pull leaves, build, verify, report.**

## Install

```bash
pi install https://github.com/yagaltd/morphmap
```

Requires:
- [pi-subagents](https://github.com/nicobailon/pi-subagents) >= 0.17.2
- [pi-prompt-template-model](https://github.com/nicobailon/pi-prompt-template-model) >= 0.9.2
- [pi-intercom](https://github.com/nicobailon/pi-intercom) (branch communication)
- [context-mode](https://github.com/mksglu/context-mode) (triage classification, knowledge indexing)
- [agent-spec](https://github.com/yagaltd/agent-spec) (CLI, contract verification)

Optional:
- [tdd-guard](https://github.com/yagaltd/tdd-guard) (test quality enforcement)
- [evalt](https://github.com/evalt) (agent regression testing)

Required for rendering:
- [Node.js](https://nodejs.org) (markmap-cli via npx)

## Quick Start

```
/morphmap-plan "Add auth module"
  → scout → decompose → propose tree → you approve

/morphmap-delegate
  → spawns branch agents → pull leaves → build → verify → report

/morphmap
  → renders interactive mindmap with status colors

/morphmap-review
  → triage blockers, review status
```

## How It Works

```
PUSH (planning)                    PULL (execution)
─────────────────                  ─────────────────
Directive                          Branch agents pull
  ↓                                leaves in risk-priority
Root Orchestrator                    order. Build against
  ↓                                .spec contracts.
Tree (morphmap.mindmap.md)           Self-verify. Report.
  ↓                                 Kanban signals via
Human approves                       intercom.
```

**Push/Pull system inspired by Toyota's production method and the Theory of Constraints.**

- Root mindmap = git main branch
- Branches = modules (auth, editor, deployment)
- Leaves = atomic tasks → `.spec` files (agent-spec contracts)
- Status visible at a glance: ⬜ 🔄 ✅ ❌ 🔴
- Cross-branch dependencies: `[needs: branch/leaf]`
- Risk-priority pull: 🔴 BLOCKING → 🟡 RISKY → 🔵 TIME → ⚪ STANDARD
- Bottleneck detection, ETA tracking, budget tracking

## Commands

| Command | Purpose |
|---------|---------|
| `/morphmap-init` | Scaffold new MorphMap project |
| `/morphmap-plan <directive>` | Push phase: scout → tree → approve |
| `/morphmap-delegate [branch]` | Pull phase: spawn branch agents |
| `/morphmap-review [branch]` | Triage blockers, review status |
| `/morphmap-amend <addition>` | Add work to existing branch |
| `/morphmap-triage` | Classify external input (GitHub, email) |
| `/morphmap-improve` | PDSA Study loop: learn from patterns |
| `/morphmap` | Render interactive mindmap |
| `/morphmap-status` | Text summary |

## Agent Architecture

| Agent | Role | Model |
|-------|------|-------|
| Root Orchestrator | Architect — intent, delegation, synthesis | pro/medium (AGENTS.md loaded) |
| Branch Agent | Tech Lead — owns module, pulls leaves, spawns workers | Configured via settings.json |
| Leaf Worker | Developer — implements .spec | Assigned per bottleneck tag |
| Reviewer | QA — mechanical (agent-spec + tdd-guard) or integration | Assigned per mode |
| Scout | Recon — codebase mapping, MorphMap-aware | Thinking: low |
| Researcher | Web research — bash+curl, MorphMap-aware | Thinking: medium |

All agents are MorphMap-owned (zero dependency on pi-subagents builtins).

## Format

`.mindmap.md` — markmap-compatible markdown. `#` root, `##` branches, `###` sub-branches, `-` bullet leaves. YAML frontmatter for posture, rendering config. Render with `npx markmap-cli`.

Render with `npx markmap-cli`.

## Project Structure

```
.pi/agents/                ← pi-subagents agent definitions (5 agents)
prompts/                   ← slash command templates (9 commands)
skills/                    ← skill definitions (8 skills)
package.json               ← pi package manifest
CHANGELOG.md               ← version history
```

## License

MIT
