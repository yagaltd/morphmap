# mech-mindmap — Deterministic State Machine for MorphMap

type: plan
timestamp: 2026-07-22T12:00:00Z
version: 3
summary: Deterministic state machine for MorphMap — 554-line spec with 5-Why stress-tested design
tags: [mech, state-machine, deterministic, 5why-tested]

---

## 1. Introduction

### What

MorphMap currently trusts agents to enforce quality. A leaf worker claims "✅ done" — the branch agent believes it. A reviewer claims "code reviewed" — no evidence required. This trust fails: agents hallucinate completion, over-engineer, skip verification, break existing features while fixing new ones.

**mech replaces agent judgment with deterministic code gates.** Every leaf transition (⬜→🔄→⏳→✅) must present structured evidence validated by pure functions. No evidence → gate blocks. No gate pass → status doesn't advance.

### Why

The MorphShell experiment proved the trust model is broken: 13 orphaned worktrees, CSP misconfigurations reintroducing XSS, PDF/SVG rendering silently broken, port inconsistencies between vite and code. Agents claimed all tests passed. The app didn't run. Human spent a day fixing damage.

The root cause is structural: when "done" is a claim, not a proof, agents cut corners. mech makes "done" a proof.

### How (One Sentence)

**A TypeScript state machine where every transition requires evidence validated by pure functions, with JSON as machine-native source of truth and markdown as human presentation.**

### For External Reviewers

This document defines a quality enforcement layer for the MorphMap agent orchestration system. It does NOT replace agents — it constrains them. Agents still plan, implement, and review. But they cannot claim completion without machine-verifiable evidence.

The design is compact: ~1750 lines of TypeScript across 6 implementation phases. Pure module (~900 lines) has zero dependencies on the pi runtime — gates are testable in isolation. Impure module (~850 lines) wires gates to pi lifecycle events.

---

## 2. Architecture

### 2.1 Pure/Impure Split

```
┌─ Impure (pi-specific) ────────────────────────┐
│  morphmap-hooks.ts                             │
│  - Tool registration (pi.registerTool)         │
│  - Hook wiring (pi.on events)                  │
│  - md↔json sync (onMapWrite)                   │
│  - I/O: read state, spawn subagents            │
│                                                │
│  ┌─ Pure (zero pi imports) ──────────────┐    │
│  │  types.ts     — all interfaces         │    │
│  │  state.ts     — StateMachine<T>        │    │
│  │  config.ts    — lookup tables          │    │
│  │  gates/       — gate functions         │    │
│  │  lattice.ts   — transition chains      │    │
│  │  recovery.ts  — error classifier       │    │
│  └────────────────────────────────────────┘    │
└────────────────────────────────────────────────┘
```

**Pure module:** Zero pi imports. Zero filesystem access. Zero network. All data arrives via function parameters. Functions take plain objects, return plain objects. Unit-testable without pi. 
**Impure module:** Pi-specific wiring. Calls pure module for decisions, acts on results.

### 2.2 JSON Source of Truth

```
state.json (authoritative, machine-native, schema-validated)
     │
     ├──→ gates read directly (no parsing, zero tokens)
     ├──→ agent context: JSON excerpt for branch/leaf
     ├──→ plan.md (generated, markmap-compatible, human-editable)
     │       └──→ human edits → hook validates → state.json synced
     └──→ plan.html (markmap-cli or d3.js)

codebase-graph/<module>.json (authoritative)
     │
     ├──→ boundary gates (which files exist?)
     ├──→ dependency gates (imports/exports match?)
     ├──→ conflict gates (two leaves same file?)
     └──→ updated incrementally (git diff → tree-sitter)
```

| File | Role | Update Trigger |
|------|------|---------------|
| `state.json` | "What work was done?" — leaf status, evidence, gates, telemetry | Every leaf transition |
| `plan.md` | Human presentation — derived from state.json, markmap-compatible | Hook syncs from state.json after every change |
| `codebase-graph/<module>.json` | "What code exists?" — files, imports, exports | Init (full) + after each commit (incremental) |

