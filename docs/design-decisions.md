---
title: MorphMap — Design Decisions
markmap:
  colorFreezeLevel: 2
  maxWidth: 300
---

---
type: design-decisions
topic: MorphMap-design
timestamp: 2026-07-19
tags: [decisions, audit-trail, design, brainstorming]
---

# MorphMap — Design Decisions (Audit Trail)

## Origin — Factory Mindmap Method
- Weekly round table with 12 managers, 150 workers
- Mindmap displayed on screen — everyone sees decisions
- Branches = short phrases, max 140 chars, links to details
- Each week reuse same mindmap to update status
- Participants set own tasks and targets — ownership driven
- Leader gives directive, process owners self-assign
- ETA, resources, and bottlenecks discussed each round
- Strategy: Replace AGILE — too verbose, too many prompts

## Core Concepts

### Push Phase (Planning)
- Human creates directive → agent decomposes into tree
- Root → branch → sub-branch → leaf (atomic task)
- Bottleneck tags assigned during planning: 🔴🟡🔵🟠⚪
- Risk identified BEFORE execution, not discovered after
- Output = `.mindmap.md` in markmap format
- Push stops when tree complete and approved

### Pull Phase (Execution)
- Branch agents autonomously pull leaves from subtree
- Pull order: 🔴 BLOCKING → 🟡 RISKY → 🔵 TIME_CONSUMING → ⚪ STANDARD
- Risky leaves built first — detonate early if they fail
- Standard leaves wait until risky ones pass
- Kanban signal via intercom: `leaf:done`, `branch:blocked`
- The `.mindmap.md` IS the kanban board

### Theory of Constraints Applied
- Identify constraint → 🔴/🟡 leaf that gates most downstream work
- Exploit → pull risky leaves first, never let them idle
- Subordinate → ⚪ leaves WAIT, don't overproduce
- Elevate → strongest model (xhigh), prototype, escalate to human
- Repeat → after constraint broken, find next one
- Drum = risk-priority pull order
- Buffer = scout/research runs ahead of risky build
- Rope = branch agent only pulls when dependencies met

## Architecture

### .mindmap.md Format
- Markmap-compatible markdown
- YAML frontmatter: title, colorFreezeLevel, maxWidth
- `#` root → `##` branch (module or phase) → `###` sub-branch → `####` sub-sub-branch → bullet leaf
- Leaves can exist at ANY level — a branch can have both leaves and sub-branches
- A sub-branch can have both leaves and sub-sub-branches. No artificial depth limit
- Recommended max depth: 4 levels (branch → sub → sub-sub → leaf). Deeper = planning smell
- ERP example: `## finance` → `### invoicing` → `#### payment-collection` → `- ⬜ Stripe integration`
- Branches declare scope: `## auth 🔄 — scope: authentication, login, OAuth, JWT, sessions`
- Branch header carries KPIs: `## auth 🔄 — ETA: Apr 22 · budget: $1.20/$3.00 · 4/7 leaves`
- Bullet leaves = atomic tasks → links to .spec files
- Status markers: ⬜ 🔄 ✅ ❌ 🔴
- Owner tags: `@worker-agent`, `@scout-agent`, `@human`
- Bottleneck tags inline: `[🔴 BLOCKING: reason]`
- Cross-branch dependency: `[needs: branch/leaf-path]`
- Source tracking: `[source: GitHub #132]` for triage audit
- Cost and duration appended after completion
- Special branches: `## decisions` (audit log, not work), `## staging`, `## production`

### File Size & Context Estimates
- Branch agent reads only its own subtree, not the whole map
- Typical branch: 4-8 sub-branches, 20-40 leaves → 50-120 lines (well under 500)
- Root .mindmap.md for large ERP (8 modules, 500 leaves): ~700 lines max
- Root Orchestrator reads only branch header lines (~15 lines) — not whole file
- Markmap renders the full tree; agents read with offset/limit for their subtree only
- Branch agent generates localized `./mindmap/<branch>.md` copy for context efficiency (~80 lines)
- Generated copies are disposable — branch agent updates root file on completion

