# one-map — Unified MorphMap Architecture

type: plan
timestamp: 2026-07-23T12:00:00Z
version: 2
summary: Simplified architecture — one entity, one loop, one state machine. Map is session tree, agent assembled from map metadata, compiler extracts evidence from JSONL.
tags: [architecture, simplification, unified, reference]

---

## Intent

MorphMap's current design has separate entity types (Leaf vs Branch), separate agent files (branch-agent.md, leaf-worker.md, reviewer.md), separate session management (pi-subagents, intercom, goal extension, trio extension). This complexity came from building incrementally — each piece solved a problem, but the pieces don't cohere.

**one-map unifies: one entity type, one loop, one state machine.** The mindmap IS the session tree. The fork IS a branch. The agent IS assembled from map metadata. The compiler extracts evidence deterministically from agent JSONL. state.json coordinates them.

pi-codex-goal removed (replaced by mech state machine). trio removed (replaced by compiler hook + submit gates). Agent files replaced by skill templates + metadata assembly.

---

## Phase Structure

The implementation follows the mech-mindmap.md §7.1 phase structure. Phases A-F are the **pure state machine core** (zero pi imports, fully tested). Phase D is the **impure wiring** (hooks integration).

| Phase | What | Status | Priority |
|-------|------|--------|----------|
| A | Types + State Machine Core | ✅ 49 tests | Done |
| B | Gate Functions (22 gates, 4 chains) | ✅ 38 tests | Done |
| C | Transition Tools (submitLeaf, approveLeaf, integrationGate) | ✅ 18 tests | Done |
| D | Hooks Integration (register tools, state.json I/O, md↔json sync) | ⚠️ NOT WIRED | **NOW** |
| E | Tool Failure Recovery (classifier, retry, reroute) | ✅ 16 tests | Done (pure) |
| F | Sub-Map Session Lifecycle (orphan, status sync) | ✅ 13 tests | Done (pure) |
| — | Tests (unit + chain + integration) | ✅ 180 tests, 402 expects | Continuous |

**Current gap:** Phases A-F pure cores are complete (180 tests green). Phase D (hooks integration) is NOT wired — `morphmap-hooks.ts` does not register transition tools, no `state.json` exists on disk. This is the highest-priority gap.

---

## 1. One Entity Type — Node

No separate Leaf vs Branch. One type with dynamic metadata.

```json
{
  "id": "auth/jwt-refresh",
  "status": "in_review",
  "goal": "Implement JWT token refresh endpoint",
  "children": [],
  "metadata": {
    "model": "deepseek/deepseek-v4-pro",
    "thinking": "high",
    "tools": ["agent-spec", "tdd-guard", "git"],
    "budget": "$5.00",
    "eta": "2026-07-30",
    "priority": "blocking",
    "qa": "full",
    "test": ["unit", "integration"],
    "session_id": "subagent-405d2f3d"
  }
}
```

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | Yes | Unique path in tree (e.g. "auth/jwt-refresh") |
| `status` | Yes | State machine state (pending/in_progress/submitted/in_review/blocked/done/abandoned) |
| `goal` | No | What this node should accomplish |
| `children` | Yes | Empty = leaf, non-empty = branch |
| `metadata` | No | Open object — any domain-specific fields |

**Required metadata fields:**
- `model` / `thinking` — assigned by branch agent per bottleneck tag + config profiles
- `tools` — assigned by branch agent per `[test:]` + domain tags
- `priority` — bottleneck tag (blocking/risky/standard/time/verify)
- `qa` — quality level (none/review/full/strict)
- `session_id` — pi subagent session ID (for map-as-session-tree)

Empty children = executable leaf. Non-empty children = branch that manages sub-nodes. Same state machine. Same gates. Same loop.

**One node serves: code leaves, marketing tasks, portfolio projects, SLA tracking, calendar events.** The compiler reads `id` + `status` + `children`. Everything else is domain metadata.

---