**Why JSON-first:** Gates are pure functions. They read structured data, not parse markdown. Agent context shrinks (JSON excerpt ~1KB vs markdown block ~3KB). Validation at commit time. Humans still edit .md — no learning curve. Hook does the conversion.

### 2.3 State Machine Entities

```
Leaf {
  id: string              // leaf path, e.g. "auth/jwt-refresh"
  status: LeafStatus      // ⬜ | 🔄 | ⏳submit | ⏳review | 🔴 | ✅
  bottleneck: Bottleneck  // 🔴 | 🟡 | ⚪ | 🔵
  qa: QALevel             // none | review | full | strict
  test: TestStrategy[]    // see §2.4
  model: ModelAssignment
  tools: string[]
  evidence: LeafEvidence  // accumulated proof (see §6.1)
}

Branch {
  id: string
  status: BranchStatus    // ⬜ | 🔄 | ✅ | 🔴
  leaves: string[]
  subBranches: string[]
  integrationStatus: IntegrationStatus
}

IntegrationStatus {
  reviewFileExists, healthCheckPassed, bombadilPassed,
  lonkeroPassed, allLeavesComplete, crossLeafConflicts
}

DependencyGraph {
  nodes: Map<string, DepNode>
  edges: DepEdge[]        // leaf A needs leaf B
}
```

### 2.4 Gate Chains

Every gate is `(input) => { pass: boolean, reason?: string }`. Gates are composed into chains. First fail short-circuits.

```
preSpawnGates (before leaf worker starts):
  specFileExists | specScenarioCount ≤5 | specFileCount ≤3 |
  specEstLOC ≤200 | modelAssigned | toolsAssigned | dependenciesResolvable

submitGates (leaf worker → branch agent):
  agentSpecLifecycle | tddGuardPassed | npmTestAndBuild |
  boundariesClean | crossLeafNoConflict | filesMatchSpec

reviewGates (reviewer → branch agent):
  qualityReviewExists | P0Count=0 | P1Count=0 (if [qa: full]) |
  healthCheckPassed | bombadilPassed | lonkeroPassed

integrationGates (all leaves → branch complete):
  allLeavesSubmitted | crossLeafConflictsResolved |
  integrationReviewExists | integrationHealthCheckPassed
```

### 2.5 Transition Tools (pi-registered, TypeBox-validated)

Agents must call these to advance leaf state. Follows Trio's `trio_submit_for_review` pattern.

```
morphmap_submit_leaf({ leafId, evidence: { specPassed, testsRun, buildPassed, filesChanged } })
  → { accepted: boolean, failures: string[] }

morphmap_approve_leaf({ leafId, reviewFile, evidence: { p0Count, p1Count, healthCheck, bombadilResult, lonkeroResult } })
  → { accepted: boolean, failures: string[] }

morphmap_integration_gate({ branchId, reviewFile })
  → { passed: boolean, failures: string[] }
```

### 2.6 Configuration Tables (Pure Lookups, Zero Agent Thinking)

```
assignModel(leaf): reads bottleneck + qa + test tags → returns model from config table
assignTools(leaf): reads test + domain tags → returns tool list from config table
applyPosture(branch): reads phase + compat + quality → returns posture overrides
```

### 2.7 Hooks vs Scripts

| Type | Mechanism | Examples |
|------|-----------|----------|
| Deterministic checks | Pure functions in `mech/` | Gates, config lookup, dependency resolution |
| pi lifecycle wiring | Hooks in `morphmap-hooks.ts` | md↔json sync, map render, telemetry, tool enforcement |
| Agent judgment | Agent prompts | Quality-reviewer, bug-hunter, scout, researcher |
| External CLI | Subprocess calls | agent-spec, tdd-guard, bombadil, lonkero |

**What the hook does (onMapWrite, fires on every commit):**

```
Step A: md → json sync (if plan.md changed)
  → parse markdown → validate tags → write state.json
  → if invalid: block commit
  → Round-trip guarantee: state.json regenerated from itself produces identical state.json
    (test: plan.md → state.json → state.json' → no diff)

Step B: codebase-graph sync (if source files changed)
  → git diff → tree-sitter parse changed files → update graph
  → Graph writes serialized per module (single writer, no race)
  → Cross-module callers surfaced to callee's graph (UI calls auth → auth graph shows UI as consumer)
  → if tree-sitter not installed → skip, warn

Step C: regenerate plan.md from state.json (normalize)
Step D: render plan.html via markmap-cli

Step E: state.json atomic write (every transition)
  → write to state.json.tmp → fsync → atomic rename to state.json
  → Prevents corruption on crash mid-write
```