### Root Orchestrator — Three Hats (One Agent)
- Same agent, three modes — same mindmap context, different triggers
- Hat 1: PLANNER — triggered by /mindmap-plan. Scout → decompose → propose tree → human approves
- Hat 2: INTAKE — triggered by /mindmap-amend. Classify incoming from human → route to branch agent
- Hat 3: TRIAGE — triggered by /mindmap-triage or CRON. Classify external (GitHub, email, chat) → route
- Root Orchestrator NEVER creates leaves directly — it routes to branch agents. Branch agents own leaf creation
- Separation: root = structural awareness + routing, branch = domain knowledge + execution

### Command Classification
- Human slash commands: `/mindmap` `/mindmap-plan` `/mindmap-review` `/mindmap-delegate` `/mindmap-amend` `/mindmap-triage` `/mindmap-status`
- Agent tools: `subagent()` `agent-spec lifecycle` `agent-spec guard` `intercom` `ctx_search` `ctx_index`
- Shared: `subagent()` for orchestration, `agent-spec plan-check` for validation
- Principle: human = directives and triage, agent = execution and verification

### Agent Roles — IT Job Mapping
- Root Orchestrator = Architect / Project Director — structure, routing, triage
- Branch Agent = Tech Lead / Engineering Manager — owns module delivery, creates leaves, manages workers
- Sub-branch Agent = Senior Dev — feature decomposition when >5 leaves needed
- Leaf Worker = Developer — implements against .spec, self-verifies
- Reviewer = QA Engineer — mechanical verification, 3-layer gate
- Quality Reviewer = Staff Engineer — judgment review, simplicity, security
- Triage Agent = same as Root Orchestrator (Hat 3), not a separate agent

### Agent Stack
- Orchestration layer: pi-subagents — spawn, parallel, chain, async, worktree, intercom
- Specialized agents: pi-workflows worker, scout, reviewer, quality-reviewer
- pi-workflows agents know .spec contracts, agent-spec lifecycle, BDD scenarios
- Branch agent = NEW agent type, strong model, high reasoning
- Branch agent uses pi-dynamic-workflows for decomposition (scout → propose tree)
- Branch agent decides: complex concern (>5 leaves) → sub-branch, else → leaves directly
- Branch agent OWNS leaf creation — Root Orchestrator only routes, never creates leaves
- Dynamic model/thinking per leaf based on bottleneck tag
- Fresh sessions for each branch to avoid context pollution

### Extension Strategy
- MorphMap = NEW pi extension (replaces coordination layer)
- pi-workflows stays installed — provides specialized agents + .spec contracts
- pi-subagents stays installed — provides orchestration (spawn, chain, intercom)
- pi-dynamic-workflows used by branch agent for decomposition fan-out
- Separation: pi-workflows = execution, MorphMap = coordination

### Quality Loop — Manufacturing Analogy
- agent-spec lifecycle = jig (guarantees correct position — mechanical, deterministic)
- agent-spec guard = CNC self-check (trusted output, boundary enforcement)
- Worker self-verify before reporting = CNC operator inspection
- Branch agent integration test = sub-assembly fit check (do leaves work together?)
- Root agent end-to-end smoke = full assembly test
- NO batch QC sampling — every leaf is verified, quality built in at each process
- Reviewers share results via .mindmap.md status update + intercom signal

### Version Roadmap
- v1 (prototype): mindmap format + commands + branch agent + intercom
- v2: jujutsu (jj) integration — experiment branches, undo, drop cleanly, merge conflicts
- v3: CognitiveOS node store — queryable task history, semantic search over decisions

## Execution Flow

### Cross-Branch Dependencies
- Declared at leaf level: `[needs: auth/jwt-middleware]`
- Branch agent skips blocked leaves, works on unblocked ones
- When dependency leaf completes → intercom broadcast `leaf:done`
- Downstream branch agent receives signal → unblocks → pulls leaf
- If ALL leaves blocked → report 🔴 BLOCKED to root via intercom

### Inter-Branch Communication — Three-Tier System

