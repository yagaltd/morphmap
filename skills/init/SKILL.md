---
name: morphmap-init
description: "Scaffold a new MorphMap project. Creates .morphmap/ directory with default config, blank mindmap. Use --scan for brownfield — auto-survey existing codebase. Use --update-agents to refresh frozen agent copies."
user-invocable: true
argument-hint: "[project name] [--scan] [--update-agents] [path]"
---

# MorphMap Init

Scaffold a new MorphMap project structure.

**Modes:**
- **Scaffold** (default): create new project with fresh mindmap
- **Scan** (`--scan`): brownfield — survey existing codebase
- **Update agents** (`--update-agents`): refresh frozen agents in existing project

## Phase 0: CHECK MODE

If `--update-agents` flag present:
- Skip all other phases
- Run only Phase 2d (copy agents from global install to `.morphmap/agents/`)
- Show git diff of agent changes
- Exit with: "Agents updated. Review diff and commit if satisfied."

If `--update-agents` absent: proceed with full scaffold below.

## Phase 1: Create directories

```bash
mkdir -p .morphmap/specs
```

## Phase 2: Create config (REQUIRED — do before any subagent spawn)

Write `.morphmap/config` with default settings:

```yaml
available:
  extensions: [pi-subagents, pi-intercom, context-mode, pi-codex-goal]
  cli: [agent-spec, markmap-cli]
  builtin: [/goal, vcc_recall]
  verified-at: <today>

orchestratorProfile:
  model: "deepseek/deepseek-v4-pro"
  thinking: "high"

leafProfiles:
  standard:    { model: "deepseek/deepseek-v4-flash", thinking: "off" }
  risky:       { model: "deepseek/deepseek-v4-pro",  thinking: "high" }
  blocking:    { model: "anthropic/claude-sonnet-4",  thinking: "max" }
  time:        { model: "deepseek/deepseek-v4-flash", thinking: "high" }
  verify:      { model: "deepseek/deepseek-v4-pro",  thinking: "high" }

taskProfiles:
  plan-scout:          { model: "deepseek/deepseek-v4-flash", thinking: "off" }
  plan-grill:          { model: "deepseek/deepseek-v4-pro",  thinking: "max" }
  plan-context:        { model: "deepseek/deepseek-v4-flash", thinking: "high" }
  build-backend:       { model: "deepseek/deepseek-v4-pro",  thinking: "high" }
  build-frontend:      { model: "zai/glm-5.2",              thinking: "high" }
  build-generic:       { model: "deepseek/deepseek-v4-pro",  thinking: "high" }
  review-mechanical:   { model: "deepseek/deepseek-v4-flash", thinking: "off" }
  review-judgment:     { model: "anthropic/claude-sonnet-4",  thinking: "high" }
  review-frontend:     { model: "zai/glm-5.2",              thinking: "high" }
  research-pass:       { model: "deepseek/deepseek-v4-flash", thinking: "off" }
  research-verify:     { model: "deepseek/deepseek-v4-pro",  thinking: "high" }

specsDirectory: .morphmap/specs/
```

This config is REQUIRED before spawning any subagents — ensures correct model/thinking per task type.

## Phase 2b: Agent configuration (REQUIRED for pi-subagents)

MorphMap CANNOT work without its own agents. Without these overrides, pi-subagents
will use its builtin defaults (wrong prompts, wrong thinking, wrong assumptions).

Add to `.pi/settings.json` (project scope):

```json
{
  "subagents": {
    "agentOverrides": {
      "morphmap/branch-agent":    { "model": "deepseek/deepseek-v4-flash", "thinking": "high" },
      "morphmap/leaf-worker":     { "model": "deepseek/deepseek-v4-flash", "thinking": "off" },
      "morphmap/reviewer":       { "model": "deepseek/deepseek-v4-flash", "thinking": "off" },
      "morphmap/scout":          { "model": "deepseek/deepseek-v4-flash", "thinking": "off" },
      "morphmap/researcher":     { "model": "deepseek/deepseek-v4-flash", "thinking": "high" },
      "morphmap/context-builder": { "model": "deepseek/deepseek-v4-flash", "thinking": "high" },
      "morphmap/quality-reviewer": { "model": "deepseek/deepseek-v4-flash", "thinking": "high" }
    }
  }
}
```

**This is REQUIRED.** Without it, MorphMap agents won't work correctly.

Add `agentPaths` to tell pi-subagents to load project-local agents first:

```json
{
  "subagents": {
    "agentPaths": [".morphmap/agents"],
    "agentOverrides": {
      "morphmap/branch-agent":    { "model": "deepseek/deepseek-v4-flash", "thinking": "high" },
      ...
    }
  }
}
```

`agentPaths` ensures `.morphmap/agents/` is checked before global install.
This isolates the project from global agent updates.

## Phase 2d: Freeze agents into project (REQUIRED)

Copy MorphMap agent definitions into `.morphmap/agents/` so they're git-tracked:

```bash
mkdir -p .morphmap/agents

# Primary: copy from global install
if [ -d ~/.pi/agent/agents/morphmap ]; then
  cp ~/.pi/agent/agents/morphmap/*.md .morphmap/agents/ 2>/dev/null
fi

# Merge: also copy from .pi/agents/ (source repo, may have extras like quality-reviewer)
if [ -d .pi/agents ]; then
  cp .pi/agents/*.md .morphmap/agents/ 2>/dev/null
fi

# Verify: expected 7 agents (branch-agent, leaf-worker, reviewer, scout, researcher, quality-reviewer, context-builder)
AGENT_COUNT=$(ls .morphmap/agents/*.md 2>/dev/null | wc -l)
if [ "$AGENT_COUNT" -lt 5 ]; then
  echo "⚠ Only $AGENT_COUNT agents frozen (expected at least 5). Check global install."
else
  echo "✓ $AGENT_COUNT agents frozen to .morphmap/agents/"
fi
```