---

## 3. Fractal Loop

### 3.1 Same Pattern at Every Depth

The orchestrator is a branch-agent with the root map as its subtree. The steering map is a plan.md with the project name as root heading. Every depth follows the same loop: research → build → review → approve → distribute → integrate → report.

```
Depth 0: Orchestrator (= branch-agent, root map)
  Research: scouts + researcher
  Build: mindmap tree
  Grill: pi-interview (human)
  Approve: human

Depth 1: Branch-agent
  Research: ctx_search + available-skills
  Build: .spec files
  Review: spec-reviewer
  Grill: optional (per [human])

Depth 2+: Sub-branch-agent
  Same as depth 1, smaller scope

Leaf: Leaf-worker
  No research. No planning. Reads .spec + tests. Executes. Self-verifies. Submits.
```

### 3.2 Steering Map + Sub-Maps

```
steering map (.morphmap/morphmap.mindmap.md)
│
├── ## frontend ⬜ [submap: plans/frontend.plan.md]
│       └── plans/frontend.plan.md  ← standalone mindmap, same format
│           ├── ### auth 🔄 [module]
│           │   ├── ⬜ jwt-verify → specs/auth/jwt-verify.spec [qa: full]
│           │   └── ⬜ jwt-refresh [needs: auth/jwt-verify]
│           └── ### ui 🔄 [module]
│
├── ## backend ⬜ [submap: plans/backend.plan.md]
│       └── plans/backend.plan.md
│
└── ## decisions ⬜ [log]
```

Every sub-map renders via `markmap plans/<name>.plan.md -o plans/<name>.html`. Same format, different root heading.

### 3.3 Unified Depth Table

| Depth | Agent | Plan | Research | Build | Review | Grill | Execute |
|-------|-------|------|----------|-------|--------|-------|----------|
| 0 | Orchestrator | `morphmap.mindmap.md` | Scouts + researcher | Tree | — | Pi-interview | Spawns depth-1 |
| 1 | Branch-agent | `plans/<name>.plan.md` | Skills + ctx_search | .spec | Spec-reviewer | Optional | Spawns depth-2 or leaves |
| 2+ | Sub-branch | Parent subtree | ctx_search | .spec | Spec-reviewer | Optional | Spawns leaves |
| Leaf | Leaf-worker | .spec | None | None | Reviewer + quality | None | Execute + submit |

### 3.4 Branch Size — When to Decompose

```
>5 direct children → sub-branch recommended
>10 direct children → sub-branch mandatory
>300 lines total .spec content → split regardless of count
Common prefix (auth/*, api/*) with ≥3 children → group into sub-branch
```

**Numbers are tunable config, not invariants.** Configure in `.morphmap/config.branchSize: { recommend: 5, mandatory: 10, maxSpecLines: 300 }`. Adjust per project domain.

### 3.5 Context Isolation

Each sub-branch-agent gets FRESH context. Sees: its subtree, parent scope, known consumers, siblings. Does NOT see: sibling leaves, parent integration review, full steering map. 500-leaf ERP: no agent reads all 500. Each branch-agent reads ~10 leaves.

### 3.6 Inter-Branch Dependencies

| Tag | Resolves When | Use |
|-----|--------------|-----|
| `[needs: path]` | Target leaf ✅ | "I call this at runtime" |
| `[needs-contract: path]` | Target leaf ⏳review | "I need the API signature" |

`[needs-contract:]` enables parallel work — dependent leaf starts after contract approved, not after code complete. Deterministic resolution: `canStartLeaf()` walks the dependency graph. No agent judgment.

---

## 4. Quality Pipeline

### 4.1 Tiered Gates Per [qa:] Tag

