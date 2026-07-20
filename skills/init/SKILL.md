---
name: morphmap-init
description: "Scaffold a new MorphMap project. Creates .morphmap/ directory with default config, blank mindmap. Use --scan for brownfield — auto-survey existing codebase."
user-invocable: true
argument-hint: "[project name] [--scan] [path]"
---

# MorphMap Init

Scaffold a new MorphMap project structure.

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
      "morphmap/branch-agent": { "model": "deepseek/deepseek-v4-flash", "thinking": "high" },
      "morphmap/leaf-worker":  { "model": "deepseek/deepseek-v4-flash", "thinking": "off" },
      "morphmap/reviewer":    { "model": "deepseek/deepseek-v4-flash", "thinking": "off" },
      "morphmap/scout":       { "model": "deepseek/deepseek-v4-flash", "thinking": "off" },
      "morphmap/researcher":  { "model": "deepseek/deepseek-v4-flash", "thinking": "high" }
    }
  }
}
```

**This is REQUIRED.** Without it, MorphMap agents won't work correctly.

## Phase 3: Brownfield scan (optional, with --scan [path])

Only proceed if `--scan` flag is present. Uses deterministic analysis FIRST, then targeted scouts.

### Step 3a: Validate path

```bash
ls -d <path> 2>/dev/null
```

If path does NOT exist:
- List available directories with `ls -d */`
- Report: "Path '<path>' not found. Available: <list>. Confirm or retry?"

### Step 3b: Deterministic analysis (mechanical, $0, instant)

```bash
# 1. Language stats (use tokei if installed, else fall back to find + wc)
if command -v tokei &> /dev/null; then
  tokei <path> --files --sort code --output json > .morphmap/tokei-stats.json
else
  find <path> -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.rs" -o -name "*.go" |     xargs wc -l | sort -rn | head -50 > .morphmap/file-sizes.txt
fi

# 2. Top 10 largest files (mechanical, no LLM)
find <path> -type f -not -path '*/node_modules/*' -not -path '*/.git/*'   -not -path '*/dist/*' -not -path '*/build/*'   -exec wc -l {} + 2>/dev/null | sort -rn | head -12 > .morphmap/top-files.txt

# 3. Entry points (package.json main, index files, app entry)
find <path> -name 'main.js' -o -name 'index.js' -o -name 'app.js' -o -name 'App.jsx' -o -name 'server.js'   -not -path '*/node_modules/*' | head -10 > .morphmap/entry-points.txt
```

### Step 3c: Targeted scout (judgment, only on key files)

Read `.morphmap/top-files.txt` for the 5 largest files.
Read `.morphmap/entry-points.txt` for entry points.

Spawn MULTIPLE targeted scouts in parallel (NOT one big scout):

```
subagent({
  tasks: [
    { agent: "morphmap/scout",
      task: "Read ONLY: <largest-file-1>. Identify: purpose, responsibilities, refactoring risk. Output 3-sentence summary + bottleneck tag.",
      context: "fresh" },
    { agent: "morphmap/scout",
      task: "Read ONLY: <largest-file-2>. Same format.",
      context: "fresh" },
    { agent: "morphmap/scout",
      task: "Read ONLY: <entry-point>. Identify loaded modules, dependency graph shape. Output 3-sentence summary.",
      context: "fresh" }
  ],
  concurrency: 3
})
```

If repo has >200 source files, also spawn a structure scout:

```
subagent({
  agent: "morphmap/scout",
  task: "Read .morphmap/top-files.txt and .morphmap/entry-points.txt. Output a concise architecture summary: 5-8 branches for the morphmap.mindmap.md tree. Each branch = one module. Max 3 leaves per branch.",
  context: "fresh"
})
```

### Step 3d: Build tree from mechanical data + scout insights

Combine:
- `.morphmap/tokei-stats.json` → language distribution, file counts
- `.morphmap/top-files.txt` → largest files with line counts
- Scout summaries → architecture insights, bottleneck tags

Write to `.morphmap/morphmap.mindmap.md`:

```markdown
## <module-name> ⬜ [module]
- ⬜ <largest-file> (N lines) → .morphmap/specs/<name>-refactor.spec 🔴
- ⬜ <entry-point> wiring → .morphmap/specs/<name>-entry.spec
```

Rules:
- Every branch MUST have specific leaves (no empty branches)
- Bottleneck tags from scout insights (🔴 for files >2000 lines, 🟡 for test gaps)
- Reference .morphmap/scout-recon.md for full findings

## Phase 4: Create blank mindmap

Write `.morphmap/morphmap.mindmap.md`:

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

## Phase 5: Create index

Write `.morphmap/index.md` with OKF frontmatter pointing to .morphmap/morphmap.mindmap.md.

## Phase 6: Git init

If no git repo exists: `git init`.

## Phase 7: Render + Report

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