## 2. Map = Session Manager

The mindmap IS the session tree. Each branch = one pi subagent session. Session IDs stored in node metadata.

```
portfolio map (depth -1)
│
├── ## morphmap 🔄 [session: subagent-405d2f3d]
│       └── pi subagent active — working on mech Phase D
│
├── ## explore-oauth 💤 [session: subagent-92233a31]
│       └── pi subagent paused — set aside
│
├── ## invoicing ⬜ [session: —]
│       └── no session yet — not started
│
└── ## decisions ⬜ [log]
```

| Action | Mechanism |
|--------|-----------|
| Open project | Focus pi session → agent resumes |
| Fork to new branch | New node → spawn pi subagent → record session ID in metadata |
| Set aside | Mark node 💤 → detach session, freeze state.json |
| Resume | Mark node 🔄 → reattach session, restore state |
| Zoom in | Read subtree from mindmap |
| Zoom out | Portfolio map showing all branches |

The map IS the session manager. No separate session database. The map shows what's running, what's paused, what's done. Session IDs in metadata link map nodes to pi subagent sessions.

---

## 3. Agent = Skill Template + Node Metadata

Agent assembled at spawn time from **skill template** (system prompt) + **node metadata** (assignment). NOT a single source.

```
Skill template (.md file)           Node metadata (map)
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ "You are a leaf worker."     │    │ model: deepseek-v4-pro      │
│ "Read .spec. Write tests."   │    │ thinking: high              │
│ "Plan → Build → Verify."     │    │ tools: [agent-spec, git]    │
│ "Follow BDD scenarios."      │    │ budget: $5.00               │
│ (SOP, execution loop,        │    │ eta: 2026-07-30             │
│  decision matrices)          │    │ qa: full                    │
└─────────────────────────────┘    └─────────────────────────────┘
                                       │
                                       ▼
                        Branch agent assembles:
                        template + metadata → system prompt
                        config.ts maps [qa:]/[test:] → ModelAssignment
```

**Skill template** = the "training" — system prompt, execution loop, SOP, decision matrices. Lives in `.pi/agents/*.md`. Does NOT hardcode model/tools/reasoning.

**Node metadata** = the "assignment" — model, thinking, tools, budget, ETA, goal. Lives in `state.json` + mindmap tags. Branch agent assigns per-node via `config.ts` mapping:

| Tag | Maps to | Example |
|-----|---------|---------|
| `[qa: full]` + `🔴` | `assignModel("blocking", "full")` | `claude-sonnet-4, thinking: max` |
| `[qa: none]` + `⚪` | `assignModel("standard", "none")` | `deepseek-v4-flash, thinking: off` |
| `[test: e2e]` | `assignTools(["e2e"])` | `playwriter, agent-browser` |
| `[test: unit]` | `assignTools(["unit"])` | `vitest, jest` |

**Human flow analogy:** trained worker (skill template) + tools + assignment (model, reasoning, goal). Worker competence = model + reasoning. Assignment comes from map metadata, not hardcoded in template.

**Flexibility:** a task/branch can override model/thinking/tools via metadata. `config.ts` provides defaults from [qa:]/[test:] tags. Branch agent can override per-node. No agent file changes needed.

---

## 4. One Loop at Every Depth

```
Plan → Execute → Verify → Integrate
```

Same pattern for every node type, at every depth:

| Depth | Node type | Plan | Execute | Verify | Integrate |
|-------|-----------|------|---------|--------|-----------|
| -1 | Portfolio | Priority list | Spawn project agents | Cross-project check | Update portfolio map |
| 0 | Project | Write mindmap tree | Spawn branch agents | Integration gate | Report to portfolio |
| 1+ | Branch | Write .spec files | Spawn leaf workers | Integration review | Report to parent |
| Leaf | Executable | Read .spec | Implement + test | Self-verify + submit | — |

Same mechanism. Different metadata. A marketing leaf has `campaign_deadline` instead of `.spec`. Same loop.