| [qa:] | Spec review | Test writer | Code review | Quality review | Bug hunter | Refactor | For |
|-------|------------|-------------|-------------|----------------|------------|----------|-----|
| none | — | — | — | — | — | — | CSS, config, docs |
| review | — | — | Mech reviewer | — | — | — | Standard features |
| full | ✅ | — | Mech reviewer | ✅ | 🔴/🟡 only | ✅ | Auth, data, input |
| strict | ✅ | ✅ | Mech reviewer | ✅ | ✅ | ✅ | Payment, security |

### 4.2 Branch Agent Flow (Revised)

```
1. CONTRACT PHASE:
   a. For each direct leaf → write .spec
   b. If [qa: full] → spawn spec-reviewer
   c. If [qa: strict] → spawn test-writer + test-reviewer
   d. Human spot-check if [human] tag

2. EXECUTION PHASE:
   a. For each sub-branch → spawn sub-branch-agent (recursive)
   b. For each leaf → spawn leaf-worker against approved .spec
   c. Each leaf passes through review pipeline

3. INTEGRATION PHASE:
   a. All leaves + sub-branches complete
   b. Run integration review (health + bombadil + lonkero)
   c. Report to parent
```

Contract phase uses `--contract-only` flag on delegate. Execution reuses existing delegate. `.spec` files exist BEFORE leaf workers start.

**Contract revision escape hatch:** If a leaf worker discovers the `.spec` is wrong during BUILD (missing API signature, wrong boundaries), it calls `morphmap_request_revision(leafId, reason)`. Leaf returns to ⬜. Branch agent rewrites .spec. Prevents silent implementation against bad contracts.

**QA tier validation gate:** `mech_validate_qa_tier` — a leaf tagged `[auth]` or `[payment]` must have at least `[qa: full]`. Prevents agent misclassification at planning time. Configurable: `.morphmap/config.qaMinimums: { auth: "full", payment: "strict" }`.

### 4.3 Structured Leaf Worker

Leaf worker flow (Plan→Build→Verify→Submit, Trio pattern):

```
PLAN:  Read .spec → write 3-5 steps → identify edge cases → verify boundaries
BUILD: For each step: write test → fail → implement → pass → re-run all tests
VERIFY: agent-spec lifecycle → tdd-guard → npm test + build → self-review checklist
       "Did I add anything not in Boundaries? Any abstraction not in scenarios?"
SUBMIT: morphmap_submit_leaf({ evidence })

**Over-engineering guard:** After submit, a cheap second agent (`mech_overengineering_check`) reads diff + .spec and flags potential over-engineering (>3 new functions not in scenarios, new abstractions without callers). Warning only — accumulates, triggers human review after N warnings. Not a gate block.
```

Leaf worker is execution-only. Planning + test writing extracted to branch agent / test-writer. This eliminates over-engineering at code level.

### 4.4 Refactor Pass ([qa: full] or [qa: refactor])

After leaf ✅, spawn refactor-worker: same Boundaries, same tests. "Shorten to <200 LOC, complexity <15, no duplication." Cannot shorten → ✅ with note. Breaks tests → 🔴.

### 4.5 New Agents

| Agent | Role | When |
|-------|------|------|
| morphmap/spec-reviewer | Reviews .spec atomicity, clarity, edge cases | After .spec draft ([qa: full]) |
| morphmap/refactor-worker | Shortens code without changing behavior | After leaf ✅ ([qa: full]) |

Test-writer and test-reviewer deferred to later phase (only needed for [qa: strict], which is rare).

---

## 5. Brownfield Adaptation

### 5.1 Discovery Phase

Brownfield projects need codebase mapping before .spec files.

```
/morphmap-init --scan
  → tokei-stats.json (line counts)
  → codebase-graph/index.json (module list)
  → codebase-graph/<module>.json (files, imports, exports)
  → test-baseline.json (existing tests)

/morphmap-plan
  → Scouts read codebase-graph
  → Branch agent infers Boundaries from graph, not design
  → Tree respects existing module structure
```

### 5.2 Greenfield vs Brownfield

