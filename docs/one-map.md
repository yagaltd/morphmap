# one-map — Unified MorphMap Architecture

type: plan
timestamp: 2026-07-22T12:00:00Z
version: 1
summary: Simplified architecture — one entity, one loop, one state machine. Map is session, fork is branch, agent assembled from map data.
tags: [architecture, simplification, unified]

---

## Intent

MorphMap's current design has separate entity types (Leaf vs Branch), separate agent files (branch-agent.md, leaf-worker.md, reviewer.md), separate session management (pi-subagents, intercom, goal extension, trio extension). This complexity came from building incrementally — each piece solved a problem, but the pieces don't cohere.

**one-map unifies: one entity type, one loop, one state machine.** The mindmap IS the session tree. The fork IS a branch. The agent IS assembled from map metadata. The compiler extracts evidence deterministically. herdr spawns panes. state.json coordinates them.

Four pi extensions removed. No subagents. No intercom. No goal. No trio.

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
    "priority": "immediate",
    "eta": "2026-07-30",
    "model": "deepseek-pro",
    "thinking": "high",
    "tools": ["agent-spec", "tdd-guard", "git"],
    "calendar_link": null,
    "budget": "$5.00"
  }
}
```

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | Yes | Unique path in tree |
| `status` | Yes | State machine transition target |
| `goal` | No | What this node should accomplish |
| `children` | Yes | Empty = leaf, non-empty = branch |
| `metadata` | No | Open object — any domain-specific fields |

Empty children = executable leaf. Non-empty children = branch that manages sub-nodes. Same state machine. Same loop. Same gates.

**One node serves: code leaves, marketing tasks, portfolio projects, SLA tracking, calendar events.** The compiler reads `id` + `status` + `children`. Everything else is domain metadata.

---

## 2. Map = Session Manager

The mindmap IS the session tree. Each branch = one herdr pane = one pi session.

```
portfolio map (depth -1)
│
├── ## morphmap 🔄 [pane: w1:p2]
│       └── pi session active — working on mech Phase C
│
├── ## explore-oauth 💤 [pane: w1:p3]
│       └── pi session paused — fork spawned, set aside
│
├── ## invoicing ⬜ [pane: —]
│       └── no session yet — not started
│
└── ## decisions ⬜ [log]
```

| Action | Mechanism |
|--------|-----------|
| Open project | Focus herdr pane → pi session resumes |
| Fork to new branch | New node → new herdr pane → new pi session |
| Set aside | Mark node 💤 → pane detached, state frozen |
| Resume | Mark node 🔄 → pane reattached, state restored |
| Zoom in | Focus pane → full terminal view |
| Zoom out | Portfolio map showing all active panes |

The map IS the session manager. No separate session database. No session ID lookup. The map shows what's running, what's paused, what's done.

---

## 3. Agent Defined by Map, Not Files

Agent assembled at spawn time from node metadata + skill template.

```
Node metadata:
  goal: "Implement JWT token refresh"
  model: deepseek-pro, thinking: high
  tools: [agent-spec, tdd-guard, git]
  priority: immediate

Skill template (universal):
  "You are a leaf worker. Follow Plan→Build→Verify→Submit.
   Read the .spec. Write tests first. Self-verify before submit."

Assembled agent:
  skill template + node metadata → system prompt
  No predefined agent file. Map IS the assignment.
```

Like human work: assign task, tools, deadline, worker. No permanent role file. The map defines what the agent IS for this task. Same skill template serves all leaf nodes. Same branch template serves all branch nodes.

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

Agent streams JSONL → hook extracts evidence → updates state.json. Deterministic. No agent summarization.

```
Agent works ──→ JSONL (raw stream, git-committed for audit)
                    │
Compiler (hook) ──→ extracts: status transitions, evidence, telemetry
                    │
                    ├──→ state.json (structured, authoritative)
                    └──→ plan.md (generated, human view)
                         └──→ mindmap.html (d3.js from state.json)
```

| Old (pi extensions) | New (compiler) |
|---------------------|----------------|
| `/goal` — agent marks objective complete | State machine advances status when evidence validates |
| `/trio` — agent self-reviews | Leaf worker prompt + submit gates = same pattern, enforced |
| Agent writes summary in mindmap | Compiler extracts from JSONL, writes state.json deterministically |

The compiler is the hook we already have. Phase D extends it. No new infrastructure.

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
  2. DISPATCH: For each child → herdr pane split → agent start → agent prompt
  3. WAIT:    Poll child state.json (pull, not push)
  4. INTEGRATE: All children ✅ → integration gates → report to parent

Leaf node (no children):
  1. PLAN:    Read .spec, write 3-5 implementation steps
  2. BUILD:   Write test → fail → implement → pass
  3. VERIFY:  agent-spec lifecycle + tdd-guard + npm test + self-review
  4. SUBMIT:  morphmap_submit_leaf({ evidence })
```

Branch agent context stays small: reads filtered submit outputs (~200B per leaf), never raw sessions. Leaf agent context stays focused: one .spec, one goal, one execution.

---

## 8. Dependencies Removed

| Old | New | Why |
|-----|-----|-----|
| pi-subagents | herdr pane split + agent start | Same context isolation, cleaner interface |
| pi-intercom | state.json (pull, not push) | Parent polls child state.json when ready to integrate |
| pi-codex-goal | mech state machine | Status tracked in state.json, not session memory |
| pi.registerTool | mech CLI | Agent-agnostic — same CLI for pi, codex, claude |

**What stays:**
- context-mode (MCP — knowledge retrieval, not orchestration)
- agent-spec, tdd-guard, bombadil, lonkero (Rust CLIs — agent-agnostic)
- state.json, plan.md, .spec (formats — agent-agnostic)
- markmap-cli (rendering)

**What's new:**
- herdr (Rust binary — terminal multiplexer + agent runtime, supports 21 agent kinds)
- mech CLI (transition tools — submit_leaf, approve_leaf, integration_gate)
- Compiler (hook — extracts evidence from JSONL, writes state.json)

---

## Transition Path

```
Phase A-C (now):    pi + morphmap-hooks + pi-subagents + context-mode
                    mech pure module built, tested in pi

Phase 3 (herdr):    herdr replaces pi-subagents + intercom
                    mech pure module still TypeScript, runs in pi panes
                    context-mode still needed

Phase 4 (one-map):  mech pure module → Rust
                    context-mode → SQLite FTS5 in Rust
                    morphmap-hooks → compiler in Rust
                    One entity type. One loop. One state machine.
```

---

## Design Decisions

- **One entity type** — no Leaf vs Branch distinction. Same state machine, same gates.
- **Open metadata** — required fields: id, status, children. Everything else optional, domain-specific.
- **Map = session** — mindmap IS the session tree. Fork = branch. Pane = herdr session.
- **Agent from map** — assembled at spawn from skill template + node metadata. No agent files.
- **Compiler, not summarizer** — deterministic extraction from JSONL. No agent writes summaries.
- **Pull coordination** — parent polls child state.json. No push messaging.
- **herdr as spawn layer** — replaces subagents + intercom. Keeps context isolation.
- **State machine enforces loop** — loop is agent prompt, state machine is gate lock.