#### Tier 1: Pull (default, silent, always on)
- Every agent, before pulling a leaf: ctx_search("recent decisions <domain>")
- New decision found? → adjust leaf/spec to match. Not found? → proceed
- No broadcasts, no interruptions, no context pollution
- `## decisions` log + context_mode indexing IS the shared memory

#### Tier 2: Targeted Push (when decision affects others)
- Branch agent makes decision → builds reverse index from [needs:] → pushes only to affected branches
- Intercom payload: { type: "decision:cross-branch", id, summary, affected_leaves }
- Affected branch agent: receives push → ctx_search(id) for full context → patches impacted leaves
- Unaffected branches: nothing received, nothing processed
- Decision also logged: ## decisions + ctx_index for future pull-based discovery

#### Tier 3: Escalation Up (when blocked by decision needed)
- Leaf worker blocked → branch agent. Branch can decide? → decide, log, Tier-2 push to affected
- Branch cannot decide (cross-cutting) → intercom root: { type: "escalate", reason, options }
- Root Orchestrator can decide? → decide, log, push to affected branches
- Root cannot decide (product/scope/human choice) → flag root .mindmap.md: [🔴 ESCALATED: ...]
- Human sees during /mindmap-review → decides → Root Orchestrator broadcasts decision down
- Escalation stops at first level that can decide. Most stop at branch agent.

#### Inter-Branch Flag on Root Map
- Root .mindmap.md shows inter-branch flags under affected branch:
  `## auth 🔄 — [🟡 INTER-BRANCH: JWT→RS256, impacts auth-ui, mobile-auth]`
- Root Orchestrator reads only branch header lines, not leaf details
- ctx_search for full context when human asks for details

### Intercom Protocol — Message Types
- `leaf:done` — branch→branch (dependency unblock), branch→root (status update)
- `branch:blocked` — branch→root (all leaves blocked, needs intervention)
- `decision:cross-branch` — branch→branch (Tier 2 targeted push)
- `escalate` — branch→root (Tier 3, cannot decide locally)
- `new:leaf` — root→branch (triage routes incoming work)
- `leaf:pr` — root→branch (GitHub PR linked to existing leaf)
- `flag:drift` — branch→root (ETA or budget >20% off plan)
- `flag:inter-branch` — branch→root (cross-branch decision recorded on root map)
- All messages: minimal JSON { from, type, target, summary, id }
- Fire and forget, no polling. Fallback: ctx_search for pull-based discovery

### KPI Tracking Per Level
- Same 4 KPIs at every level — different granularity, same shape
- Status: ⬜🔄✅❌🔴 — lowest level determines parent. One ❌ → parent ❌
- Budget: leaf = single task cost; branch = sum of all leaves; root = total project
- ETA: leaf = task estimate; branch = latest leaf ETA + 20% buffer; root = latest branch ETA
- Inter-branch flags: leaf = [needs: path]; branch = received from intercom; root = aggregated
- Branch agent computes its KPIs by reading its subtree; root reads only branch header lines
- Drift >20% on budget or ETA → branch agent sends flag:drift to root
- Root .mindmap.md branch header example:
  `## auth 🔄 — ETA: Apr 22 (+2d drift) · budget: $1.20/$3.00 · 4/7 leaves · [🟡 INTER-BRANCH: JWT→RS256]`
- Leaf completion: cost + duration appended to leaf line: `- ✅ middleware → specs/auth/jwt.spec · $0.12 · 2min`
- Leaf worker: agent-spec lifecycle → guard → project checks
- Reviewer agent: mechanical verification (3-layer gate)
- Quality reviewer: judgment (P0-P3 rubric)
- Bug hunter: adversarial scan (optional, on code changes)
- Branch agent aggregates leaf results → reports to root
- Each branch has its own `/goal` for long-running focus