| | Greenfield | Brownfield |
|---|---|---|
| File structure | Designed | Mapped from graph |
| Boundaries | "Files I'll create" | "Which existing files?" |
| Dependencies | Designed | Discovered from imports |
| Tests | New | Existing preserved + extended |
| Refactor | Full code | NEW code only |
| Integration gate | "New code works?" | "Did anything break?" |

### 5.3 codebase-graph Lifespan

```
Init:     full build — tree-sitter parse src/**
After leaf: incremental — git diff → re-parse changed files only
Branch spawn: reads its module's graph (~5-15KB), never full graph
```

Split at same boundaries as mindmap tree. Each branch agent's module = one graph file.

### 5.4 Audit Command

`/morphmap-audit <module>` — quality-reviewer + bug-hunter + lonkero on EXISTING code. Advisory only. Produces report. Does not change code. Findings can be converted to leaves.

---

## 6. State & Schemas

### 6.1 state.json Schema

```json
{
  "branchId": "frontend/auth",
  "status": "in_progress",
  "quality": "fast",
  "leaves": {
    "jwt-verify": {
      "status": "in_review",
      "bottleneck": "blocking",
      "qa": "full",
      "test": ["unit", "integration"],
      "model": { "provider": "anthropic", "model": "claude-sonnet-4", "thinking": "max" },
      "tools": ["agent-spec", "tdd-guard"],
      "evidence": {
        "specExists": true,
        "specScenarioCount": 3,
        "specFileCount": 2,
        "agentSpecPassed": true,
        "tddGuardPassed": true,
        "npmTestPassed": true,
        "npmBuildPassed": true,
        "boundariesClean": true,
        "filesChanged": ["src/auth/login.ts", "src/auth/types.ts"],
        "testsRun": ["test: valid token returns session", "test: expired token rejects"],
        "healthCheckPassed": true,
        "bombadilPassed": null,
        "qualityReviewExists": true,
        "qualityReviewP0Count": 0,
        "qualityReviewP1Count": 1
      },
      "reviewRounds": 1,
      "trace": "frontend/auth/jwt-verify"
    }
  },
  "subBranches": [],
  "integrationStatus": {
    "reviewFileExists": false,
    "allLeavesComplete": false
  }
}
```

### 6.2 codebase-graph Schema

```json
{
  "module": "src/auth/",
  "files": {
    "login.ts": {
      "exports": ["login", "validateToken"],
      "imports": ["src/db/index.ts", "src/crypto/hash.ts"],
      "lastChanged": "2026-07-15",
      "changedBy": "leaf:auth/jwt-refresh"
    },
    "types.ts": {
      "exports": ["Session", "TokenPayload"],
      "imports": [],
      "lastChanged": "2026-07-14",
      "changedBy": "leaf:auth/jwt-verify"
    }
  },
  "crossModuleCalls": [
    { "from": "src/ui/Modal.tsx", "to": "src/auth/verify", "kind": "function-call" }
  ]
}
```

### 6.3 Trace Field

Every artifact (state.json, review files, telemetry entries) carries a `trace` field linking to the feature path. Single query returns full chain:

```bash
ctx_search(queries: ["trace:frontend/auth/jwt-refresh"], sort: "timeline")
# Returns: plan.md → ADR → .spec → quality-review → telemetry → integration-review → map status
```

---

## 7. Implementation

### 7.1 Phases

| Phase | What | LOC | Priority |
|-------|------|-----|----------|
| A | Types + State Machine Core | 200 | **Now** |
| B | Gate Functions (preSpawn, submit, review, integration) | 400 | **Now** |
| C | Transition Tools (submit_leaf, approve_leaf, integration_gate) | 300 | **Now** |
| D | Hooks Integration (md↔json sync, gate wiring, leaf-worker.md update, spec-reviewer.md creation) | 200 | Soon |
| E | Tool Failure Recovery (classifier, retry, reroute) | 150 | Soon |
| F | Sub-Map Session Lifecycle (heartbeat, orphan, status sync) | 200 | Later |
| — | Tests (unit + chain + integration) | 300 | Continuous |

**Total: ~1750-2200 lines, ~10-14 hours.** Pure module ~900-1100 lines. Impure ~850-1100 lines. Range accounts for schema boilerplate + config files missed in initial estimate.

