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
  thinking: "medium"

leafProfiles:
  standard:    { model: "deepseek/deepseek-v4-flash", thinking: "low" }
  risky:       { model: "deepseek/deepseek-v4-pro",  thinking: "high" }
  blocking:    { model: "anthropic/claude-sonnet-4",  thinking: "xhigh" }
  time:        { model: "deepseek/deepseek-v4-flash", thinking: "medium" }
  verify:      { model: "deepseek/deepseek-v4-pro",  thinking: "high" }

taskProfiles:
  plan-scout:          { model: "deepseek/deepseek-v4-flash", thinking: "low" }
  plan-grill:          { model: "deepseek/deepseek-v4-pro",  thinking: "xhigh" }
  build-backend:       { model: "deepseek/deepseek-v4-pro",  thinking: "medium" }
  build-frontend:      { model: "zai/glm-5.2",              thinking: "medium" }
  build-generic:       { model: "deepseek/deepseek-v4-pro",  thinking: "medium" }
  review-mechanical:   { model: "deepseek/deepseek-v4-flash", thinking: "low" }
  review-judgment:     { model: "anthropic/claude-sonnet-4",  thinking: "high" }
  review-frontend:     { model: "zai/glm-5.2",              thinking: "high" }
  research-pass:       { model: "deepseek/deepseek-v4-flash", thinking: "low" }
  research-verify:     { model: "deepseek/deepseek-v4-pro",  thinking: "medium" }

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
      "morphmap/leaf-worker":  { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
      "morphmap/reviewer":    { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
      "morphmap/scout":       { "model": "deepseek/deepseek-v4-flash", "thinking": "low" },
      "morphmap/researcher":  { "model": "deepseek/deepseek-v4-flash", "thinking": "medium" }
    }
  }
}
```

**This is REQUIRED.** Without it, MorphMap agents won't work correctly.

## Phase 3: Brownfield scan (optional, with --scan [path])

Only proceed if `--scan` flag is present.

### Step 3a: Validate path

```bash
ls -d <path> 2>/dev/null
```

If path does NOT exist:
- List available directories with `ls -d */`
- Report: "Path '<path>' not found. Available: <list>. Confirm or retry?"
- Do NOT continue until user confirms correct path
- Do NOT silently accept a nonexistent directory

### Step 3b: Mechanical inventory (deterministic)

Before spawning scout, build a mechanical file inventory:

```bash
find <path> -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | head -300 > .morphmap/file-inventory.txt
```

This constrains the scout to ONLY files inside the target directory.

### Step 3c: Spawn scout (constrained)

Read `.morphmap/config` to get taskProfiles, then spawn with correct model/thinking:

```
subagent({
  agent: "morphmap/scout",
  model: "<from taskProfiles.plan-scout.model>",
  thinking: "<from taskProfiles.plan-scout.thinking>",
  task: "Recon ONLY the directory <path>. Do NOT scan sibling directories. Do NOT scan parent directories. Only map files and sub-directories inside <path>. For each sub-directory, identify key files, entry points, dependencies. Suggest bottleneck tags. Output as structured tree. Write detailed findings to .morphmap/scout-recon.md.",
  context: "fresh"
})
```

### Step 3d: Merge findings (constrained by file inventory)

After scout completes:
- Scout writes detailed findings to `.morphmap/scout-recon.md`
- Add to decisions: `- <today>: scout recon complete → .morphmap/scout-recon.md`
- Each sub-directory → `## <name> ⬜ [module]` in map
- Key source files → `- ⬜ <description> → .morphmap/specs/<name>.spec`

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