### Branch Agent Behavior
- Reads mindmap subtree, finds ⬜ leaves
- Checks `[needs:]` — skips if dependency not ✅
- Sorts eligible leaves by risk priority
- If no .spec exists → writes one (Intent, Decisions, Boundaries, Completion Criteria)
- Assigns model/reasoning/tools per leaf based on bottleneck tag (see Leaf Agent Assignment)
- Spawns leaf worker subagent with .spec contract
- On WORKER_BLOCKER → decides if resolvable → updates spec/tree → retries. If cross-cutting → escalates
- On completion: updates .mindmap.md, sends intercom signal, logs cost/duration
- On failure: retry, escalate, or mark ❌
- Repeats until branch done or all remaining leaves blocked
- Receives new:leaf signals from Root Orchestrator → creates leaf, generates spec, queues

### Branch Agent — Input & Output
- Input: localized .mindmap.md subtree (~80 lines, always in system prompt) + codebase context
- Input (resume): same + intercom queue (new leaves, decisions, unblocks)
- Output: decomposed tree (sub-branches + leaves) + .spec files for first wave
- Output (execution): completed leaves, updated status, drift flags, escalation
- Branch agent IS the writer of its map — knows state without re-reading
- External changes arrive as small intercom JSON, not full map rewrites
- Map re-read only on session resume after idle (rare)
- System prompt: role, rules, tools (~2000 tokens) + map subtree (~500 tokens) + current spec (~600 tokens)
- Agents are disposable. No capacity tracking. No fixed headcount.

### Leaf Agent — Model & Reasoning Assignment
- Branch agent assigns per leaf based on bottleneck tag. Configured once, applied per leaf
- Branch agent calls `subagent({ action: "models" })` at startup or uses config table
- ⚪ STANDARD → cheap model, low reasoning, standard tools. .spec is precise, worker follows
- 🟡 RISKY → medium model, medium-high reasoning, + ctx_search + ctx_fetch. May need research
- 🔴 BLOCKING → strongest model, xhigh reasoning, full tools. Must not fail, gates everything
- 🔵 TIME_CONSUMING → cheap model, medium reasoning, standard tools. Straightforward, don't burn budget
- 🟠 VERIFICATION_HEAVY → medium model, high reasoning, + bug-hunter. Extra verification budget
- Branch agent picks per leaf: `subagent({ agent: "worker", model: x, thinking: y, task: "..." })`

### WORKER_BLOCKER — Only Feedback Loop Needed
- Leaf worker hits issue → outputs structured WORKER_BLOCKER JSON
- Examples: spec wrong, task too big (should be sub-branch), missing dependency, unclear requirement
- Branch agent receives it → decides if it can resolve (update spec, restructure tree) → retries
- Branch cannot resolve (cross-cutting) → escalates to Root Orchestrator (Tier 3)
- Root cannot resolve → flag for human via /mindmap-review
- No separate advisor agent. The branch agent IS the advisor — writes spec, interprets blockers, adjusts
- Tree is living — branch agent restructures its subtree when a leaf proves too big or wrong

### Triage & Intake Flow
- Incoming work from human (/mindmap-amend), GitHub issues/PRs, email, chat
- Root Orchestrator classifies against mindmap scope declarations
- ctx_search over indexed .mindmap.md finds closest branch
- Confidence >0.8 → auto-route via intercom: { type: "new:leaf", leaf, source }
- Confidence <0.8 → flag for human: "New concern, no matching branch"
- PR with existing leaf reference → update leaf status to 🔄, link PR number
- Branch declarations carry scope tag: `## auth 🔄 — scope: authentication, login, OAuth, JWT, sessions`
- Decision log branch records all routing decisions for audit
- Triggers: /mindmap-amend (human intake), /mindmap-triage (CRON), webhook (v2)

### Development + Staging + Production Lifecycle
- Branches can be phases, not just modules: `## development`, `## staging`, `## production`
- Staging branch: deploy leaves, smoke tests, security scan
- Production branch: merge to main, DB migration, rollback plan
- Leaf ✅ in development → PR merged → staging leaf created → staging leaf ✅ → production leaf
- PR/issues are leaves or triggers for new leaves — not separate systems

