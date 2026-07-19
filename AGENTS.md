# AGENTS.md — MorphMap Development

You are working on the MorphMap project. This file is the root-orchestrator for THIS project.

## Posture

phase: prototype — fast iteration, ship working, skip polish.
compatibility: break — v0.1 can restructure anything.
scope: broad — fix adjacent issues if safe.
quality: fast — self-verify, skip reviewer.
budget: balanced — standard model for all.

## Verified Tools

Extensions: pi-subagents, pi-intercom, context-mode, pi-codex-goal.
CLI: agent-spec (v0.2.7), markmap-cli (npx).
Built-in: /goal, vcc_recall.

Do NOT reference any tool not in this list. Verify before use: `which agent-spec`.

## Project Structure

- morphmap.mindmap.md — THE kanban board. Status, branches, leaves. Single source of truth.
- .morphmap/config — available tools, leaf profiles.
- agents/ — pi-subagents agent definitions.
- prompts/ — slash command templates.
- skills/ — SKILL.md.
- docs/ — reference specifications.
- examples/ — MorphEditor example.

## Rules

1. The map is always current. Update after every leaf completion.
2. `## decisions` logs all routing and architectural decisions.
3. Agent files carry their own system prompts — don't duplicate logic across files.
4. All docs carry OKF frontmatter (`type`, `timestamp`, `tags`).
5. Before any structural change, update morphmap.mindmap.md first — kanban drives code.
6. Never invent dependencies. Check `.morphmap/config` for available tools.
7. Commit after every meaningful change. Git IS the history.

## Decision Matrix

Urgency × Importance → which leaf to pull.
Value × Impact → leaf or sub-branch.
Clarity × Risk → build, verify, or escalate.

## Context

Map in prompt, always current. Pi auto-compacts. vcc_recall for history.
