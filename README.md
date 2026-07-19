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
| `/morphmap-plan <directive>` | Push phase: scout → tree → approve |
| `/morphmap-delegate [branch]` | Pull phase: spawn branch agents |
| `/morphmap-review [branch]` | Triage blockers, review status |
| `/morphmap-amend <addition>` | Add work to existing branch |
| `/morphmap-triage` | Classify external input (GitHub, email) |
| `/morphmap` | Render interactive mindmap |
| `/morphmap-status` | Text summary |

## Agent Architecture

| Agent | Role | Model |
|-------|------|-------|
| Root Orchestrator | Architect — structure, routing, triage | Strong, high thinking |
| Branch Agent | Tech Lead — owns module, pulls leaves | Strong, high thinking |
| Leaf Worker | Developer — implements .spec | Assigned per bottleneck tag |

Agents use three decision matrices:
- **Urgency × Importance** (Eisenhower) — which leaf to pull
- **Value × Impact** — leaf or sub-branch?
- **Clarity × Risk** — build, verify, or escalate?

All decisions logged. Status always current. Context managed by pi auto-compaction.

## Format

`.mindmap.md` — markmap-compatible markdown. `#` root, `##` branches, `###` sub-branches, `-` bullet leaves. YAML frontmatter for posture, rendering config. Render with `npx markmap-cli`.

Render with `npx markmap-cli`.

## Project Structure

```
agents/                    ← pi-subagents agent definitions
prompts/                   ← slash command templates
skills/                    ← skill definitions
package.json               ← pi package manifest
```

## License

MIT