### Company-Wide Applicability
- Same system, different templates per domain
- IT Dev: agent-spec BDD contracts, code worker agents
- Marketing: campaign brief contracts, content worker agents, A/B test verification
- Customer Service: SOP checklist contracts, human tasks, response-time tracking
- Operations: warehouse checklist, supplier lead-time tracking, compliance sign-off
- Finance: audit trail contracts, revenue forecast, cost analysis
- The mindmap doesn't care what the leaf IS — it tracks status, owner, dependencies, risk

## Project Plan (Root Map)

### format ⬜
Design .mindmap.md spec — markmap-compatible, status markers,
owner tags, bottleneck tags, cross-branch dependency syntax

### plan-command ⬜
/mindmap-plan — replaces /idea + /plan. Scout → decision tree →
grill → output tree instead of flat plan.md

### branch-agent ⬜
New agent type or adapted worker. Reads subtree, pulls with
priority, spawns leaf workers, updates mindmap, escalates blockers

### delegate-command ⬜
/mindmap-delegate [branch] — starts all ready branches or one
specific branch. Branch agents run autonomously

### intercom-protocol ⬜
Message format for branch↔root and branch↔branch coordination.
Leaf done, branch blocked, decision recorded

### review-command ⬜
/mindmap-review [branch] — fresh subagent walks subtree, flags
blockers, reports status. Human triages without context pollution

### render ⬜
markmap-cli integration. /mindmap → renders .mindmap.md to
interactive HTML. Status colors visible. Collapse/expand branches

### triage-command ⬜
/mindmap-triage — Root Orchestrator (Hat 3). Reads external input
(GitHub issues, PRs, emails), classifies against mindmap scope,
routes to branch agents, logs decisions. CRON or manual trigger

### amend-command ⬜
/mindmap-amend — Root Orchestrator (Hat 2). Human gives smaller
addition to existing structure. Classify → route to branch agent.
Branch agent creates leaf, generates spec, queues

## Open Questions

### Resolved
- Branch agent: ✅ new agent type, strong model, uses pi-dynamic-workflows for decomposition
- jj integration: ✅ deferred to v2 (prototype first with git)
- CognitiveOS: ✅ deferred to v3 (node store + semantic search)
- Quality loop: ✅ manufacturing analogy — process-level verification, branch integration test, no batch QC
- Merge conflicts: ✅ v1 manual (markdown headings = natural boundaries), v2 with jj merge
- Sub-branch depth: ✅ planning phase decision, grilled from human, rule: >5 leaves → sub-branch

### Still Open
- None at this level — all major decisions resolved for v1 prototype

### v1 Decisions (Resolved)

#### Branch Agent Threshold
- Scout outputs: fileCount, totalLines, crossCuttingConcerns, newDomain
- Rule: totalLines > 500 OR crossCuttingConcerns > 2 → sub-branch, else → leaves
- Fallback: if scout uncertain, spawn decomposer subagent for model judgment
- Thresholds tunable per project in `.morphmap/config`

#### Workflow Persistence
- v1: pi-dynamic-workflows ephemeral (in-memory) for decomposition
- Decomposition is one-shot (<30s), restart is cheap if it fails
- v2: switch to pi-subagents persistent parallel when modules exceed 10 files

#### Intercom Routing
- Branch agent builds reverse index at startup: parse .mindmap.md, map each leaf → who depends on it
- On leaf done → direct intercom to only branches that `[needs: ...]` that leaf
- Fallback if target unreachable: ctx_search("needs <leaf-path>") — pull instead of push
- No central registry, no broadcast noise

#### Human Approval Gates
- v1: Plan only. Human approves tree once at plan phase. Everything else autonomous
- Contracts auto-generated, execution auto, blockers surfaced via /mindmap-review
- Matches factory method: directive → owners self-manage → human triages exceptions
- v2 option: first leaf of each branch inspected by human before rest auto-execute

#### .mindmap.md Location
- Root `.mindmap.md` = canonical source of truth (kanban board, human view)
- Branch agents generate localized `./mindmap/<branch>.md` copies for context efficiency
- Generated copies are disposable — branch agent updates root file on completion
- v2: per-branch files as source of truth when branches are truly independent