**Why:** Agents are the "compiler" for your project. Changing agents changes
behavior without any git-visible diff. Freezing ensures reproducibility.

**Upgrade later:** `/morphmap-init --update-agents` copies fresh agents from
global install. Git shows the diff. You review before committing.

## Phase 3: Create mindmap and domain context

Two paths: greenfield (blank) or brownfield (populated from mechanical scan). Both write `.morphmap/CONTEXT.md`.

### Greenfield: Create blank mindmap

No `--scan` flag → project has no existing code. Write blank map:

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

## context ⬜
- Domain glossary → .morphmap/CONTEXT.md

## decisions ⬜
- <today>: project initialized with MorphMap
```

### Brownfield: Populate from mechanical scan

`--scan <path>` flag present → existing codebase. Mechanical only, no scouts, no judgment.

**Step 3.1: Validate path**

```bash
ls -d <path> 2>/dev/null
```

If path does NOT exist:
- List available directories with `ls -d */`
- Report: "Path '<path>' not found. Available: <list>. Confirm or retry?"

**Step 3.2: Mechanical inventory ($0, <1s)**

```bash
# 1. Language stats (tokei if installed, else find + wc)
if command -v tokei &> /dev/null; then
  tokei <path> --files --sort code --output json > .morphmap/tokei-stats.json
else
  find <path> -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.rs" -o -name "*.go" | \
    xargs wc -l | sort -rn | head -50 > .morphmap/file-sizes.txt
fi

# 2. Directory structure (top-level dirs, exclude node_modules/.git/dist/build)
find <path> -maxdepth 1 -type d \
  -not -name 'node_modules' -not -name '.git' -not -name 'dist' -not -name 'build' \
  -not -name '.' -not -name '<path>' | sort > .morphmap/dirs.txt

# 3. Entry points
find <path> -name 'main.*' -o -name 'index.*' -o -name 'app.*' -o -name 'App.*' -o -name 'server.*' \
  -not -path '*/node_modules/*' | head -10 > .morphmap/entry-points.txt
```

**Step 3.3: Build populated mindmap**

Combine mechanical data into `.morphmap/morphmap.mindmap.md`:

```markdown
---
type: mindmap
project: <project-name>
status: planned
timestamp: <today>
tags: [brownfield]
posture:
  phase: mvp
  compatibility: break
  scope: narrow
  quality: standard
  budget: balanced
source: --scan <path> on <today>
---

# <Project Name>

## context ⬜
- scout-001: brownfield scan → .morphmap/scout-001-<date>-<slug>.md
- Mechanical data → .morphmap/tokei-stats.json
- Domain glossary → .morphmap/CONTEXT.md

## decisions ⬜
- <today>: brownfield scan of <path>
- scout-001: initial reconnaissance → .morphmap/scout-001-<date>-<slug>.md

## <dir-1> ⬜ [module]
- ⬜ <entry-point> → .morphmap/specs/<dir-1>-entry.spec

## <dir-2> ⬜ [module]
- ⬜ <entry-point> → .morphmap/specs/<dir-2>-entry.spec
```

Rules:
- Each top-level source directory → one branch
- Each entry point → one leaf
- NO bottleneck tags, NO risk assessment, NO "refactor X"
- Scanned path saved in frontmatter `source` field
- `decisions` branch records scan date + reference to raw data files
- Mechanical data files (.tokei-stats, .dirs.txt, .entry-points.txt) stay in .morphmap/ for plan phase reference

## Phase 4: Create index and domain context

Write `.morphmap/index.md` with OKF frontmatter pointing to .morphmap/morphmap.mindmap.md.

Also write `.morphmap/CONTEXT.md` domain glossary template:

```markdown
# Context

Shared domain language for this project. Keep meaningful to domain experts; avoid implementation trivia.

## Glossary

| Term | Meaning | Notes |
|---|---|---|

## Domain Rules

- Durable rule or invariant that should guide specs, tests, and reviews.

## Open Questions

- Unresolved domain question, owner, and why it matters.
```

## Phase 5: Git init

If no git repo exists: `git init`.

Install pre-commit hook for automatic mindmap HTML rendering:

```bash
# Copy the pre-commit hook from morphmap package
HOOK_SRC=".morphmap/post-commit-hook.sh"
HOOK_DST=".git/hooks/pre-commit"
if [ -f "$HOOK_SRC" ]; then
  cp "$HOOK_SRC" "$HOOK_DST"
  chmod +x "$HOOK_DST"
  echo "✓ Pre-commit hook installed: auto-renders HTML before map commits"
fi
```

The MorphMap pi extension (`.pi/extensions/morphmap-hooks.ts`) provides
additional runtime hooks:
- Blocks leaf-worker spawn without .spec file
- Auto-renders + commits HTML after map edits (agent-triggered)
- Auto-logs telemetry on tool failures
- Warns on update_goal complete before gate check

Both the git hook (human edits) and pi extension hook (agent edits) ensure
`.morphmap/morphmap.mindmap.html` stays in sync with `.md`.

## Phase 6: Render + Report

```bash
npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open
```

```
MorphMap project scaffolded:
  .morphmap/config
  .morphmap/morphmap.mindmap.md
  .morphmap/morphmap.mindmap.html
  .morphmap/index.md
  
Next: /morphmap-plan "your directive"
```
