---
type: handoff
agent: morphmap/scout
id: scout-001
timestamp: 2026-07-20T15:00:00Z
version: 1
summary: Fractal (plasma-fractal) architecture recon and MorphMap comparison
source: /morphmap-explore fractal orchestration model
status: raw
tags: [recon, fractal, orchestration, comparison, tui, sqlite-telemetry]
---

# Recon: Fractal (plasma-fractal) — Hierarchical Agent Loops with Recursive Self-Organization

## Key Files

### Core Loop & Orchestration
1. `fractal/core/loop.py` (lines 1-3671) — `Loop` class: in-process iteration engine. Drives step sequence, budget/deadline policy, signal checks, terminal cascade. Runs inside node's tmux pane via `start.sh` → `fractal node _loop`. Key methods: `run()` (line 327), `_main_loop()` (line 820), `_iterate()` (line 1400), `_run_step()` (line 1600+), `_read_cost_caps()` (line 2599).
2. `fractal/core/node.py` (lines 1-4451) — `Node` class: lifecycle (init/start/finish/stop/kill/pause/resume), spawn limits, config, cost, record, sessions, time, files, plans, radio. One `Node` per git worktree branch. Key methods: `init()` (line 380), `start()` (line 1235), `finish()` (line 1642), `_check_caps()` (line 3277), `_enforce_spawn_limits()` (line 3233).
3. `fractal/core/agent.py` (lines 1-1420) — `Agent` base class + provider registry (`claude`, `codex`, `grok`, `opencode`, `omp`). `Invocation`, `StreamEvent`, `StreamParser`, `on_*` event hooks. Backends in `fractal/impl/`.
4. `fractal/core/record.py` (lines 1-700+) — `Record` class: row-accounting over SQLite. `run_start/end`, `iter_start/end`, `step_start/end`, `step_cost`, `step_session`, `step_pending/approve`, `event_start/end`, `signal_set/get/clear`, `close_open`. All transitions first-writer-wins via `ended_at IS NULL` guard.
5. `fractal/core/db.py` (lines 1-400+) — `Database` class: thin SQLite wrapper. WAL mode, `BEGIN IMMEDIATE` transactions, generic `read`/`write`/`update`/`merge`/`delete`. 30s busy timeout for fan-out contention.
6. `fractal/core/cost.py` (lines 1-405+) — `Cost` class: `remaining()` and `spent()` readers. Subtree-aware (chains `parent_run_id`). Run budget is subtree-shared with no reserved self-slice.
7. `fractal/core/worktree.py` (lines 1-500+) — `lock()` (fcntl.flock), `validate_name()`, `project_path()`, `exclude_update()`, `ensure_git_repo()`.
8. `fractal/core/plan.py` (lines 1-100+) — `Plans` class: plan files under `plans/`, named `{timestamp}-{run.iter}-{name}.md`.
9. `fractal/core/session.py` (lines 1-100+) — `Sessions` class: per-iteration agent→session-id map (`.session` JSON), transcript resolution.
10. `fractal/core/config.py` (lines 1-348+) — `Config` class: all node config keys, cap validation, `reconcile()` for config/registry drift healing.

