---
name: morphmap-explore
description: "Parallel multi-angle recon on a brownfield question. Spawns architecture + quality + security agents in parallel, then synthesizes a kill/pivot/proceed recommendation."
user-invocable: true
argument-hint: "[question to explore]"
---

# MorphMap Explore

Parallel multi-angle research. Kill, pivot, or proceed with evidence.

## Phase 1: DEFINE

Read the question. If clear, state it and move on. If vague, ask 1 narrowing question.

Identify the **angles** that need exploration. Based on the question, pick 2-4:
- **Architecture/codebase** — structure, dependencies, risk boundaries
- **Code quality** — error handling, complexity, domain fit
- **Security** — vulnerabilities, auth, untrusted input, injection surfaces
- **Feasibility/effort** — what would need to change, scope estimate, risks

## Phase 2: PARALLEL SUBAGENTS

Spawn one subagent per angle. Each investigates independently.

Match the agent to the angle:
- **Architecture/codebase** → `morphmap/scout`
- **Code quality** → `morphmap/quality-reviewer`
- **Security** → `morphmap/scout` with security-focused task
- **Feasibility** → `morphmap/researcher`

```
subagent({
  tasks: [
    {
      agent: "morphmap/scout",
      task: "Analyze architecture for: <question>.

Map structure, identify entry points, trust boundaries, state transitions.
Read key source files. Check recent git history.
Output: architecture summary, risk map (CRITICAL/HIGH/MEDIUM), file-level findings.",
      context: "fresh",
      progress: true
    },
    {
      agent: "morphmap/quality-reviewer",
      task: "Quality review for: <question>.

Check: error handling (swallowed failures, empty catches), code complexity,
domain/ADR fit against .morphmap/CONTEXT.md. Identify patterns that will cause issues.
Output: P0-P3 findings with file paths and evidence.",
      context: "fresh",
      progress: true
    },
    {
      agent: "morphmap/researcher",
      task: "Feasibility analysis for: <question>.

Estimate scope: what files need to change, dependencies, breaking changes.
Identify pre-existing patterns to follow. Check .morphmap/morphmap.mindmap.md for active branches.
Output: scope estimate, key risks, suggested approach.",
      context: "fresh",
      progress: true
    }
  ],
  concurrency: 3
})
```

If the question is simpler, reduce to 2 agents. If more complex, add a security-focused scout.

## Phase 3: SYNTHESIZE

Combine all subagent outputs:

```markdown
## Exploration: <question>

### What We Found
- <key finding 1>
- <key finding 2>

### What We Don't Know
- <unknowns>

### Recommendation
<PROCEED / PIVOT / KILL>: <reason>

### If We Proceed
- Scope: <rough estimate>
- Key risks: <risks>
- Suggested next: `morphmap-plan "<direction>"`
```

## Rules

- **Timebox**: minutes, not hours
- **Kill fast**: bad idea → say so clearly
- **No code changes**: exploration never commits code
- **Right agent for the angle**: don't use a single generic agent when specialized ones exist
- **Read .morphmap/ first**: tokei stats, entry points, mindmap — use the mechanical data to scope