---

## 5. Compiler Replaces Goal + Trio

Agent streams JSONL → compiler hook extracts evidence → updates state.json. Deterministic. No agent summarization.

```
Agent works ──→ JSONL (pi session log, git-committed for audit)
                    │
Compiler hook ──→ parses JSONL → extracts evidence → calls mech state machine
                    │
                    ├──→ state.json (structured, authoritative)
                    └──→ mindmap.md (generated from state.json via markmap)
```

**Compiler hook** runs on `tool_result` events in `morphmap-hooks.ts`. For each agent completion, it parses the JSONL to extract:

| Evidence field | Source in JSONL |
|----------------|-----------------|
| `agentSpecPassed` | `agent-spec lifecycle` exit code |
| `tddGuardPassed` | `tdd-guard lint` exit code |
| `npmTestPassed` | `npm test` exit code |
| `npmBuildPassed` | `npm run build` exit code |
| `filesChanged` | `git diff --name-only` output |
| `testsRun` | Test names from test output |
| `boundariesClean` | agent-spec boundary check result |

| Old (pi extensions) | New (compiler) |
|---------------------|----------------|
| `/goal` — agent marks objective complete | State machine advances status when evidence validates |
| `/trio` — agent self-reviews | Leaf worker prompt + submit gates = same pattern, enforced |
| Agent writes summary in mindmap | Compiler extracts from JSONL, writes state.json deterministically |

The compiler is a pi extension hook (`morphmap-hooks.ts`). No new infrastructure.

---

## 6. State Machine Enforces, Not Replaces Loop

```
┌─────────────────────────────────┐
│           The Loop               │
│  (agent system prompt)           │
│  Plan → Build → Verify → Submit  │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│      State Machine Gates         │
│  "No evidence? Status stays ⬜."  │
│  submit → gates → pass → advance │
│  submit → gates → fail → 🔴      │
└─────────────────────────────────┘
```

**Loop = agent prompt.** Tells the agent HOW to work. **State machine = deterministic gates.** Won't let the agent advance without evidence. Both needed. Different concerns.

---

## 7. Branch Manager = Planner + Dispatcher

Branch node's job: plan the work, dispatch to sub-nodes, wait for completion, integrate.

```
Branch node (has children):
  1. PLAN:    For each child → write .spec (if leaf) or scope (if sub-branch)
  2. DISPATCH: For each child → subagent({ agent: "morphmap/branch-agent", ... })
  3. WAIT:    Poll child state.json + intercom signals
  4. INTEGRATE: All children ✅ → integration gates → report to parent

Leaf node (no children):
  1. PLAN:    Read .spec, write 3-5 implementation steps
  2. BUILD:   Write test → fail → implement → pass
  3. VERIFY:  agent-spec lifecycle + tdd-guard + npm test + self-review
  4. SUBMIT:  morphmap_submit_leaf({ evidence })
```

Branch agent context stays small: reads filtered submit outputs (~200B per leaf), never raw sessions. Leaf agent context stays focused: one .spec, one goal, one execution.

---

## 8. Dependencies

| Old (pi extensions) | New (one-map) | Why |
|---------------------|---------------|-----|
| pi-codex-goal | mech state machine | Status tracked in state.json, not session memory |
| pi-intercom (push) | state.json (pull) + intercom (signals) | Parent polls child state.json; intercom for completion signals |
| Agent files (branch-agent.md, leaf-worker.md) | Skill template + node metadata | Agent assembled from map, not fixed files |
| Agent self-summarizes mindmap | Compiler hook extracts from JSONL | Deterministic, no agent hallucination |

**What stays:**
- pi-subagents (context isolation — fresh context per agent)
- context-mode (MCP — knowledge retrieval)
- pi-intercom (completion signals between sessions)
- agent-spec, tdd-guard, bombadil, lonkero (Rust CLIs — agent-agnostic)
- state.json, plan.md, .spec (formats — agent-agnostic)
- markmap-cli (rendering)

