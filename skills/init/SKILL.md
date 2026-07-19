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
available:
  extensions: [pi-subagents, pi-intercom, context-mode, pi-codex-goal]
  cli: [agent-spec, markmap-cli]
  builtin: [/goal, vcc_recall]
  verified-at: <today>

leafProfiles:
  standard:    { model: "deepseek/deepseek-v4-flash", thinking: "low" }
  risky:       { model: "deepseek/deepseek-v4-pro",  thinking: "high" }
  blocking:    { model: "anthropic/claude-sonnet-4",  thinking: "xhigh" }
  time:        { model: "deepseek/deepseek-v4-flash", thinking: "medium" }
  verify:      { model: "deepseek/deepseek-v4-pro",  thinking: "high" }

specsDirectory: .morphmap/specs/
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