### Schema & Node Machinery
11. `fractal/core/schema.sql` (lines 1-200+) — SQLite schema: `nodes`, `runs`, `iters`, `steps`, `events`, `signals`, `messages`, `archive`, `channels`, `subs`, `reacts`, `reads` + `activity` VIEW (UNION ALL of all start/end + events).
12. `fractal/_node/NODE.md` — Node charter: context paths, state fields, instructions, completion requirements, rules (completion, memory, communication, delegation, scope, deliverables, scratch, compute etiquette, immutable seed, loop backstops, budget wind-down, branches, project conventions).
13. `fractal/_node/steps/00-PREPARE.md` through `04-COMMIT.md` — Five seed steps: PREPARE (merge parent + children), PLAN (orient, decompose, write plan file), EXECUTE (do work, spawn children, test/lint), REVIEW (verify claims, update memory, post-mortem), COMMIT (finish signal + commit).
14. `fractal/_node/modes/` — Mode documents: `SYNC.md` (radio check before each step), `DETACHED.md` (no shared context), `META.md` (optimize another node's seed), `RESERVE.md` (wind-down under budget), `RESUME.md` (continue paused run), `CONTINUE.md` (clean worktree), `CHAT.md` (interactive one-shot).
15. `fractal/_node/scripts/{setup.sh, test.sh, lint.sh}` — Per-iteration hooks: setup (idempotent env), test (no-op default), lint (wiki lint + skills validation).

### TUI Dashboard
16. `fractal/tui/app.py` (lines 1-696+) — `FractalApp`: Textual app, four-pane grid (tree/radio/node/message), focus-ring navigation, poll loop, chat controller.
17. `fractal/tui/data.py` (lines 1-388+) — `TuiData`: read-only SQL readers, branch-keyed path resolution via batched `git worktree list`. No `Node` objects on read path.
18. `fractal/tui/snapshot.py` (lines 1-1190+) — `SnapshotBuilder`: per-branch section caches, immutable `Snapshot`, zero-query steady ticks (same object returned when nothing changed).
19. `fractal/tui/poller.py` (lines 1-95+) — `NodePoller`: mtime-based change detection over `.db`, `.db-wal`, `.status`, `config.json`. ~1ms per tick, no DB opens.
20. `fractal/tui/panes/{tree,radio,node,message}.py` — Pane modules: each owns interior, selection state, key handlers. Render purely from `Snapshot`.
21. `fractal/tui/fmt.py` (lines 1-291+) — `NODE_VERB` map, status glyphs, `cap_bar`, `clock`, `tree_lines`.

### Wiki Documentation
22. `wiki/architecture/{node_tree,database,worktrees,agent_providers,packages}.md` — Architecture reference.
23. `wiki/features/loop/{_index,accounting,commit_pipeline,plans,prompt_assembly,steps}.md` — Iteration loop specification.
24. `wiki/features/cost/{budgets,measurement,pricing,time_budgets}.md` — Cost budget specification.
25. `wiki/features/lifecycle/{_index,status_machine,commands,script_delegation}.md` — Status machine and lifecycle commands.
26. `wiki/features/spawning/{_index,tree_limits,slot_accounting}.md` — Child spawning and tree limits.
27. `wiki/features/tui/{_index,panes,polling,actions}.md` — TUI cockpit specification.

## Architecture

**Pattern**: Recursive self-organizing agent tree with continuous in-process loop.

**Entry point**: `fractal init` (user node) → `fractal node init <name>` (child spawn) → `fractal node start` (launches `Loop.run()` in tmux via `start.sh`) → `fractal open` (TUI dashboard).

**Data flow**: Init creates git worktree on `<parent>.<name>` branch, seeds `.fractal/<branch>/` with steps/modes/skills/scripts/config, registers in `nodes` table. Start launches `Loop.run()` in tmux. Loop discovers steps each iteration, runs SYNC pseudo-step before each, spawns agent via `Agent.spawn()`, parses stream via `StreamParser`, records cost/session, commits. Child spawning happens inside EXECUTE step — the agent calls `fractal node init` as a subprocess.

**Dependencies**: Git worktrees (one per node), tmux (one session per active node), SQLite WAL (one DB per tree), provider backends (claude/codex/grok/opencode/omp), Textual (TUI), plasma-wiki.

## Domain Terms
- **Node**: Agent bound to one git branch, one worktree, one data dir (`.fractal/<branch>/`). Root is passive "user node" (no loop, hosts central DB).
- **Loop**: In-process Python iteration engine (`loop.py`). Runs in tmux pane. Drives steps, budget/deadline, signals.
- **Step**: `NN-` prefixed markdown in `steps/`. Discovered fresh each iteration. One agent invocation per step. Frontmatter overrides: `requires_approval`, `agent`, `provider`, `model`, `effort`, `timeout`, `detached`.
- **Iteration**: One pass through all steps. Capped by `max_iters` (per-run).
- **Run**: One start-to-exit lifetime. Capped by `timeout` (wall) and `max_cost` (USD).
- **Mode**: Markdown injected into agent prompt. SYNC runs as pseudo-step before each step.
- **Radio**: SQLite-backed inter-node messaging (public/private/inbox/outbox channels, subscriptions, reactions, read receipts).
- **Unsettled**: `active`/`paused`/`idle` — statuses that occupy a spawn slot. Settled: `completed`/`stopped`/`exited`/`killed`.
- **Reserve**: Buffer below `max_cost` (default 10%) triggering wind-down mode.
- **Snapshot**: Immutable TUI view-model. Built off-thread, cached per-branch, same object when unchanged.

## Orchestration Model

**Child spawning**: Agent-driven, not orchestrator-driven. During EXECUTE, the agent calls `fractal node init <name>` as a subprocess. This resolves parent via `_NODE` env var, validates name/caps, acquires tree-wide `.worktrees` flock, checks pause latch, enforces live caps via `_enforce_spawn_limits()`, runs `init.sh` (creates worktree + seeds), calls `radio.init()`, registers in `nodes` table.

**Steps**: Five seed steps (PREPARE/PLAN/EXECUTE/REVIEW/COMMIT), discovered fresh each iteration from `steps/*.md`. SYNC pseudo-step runs before each. Frontmatter overrides per step. Approval gates via `requires_approval: true`.

**Iteration**: `_main_loop()` (loop.py:820) runs `while True:` until caps hit. Each iteration: discover steps → run setup.sh → for each step: check pause/finish/stop/budget → run step → commit check. Re-reads caps each iteration top for live retuning.

**Hard caps**:

| Cap | Config key | Scope | Enforcement |
|-----|-----------|-------|-------------|
| Iterations | `max_iters` | Per-run | Loop break at iteration top (loop.py:848) |
| Run timeout | `timeout` | Per-run | Wall clock deadline (loop.py:855) |
| Iteration timeout | `iter_timeout` | Per-iteration | Resets each pass (loop.py:868) |
| Step timeout | `step_timeout` | Per-step | Process group TERM+KILL (loop.py:289) |
| Max depth | `max_depth` | Tree-wide | Spawn-time, every ancestor (node.py:3300) |
| Max children | `max_children` | Per-parent | Spawn-time, direct parent (node.py:3292) |
| Max descendants | `max_descendants` | Tree-wide | Spawn-time, every ancestor (node.py:3312) |
| Max cost | `max_cost` | Per-run, subtree-shared | Between steps + boundary (loop.py:2780) |
| Max iter cost | `max_iter_cost` | Per-iteration | Before each step (loop.py:1304) |
| Max step cost | `max_step_cost` | Per-step | Agent budget flag or warn-only (loop.py:1619) |
| Reserve budget | `reserve_budget` | Per-run | Triggers RESERVE wind-down (loop.py:1312) |

Budget caps are **per-run** (drained budget is fresh on next run; `--continue --max-cost` required to re-arm). Run budget is **subtree-shared** (children's spend counts against parent's cap). Spawn-time enforcement checks every ancestor's config — no agent cooperation needed.

## Log/Trace: SQLite Database

**Schema** (schema.sql): 10 tables + 1 view. `nodes` (registry), `runs` (run rows with `parent_run_id` FK), `iters` (iteration rows), `steps` (step rows with `cost`/`approved`/`session`), `events` (point-in-time, 16 event types), `signals` (5 signal types: finish/stop/kill/pause/exit), `messages`/`archive`/`channels`/`subs`/`reacts`/`reads` (radio), `activity` VIEW (UNION ALL of all start/end + events).

**Key patterns**: First-writer-wins fenced updates (`ended_at IS NULL` guard in `_fenced()`). WAL mode with explicit checkpoint at DB init and loop exit. 30s busy timeout. Duration derived from timestamps (never stored). Cost derived from `SUM(steps.cost)`. Pause/resume events credit time back to deadlines. Unpriced marker on steps with session but no cost.

**TUI polling**: `NodePoller` watches mtimes of `.db`, `.db-wal`, `.status`, `config.json` — ~1ms per tick, no DB opens. `SnapshotBuilder` builds immutable `Snapshot` off-thread with per-branch section caches. Returns same object when nothing changed (zero-query steady ticks). `TuiData` resolves paths via batched `git worktree list`, no `Node` objects on read path.

## Comparison: Fractal vs MorphMap

### Orchestration Model

| Dimension | Fractal | MorphMap |
|-----------|---------|----------|
| **Trigger** | Continuous `while True` loop until caps. Agent self-decomposes during EXECUTE. | Explicit slash commands only (`/morphmap-plan`, `/morphmap-delegate`, etc.). No continuous spawning. |
| **Tree construction** | Recursive self-organization: nodes spawn children during execution. Tree grows to fit the problem. | Push-then-pull: root plans tree in mindmap → branch agents pull pre-written leaves. Tree fixed at plan time. |
| **Decomposition authority** | Each node's agent decides at PLAN time whether to spawn children. | Root Orchestrator writes the tree structure. Branch agents pull pre-written leaves. |
| **Communication** | Radio: SQLite-backed messaging (channels, subscriptions, reactions, read receipts). | pi-intercom: session-scoped, in-memory messages. |
| **Coordination** | Radio messages + NODE.md steering. Parent checks children every iteration. | intercom + mindmap status updates. Branch agent waits for all children ✅ before integration review. |

### State & Telemetry

| Dimension | Fractal | MorphMap |
|-----------|---------|----------|
| **State store** | SQLite (WAL), one DB per tree. 10 tables + activity view. | `.morphmap/mindmap.mindmap.md` (markdown kanban). No database. |
| **Telemetry** | Rich: cost per step/iter/run, duration, exit codes, agent/model/session, 16 event types, 5 signal types. | Minimal: status markers (⬜🔄✅❌🔴), cost/duration in KPI headers, `[telemetry]` entries in decisions log. |
| **Live dashboard** | TUI (`fractal open`): four-pane Textual app, mtime-polled, off-thread snapshot builder. | None. Status read from mindmap file. |
| **Crash recovery** | `_reconcile_status()`: heals crashed-but-active nodes via tmux probe. Resume adopts open run/iter. | Orphan detection: branch agent checks parent via intercom at startup, self-merges if orphaned. |
| **History persistence** | Append-only rows. Deleting a node removes registry rows + subscriptions; history persists. | Git history via mindmap file commits. |

### Quality & Verification

| Dimension | Fractal | MorphMap |
|-----------|---------|----------|
| **Contract** | `NODE.md` completion requirements. No formal spec format. | `.spec` files: Intent, Decisions, Boundaries, Completion Criteria. `agent-spec` CLI lifecycle verification. |
| **Quality gates** | `[qa:]` step frontmatter + `requires_approval` gates. No dedicated reviewer agents. | `[qa: none|review|full]` leaf tags. Deterministic state machine (Phase A-C). Mechanical reviewer → quality-reviewer → bug-hunter → integration-review. |
| **Test verification** | `test.sh`/`lint.sh` per node. Agent must invoke manually. | `agent-spec lifecycle` + `tdd-guard` (no skipped/assertionless tests). `bombadil`/`lonkero` for integration/security. |

### What Fractal Has That MorphMap Doesn't

1. **SQLite telemetry** (schema.sql:1-200) — Full execution accounting with cost attribution, duration tracking, 16 event types, 5 signal types, unified `activity` view. MorphMap has only status markers in markdown.
2. **TUI dashboard** (app.py:1-696, snapshot.py:1-1190, poller.py:1-95) — Live four-pane Textual app with mtime-polled snapshot building, crash display reconciliation, chat door, read-only session attach.
3. **Worktree-per-node persistence** — Each node gets its own git worktree on a dotted-branch name (`<parent>.<name>`). MorphMap creates/destroys worktrees per delegation.
4. **Step-based iteration** (loop.py:1400, _node/steps/) — 5-step sequence (PREPARE/PLAN/EXECUTE/REVIEW/COMMIT) with SYNC pseudo-step, frontmatter overrides, approval gates. MorphMap has no iteration — each leaf is one-shot.
5. **Budget wind-down** (loop.py:1304-1315, 2780-2855) — RESERVE mode, 10% reserve window, cascaded budget aborts, deliberate-vs-budget finish distinction (exit 0 for budget aborts). MorphMap has no cost tracking.
6. **Radio messaging** (radio.py, schema.sql messages/channels/subs/reacts/reads) — SQLite-backed with channels, subscriptions, reactions, read receipts, saved/archive. MorphMap uses pi-intercom (in-memory, session-scoped).
7. **Pause/resume with time crediting** (loop.py:1131-1330, _node/modes/RESUME.md) — Pause parks run with open rows, credits paused spans to deadlines. Resume adopts open run. MorphMap has no pause/resume.
8. **Mode documents** (_node/modes/) — SYNC/DETACHED/META/RESERVE/RESUME/CONTINUE/CHAT modes injected into agent prompts. MorphMap has no mode system.
9. **Agent provider seam** (agent.py:1-1420, impl/) — Pluggable backends with stream parsing, cost tracking, session management, transcript resolution. MorphMap hardcodes model selection via config.
10. **Mid-run retuning** (loop.py:944-950) — Config can be edited live; caps re-read at each iteration top and by budget probes. MorphMap has no runtime reconfiguration.

### What MorphMap Has That Fractal Doesn't

1. **Mindmap kanban** (morphmap.mindmap.md) — Human-readable, markmap-renderable, agent-parseable single source of truth. Fractal uses SQLite (not human-browsable without tooling).
2. **`.spec` contracts** (docs/format-spec.md) — Formal specification format with `agent-spec` CLI lifecycle verification. Fractal has only `NODE.md` (instructions + completion requirements).
3. **Deterministic state machine** (.morphmap/mech/) — Pure/impure split (Phase A-C implemented). Gates are pure functions, no I/O. First-writer-wins transitions. Fractal's loop is imperative Python with no formal state machine.
4. **Quality pipeline with multiple reviewer tiers** — Mechanical reviewer (cheap) → quality-reviewer (judgment) → bug-hunter (adversarial, 🔴/🟡 only) → integration-review. Fractal has no dedicated reviewer agents.
5. **OKF handoff files** — Versioned handoff format for scout/researcher/quality-reviewer outputs. Fractal has no handoff file convention.
6. **Explicit trigger model** — Root Orchestrator only acts on `/morphmap-*` slash commands. No continuous spawning. Fractal's loop runs continuously.
7. **Posture system** — `phase`/`compatibility`/`scope`/`quality`/`budget` cascades to all agents. Fractal has no posture concept.
8. **Bottleneck tags** — 🔴🟡🔵🟠⚪ tags drive model assignment. Fractal has no bottleneck tagging.
9. **tdd-guard** — Test trustworthiness verification. Fractal has no test quality gate.
10. **Cross-project telemetry** — `[telemetry]` entries in decisions log, machine-readable, anonymized. Fractal's telemetry is per-tree only.
11. **ADR support** — `[adr]` branch tag, ADR template, hook verifies referenced files exist. Fractal has no ADR system.
12. **Map write protocol** — Commit + render HTML after every map edit. Fractal has no auto-commit/render.

## Why MorphMap's Orchestrator Doesn't Fire Subagents Constantly

This is a **deliberate architectural decision**, not a limitation. The MorphMap Root Orchestrator is designed as a **Three-Hat Intake Router** (Planner/Intake/Triage), not a continuous loop driver.

### 1. Trigger-gated activation
The Orchestrator only acts on **explicit triggers** — slash commands (`/morphmap-plan`, `/morphmap-delegate`, `/morphmap-triage`, `/morphmap-amend`, `/morphmap-review`, `/morphmap-recover`, `/morphmap-improve`). It does NOT continuously poll, loop, or self-activate. This is by design:

- **Human-in-the-loop**: The Orchestrator is the human's interface to the agent system. It waits for human intent before acting. Prevents unauthorized autonomous action.
- **Cost control**: Continuous subagent spawning would burn budget without human oversight. Fractal can do this because each node has hard USD caps (`max_cost`, `max_iter_cost`, `max_step_cost`) armed at init. MorphMap has no cost caps — relies on human judgment.
- **Deterministic state**: MorphMap's state machine (Phase A-C, `.morphmap/mech/`) is pure and deterministic. The Orchestrator reads the mindmap, finds ready branches, delegates. No need to "loop" — the mindmap is the plan.

### 2. Fractal's continuous loop works because it has different constraints
Fractal's `Loop` class (loop.py:820) runs `while True:` until caps are hit. This works because:

- **Hard caps everywhere**: `max_iters`, `timeout`, `max_cost`, `max_depth`, `max_children`, `max_descendants` — all enforced at spawn time and iteration boundaries. The loop CANNOT run forever.
- **Per-run budget isolation**: Each run has its own `max_cost` cap. Budget-ended run requires explicit `--continue --max-cost` to re-arm.
- **Operator steering**: `pause`/`stop`/`kill`/`finish` signals checked before every step.
- **tmux isolation**: Each node runs in its own tmux session. TUI monitors all sessions. Runaway node can be killed without affecting others.

### 3. The fundamental difference: push vs. recursive self-organization
- **MorphMap**: Push model. Root Orchestrator pushes a pre-planned tree (mindmap) → branch agents pull leaves from that tree. Tree structure is fixed at plan time. No node can spawn children outside the planned tree.
- **Fractal**: Recursive self-organization. Nodes spawn children for separable subtasks during execution. Tree grows to fit the problem. A node's agent decides at PLAN time whether to decompose.

MorphMap's "no continuous spawning" is the consequence of its push model: the tree is already planned, so there's nothing to continuously discover. Fractal's continuous loop is the consequence of its recursive model: the tree is discovered during execution, so the loop must keep running to find and spawn children.

## Risks

### Fractal risks
- **loop.py is 3671 lines** (node.py is 4451 lines) — very large files, high complexity. `_iterate()` alone spans lines 1400-2340. Risk of bugs in complex budget/deadline/signal logic.
- **No formal spec contract**: NODE.md is instructions + completion requirements, but no `.spec` equivalent with Intent/Decisions/Boundaries/Completion Criteria. Quality depends on agent self-discipline.
- **No deterministic state machine**: The loop is imperative Python with complex branching. MorphMap's Phase A-C state machine (pure gates, first-writer-wins) is more robust against race conditions and crash recovery.
- **Agent-driven spawning**: Children spawned by the agent during EXECUTE, not by an orchestrator. Spawn decisions depend on agent judgment, not deterministic rules.
- **Single DB point of failure**: Central SQLite DB is the single source of truth. Corruption loses all tree state. WAL mode helps but doesn't eliminate risk.

### MorphMap risks
- **No cost tracking**: No USD cost caps. A runaway leaf-worker could consume unlimited budget. Fractal's `max_cost` caps prevent this.
- **No live dashboard**: Status read from mindmap file, which may be stale between updates.
- **No pause/resume**: Interrupted branch agent loses mid-iteration state (orphan recovery merges uncommitted work, but in-flight iteration state is lost).
- **No radio messaging**: pi-intercom is session-scoped, in-memory. Fractal's SQLite-backed radio persists messages across sessions.

## Start Here

1. **Read `fractal/core/loop.py`** (lines 1-300 for Loop class, 820-1130 for `_main_loop`, 1400-1550 for `_iterate`, 2599-2655 for `_read_cost_caps`) — the continuous loop engine.
2. **Read `fractal/core/node.py`** (lines 1235-1360 for `start`, 1642-1722 for `finish`, 3233-3375 for `_check_caps`/`_enforce_spawn_limits`) — lifecycle + spawn limit enforcement.
3. **Read `fractal/core/record.py`** (lines 1-200 for `Record` class, 200-400 for row methods, 400-700 for signals/events) — SQLite row accounting.
4. **Read `fractal/core/schema.sql`** — full schema with `activity` view.
5. **Read `fractal/tui/app.py`** (lines 1-250 for app shell, 251-696 for poll/tick/refresh) — TUI dashboard architecture.
6. **Read `wiki/features/loop/steps.md`** — step sequence specification.
7. **Read `wiki/features/cost/budgets.md`** — three-tier budget cap system.
8. **Read `wiki/features/spawning/tree_limits.md`** — spawn-time cap enforcement.
9. **Compare with MorphMap's `.morphmap/mech/`** (types.ts, state.ts, gates/) — the deterministic state machine Fractal lacks.
10. **Compare with MorphMap's `docs/execution-flow.md`** — the push-then-pull orchestration model.