**What's new:**
- Compiler hook (in morphmap-hooks.ts — extracts evidence from JSONL)
- `/morphmap-run` command (parallel autonomous execution)
- Unified Node type in state machine (replaces Leaf + BranchState)

---

## 9. Implementation Plan

### Phase D (NOW — wire mech into execution)

**Goal:** Connect the 180-test pure state machine to the execution loop.

1. **Restore mech-pi wiring layer** (`.morphmap/mech-pi/morphmap-tools.ts`, `morphmap-tools-pi.ts`, `morphmap-state.ts`)
   - `morphmap-state.ts`: loadState/saveState with atomic write (tmp→fsync→rename)
   - `morphmap-tools.ts`: orchestration (load→pure-handler→save)
   - `morphmap-tools-pi.ts`: TypeBox schemas + pi.registerTool wrappers

2. **Wire into morphmap-hooks.ts**
   - Import `registerMechTools` from `mech-pi/morphmap-tools-pi`
   - Call `registerMechTools(pi)` at extension load
   - Register 3 tools: `morphmap_submit_leaf`, `morphmap_approve_leaf`, `morphmap_integration_gate`

3. **Bootstrap state.json from mindmap**
   - Wire `seedFromMap()` (mech/seed.ts + mech-pi/morphmap-seed.ts) into `/morphmap-init` and `/morphmap-delegate`
   - Parse `## [module]`/`[feature]` branches → per-branch `state.json`
   - Write `state-index.json` mapping branchId → path

4. **Implement md↔json sync hook** (§2.7 Step A)
   - On mindmap write: parse markdown → validate → update state.json
   - On state.json change: regenerate mindmap.md from state.json

5. **Update agent prompts**
   - branch-agent.md: use `morphmap_approve_leaf` + `morphmap_integration_gate` (not just /goal)
   - leaf-worker.md: already calls `morphmap_submit_leaf` (tool will now be registered)
   - reviewer.md: feed evidence into `morphmap_approve_leaf`

### Phase one-map (NEXT — unify entities, add run loop)

1. **Unify Leaf/Branch → Node in types.ts**
   - Single `Node` type with `children: string[]` (empty = leaf)
   - `metadata` open object for domain-specific fields
   - Same state machine, same gates

2. **Add `/morphmap-run` command**
   - Spawn all ready `[module]`/`[feature]` branches in parallel (async: true)
   - Monitor via intercom + state.json polling
   - Loop: re-check for newly-ready branches after completions
   - Repeat until all branches ✅ or 🔴

3. **Add `--loop` flag to `/morphmap-delegate`**
   - After branch agents report completion, re-check for newly-ready branches
   - Re-spawn, repeat until no ready branches

4. **Add compiler hook**
   - Parse agent JSONL on `tool_result` events
   - Extract evidence (test results, build status, files changed)
   - Call mech state machine with structured evidence

5. **Map = session tree**
   - Store pi subagent session IDs in node metadata
   - Map shows running/paused/done sessions
   - Resume = reattach to session

---

## Design Decisions

- **One entity type** — no Leaf vs Branch distinction. Same state machine, same gates.
- **Open metadata** — required fields: id, status, children. Everything else optional, domain-specific.
- **Map = session** — mindmap IS the session tree. Session IDs in metadata link to pi subagent sessions.
- **Agent from map** — assembled at spawn from skill template + node metadata. No agent files.
- **Compiler, not summarizer** — deterministic extraction from JSONL. No agent writes summaries.
- **Pull coordination** — parent polls child state.json. intercom for completion signals only.
- **pi-subagents for isolation** — fresh context per agent. herdr deferred to Phase 3.
- **State machine enforces loop** — loop is agent prompt, state machine is gate lock.
- **Phase D first** — wiring the 180-test state machine is the highest-priority gap. Without it, completion is still trust-based.