### 7.2 File Structure

```
.morphmap/
  state.json                            — depth 0 state
  morphmap.mindmap.md                   — depth 0 plan (generated)
  config                                — profiles, tools, posture

  plans/<branch>/
    state.json                          — branch state
    plan.md                             — branch plan (human-editable)
    plan.html                           — rendered

  codebase-graph/
    index.json                          — module index
    <module>.json                       — per-module structure

  specs/                                — .spec contracts
  quality-review-*.md, integration-review-*.md

  mech/                                 — pure module
    types.ts, state.ts, config.ts
    gates/{pre-spawn,submit,review,integration}.ts
    lattice.ts, recovery.ts

.pi/
  extensions/morphmap-hooks.ts          — impure: wiring, hooks, sync
  agents/                               — system prompts
```

### 7.3 Cost per 45-Leaf Project

Future architecture is ~25% cheaper than current despite more agents and more loops. Leaf worker cost drops from HIGH to MEDIUM (planning extracted to branch agent, amortized across all leaves). Integration gates are deterministic CLI — near-zero token cost. State machine gates are pure function calls — near-zero token cost.

### 7.4 Mech Integration Tests

Required before release: full leaf lifecycle, gate failure + recovery, human override, parallel submission, crash recovery, rollback, cross-leaf conflict detection.

---

## 8. Operations

### 8.1 Session Crash Recovery

1. Restart pi, run `/morphmap-recover --auto`
2. Recovery reads state.json: finds stuck leaves, checks orphans, merges work
3. Branch-agent restores from state.json: reads subtree, respawns active sub-branch agents
4. State machine is idempotent — replaying completed transitions is safe

state.json is the recovery anchor. Written on every transition. Git-tracked.

### 8.2 Human Override

`morphmap_force_approve(leafId, reason)` — emergency escape hatch. Logs to decisions with timestamp. Only depth 0 (Root Orchestrator) can force-approve.

### 8.3 Rollback / Disable

- Per-branch opt-out: `[qa: none]` skips all gates
- Per-gate disable: `mech.exclude_gates: ["gate_name"]` in config — disables a specific noisy gate without disabling all gates. Validates against gate dependency graph before applying.
- Config flag: `mech.enabled: false` → gates become warnings
- Emergency: `/morphmap-delegate --no-mech`

Disabling mech returns to current behavior. No data loss.

### 8.4 Backward Compatibility

Existing projects continue working. New tags optional. No .spec format change. `mech.enabled: false` = identical to today. New projects default to `mech.enabled: true`.

**Migration tooling (planned v0.3):** `morphmap-migrate --scan` analyzes existing project and suggests tags for existing leaves. Human reviews and approves. Until then, manual tag addition.

---

## Design Decisions Log

- **TDD + .spec contracts:** Compatible. .spec says WHAT, TDD verifies HOW. agent-spec lifecycle bridges them.
- **BDD:** Already used in Completion Criteria (`Given X, When Y, Then Z`).
- **Over-engineering prevention:** Refactor pass + mechanical quality checks (LOC, complexity, nesting).
- **SonarQube gates:** Deferred. Useful but not urgent. Current gates catch most failures.
- **Trio pattern:** Used inside leaf worker (Plan→Build→Verify→Submit). Not at branch-agent level.
- **No Rust/Rhai:** Deferred. TypeScript first. Port only when bottlenecks proven.
- **Markmap stays:** plan.md renders via existing markmap-cli. No new rendering engine.
- **Event history deferred:** State machine tracks current state only. Full event sourcing (audit trail of every transition) deferred to v0.3 when traceability requirements mature.
- **Human override delegation:** Depth-0 only for prototype. Delegated override (time-boxed, mandatory post-hoc review) deferred to v0.2 for team/CI scenarios.
- **Audit compulsory triggers:** Advisory-only for v0.1. Security-critical modules ([qa: strict]) may get compulsory pre-change audit in v0.2.
- **Trace↔improve integration:** Trace field exists for artifact linkage. morphmap-improve currently uses git log + decisions log, not trace. Integration planned for v0.3 when trace field is populated across all artifacts.
