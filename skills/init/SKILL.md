---
name: morphmap-init
description: Scaffold a new MorphMap project. Creates .morphmap/ directory with default config, blank morphmap.mindmap.md, and index.md. Run this first in any project.
user-invocable: true
argument-hint: "[project name]"
---

# MorphMap Init

Scaffold a new MorphMap project structure.

## Phase 1: Create directories

```bash
mkdir -p .morphmap/specs
```

## Phase 2: Create config

Write `.morphmap/config` with default settings:

```yaml
# MorphMap project configuration
# Human-maintained. Agents read at startup.

available:
  extensions: [pi-subagents, pi-intercom, context-mode, pi-codex-goal]
  cli: [agent-spec, markmap-cli]
  builtin: [/goal, vcc_recall]
  verified-at: <today>

# Leaf agent model assignment per bottleneck tag.
# Edit to match your available providers (deepseek, anthropic, openai, etc.)
leafProfiles:
  standard:    { model: "deepseek/deepseek-v4-flash", thinking: "low" }
  risky:       { model: "deepseek/deepseek-v4-pro",  thinking: "high" }
  blocking:    { model: "anthropic/claude-sonnet-4",  thinking: "xhigh" }
  time:        { model: "deepseek/deepseek-v4-flash", thinking: "medium" }
  verify:      { model: "deepseek/deepseek-v4-pro",  thinking: "high" }

specsDirectory: .morphmap/specs/
```

## Phase 2b: Agent overrides (optional)

MorphMap has five subagent definitions: `morphmap/branch-agent`, `morphmap/leaf-worker`, `morphmap/reviewer`, `morphmap/scout`, `morphmap/researcher`.
They are discovered by pi-subagents alongside builtins (scout, worker, reviewer, oracle, etc.).
The main session IS the Root Orchestrator — AGENTS.md provides its instructions. No subagent needed.

To override model/thinking per agent, add to `~/.pi/agent/settings.json`:

```json
{
  "subagents": {
    "agentOverrides": {
      "morphmap/branch-agent": {
        "model": "deepseek/deepseek-v4-flash",
        "thinking": "high"
      },
      "morphmap/leaf-worker": {
        "model": "deepseek/deepseek-v4-flash",
        "thinking": "low"
      },
      "morphmap/reviewer": {
        "model": "deepseek/deepseek-v4-flash",
        "thinking": "low"
      },
      "morphmap/scout": {
        "model": "deepseek/deepseek-v4-flash",
        "thinking": "low"
      },
      "morphmap/researcher": {
        "model": "deepseek/deepseek-v4-flash",
        "thinking": "medium"
      }
    }
  }
}
```

Or per-project in `.pi/settings.json` (project scope wins over user scope).

**Provider examples:**

DeepSeek only:
```json
"morphmap/branch-agent": { "model": "deepseek/deepseek-v4-flash", "thinking": "high" },
"morphmap/leaf-worker":  { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
"morphmap/reviewer":     { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
"morphmap/scout":       { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
"morphmap/researcher":  { "model": "deepseek/deepseek-v4-flash", "thinking": "medium" }
```

Anthropic only:
```json
"morphmap/branch-agent": { "model": "anthropic/claude-sonnet-4", "thinking": "high" },
"morphmap/leaf-worker":  { "model": "anthropic/claude-haiku-4-5", "thinking": "low" },
"morphmap/reviewer":     { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
"morphmap/scout":       { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
"morphmap/researcher":  { "model": "deepseek/deepseek-v4-flash", "thinking": "medium" }
```

OpenAI only:
```json
"morphmap/branch-agent": { "model": "openai/gpt-5.2", "thinking": "high" },
"morphmap/leaf-worker":  { "model": "openai/gpt-5-mini", "thinking": "low" },
"morphmap/reviewer":     { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
"morphmap/scout":       { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
"morphmap/researcher":  { "model": "deepseek/deepseek-v4-flash", "thinking": "medium" }
```

## Phase 3: Create blank mindmap

Write `morphmap.mindmap.md`:

```markdown
---
type: mindmap
project: <project-name>
status: planned
timestamp: <today>
tags: []
posture:
  phase: mvp
  compatibility: break
  scope: narrow
  quality: standard
  budget: balanced
---

# <Project Name>

## decisions ⬜
- <today>: project initialized with MorphMap
```

## Phase 4: Create index

Write `index.md` with OKF frontmatter pointing to morphmap.mindmap.md.

## Phase 5: Git init

If no git repo exists: `git init`.

## Phase 6: Report

```
MorphMap project scaffolded:
  .morphmap/config
  morphmap.mindmap.md
  index.md
  
Next: /morphmap-plan "your directive"
```
