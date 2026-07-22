# MorphMap Execution Flow — High Level

```
                               HUMAN
                                 │
                    writes .mindmap.md + runs /slash
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                       ROOT ORCHESTRATOR                         │
│                       (AGENTS.md)                               │
│   Routes intent → skill: plan / delegate / review / recover    │
└────────────────────────────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
         /morphmap-plan    /morphmap-delegate   /morphmap-recover
              │                  │                  │
              ▼                  │                  ▼
┌──────────────────────┐        │        ┌──────────────────────┐
│     PLAN PHASE        │        │        │    RECOVER PHASE      │
│                       │        │        │  Find orphans         │
│  Phase 0: budget      │        │        │  Merge work           │
│  Phase 1: explore     │        │        │  Prune branches       │
│  Phase 2: research    │        │        │  Clean worktrees      │
│  Phase 3: grill       │        │        └──────────────────────┘
│  Phase 4: tree        │        │
│                       │        │
│  Output: .mindmap.md  │        │
│  with branches +      │        │
│  .spec contracts      │        │
└───────────────────────┘        │
              │                  │
              └──────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────┐
│                     BRANCH AGENT (recursive)                    │
│                                                                 │
│  Reads map subtree. Two modes:                                  │
│                                                                 │
│  DECOMPOSER: has sub-branches (### headings)                    │
│    │── spawns sub-branch-agent ──→ (recursive, same logic)      │
│    │── spawns sub-branch-agent ──→ ...                          │
│    └── waits for all ✅ → integration review → report           │
│                                                                 │
│  LEAF MANAGER: has direct leaves                                │
│    │── pull next ⬜ leaf (risk-priority sort)                    │
│    │── write .spec if missing                                   │
│    │── assign model + tools from config tables                  │
│    │── spawn leaf-worker ──────────────────────┐                │
│    │── wait for submit                         │                │
│    │── run quality pipeline (if [qa:])         │                │
│    │── mark ✅ in map                          │                │
│    └── repeat until all leaves done            │                │
│                                                 │                │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │
                                                  ▼
┌────────────────────────────────────────────────────────────────┐
│                     LEAF WORKER                                  │
│                                                                 │
│  1. Read .spec contract                                         │
│  2. TDD: write test → see it fail → implement → see it pass     │
│  3. Build: write code, match Boundaries                         │
│  4. Self-verify (deterministic):                                │
│     ├── agent-spec lifecycle <spec> --code .                    │
│     ├── agent-spec guard (boundary check)                       │
│     ├── tdd-guard (test quality)                                │
│     └── npm test && npm run build                               │
│  5. Submit to branch-agent:                                     │
│     morphmap_submit_leaf({ specPassed, testsRun, filesChanged })│
└────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼ (back to branch agent)
┌────────────────────────────────────────────────────────────────┐
│                    QUALITY PIPELINE                              │
│                   (gated by [qa:] tag)                          │
│                                                                 │
│  [qa: none]  → leaf worker self-verify only → ✅                │
│                                                                 │
│  [qa: review] → reviewer (mechanical)                           │
│     Re-runs agent-spec lifecycle + tdd-guard + npm test         │
│                                                                 │
│  [qa: full] → reviewer + quality-reviewer + bug-hunter          │
│     Reviewer:   mechanical re-verify                            │
│     Quality:    judgment (security patterns, error handling)    │
│     Bug-hunter: adversarial fuzzing (if 🔴/🟡)                  │
│                                                                 │
│  Review gate: morphmap_approve_leaf({ P0Count, healthCheck })   │
└────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌────────────────────────────────────────────────────────────────┐
│                   INTEGRATION GATE                               │
│                 (after ALL leaves complete)                      │
│                                                                 │
│  quality=strict → FULL:                                         │
│    ├── npm test && npm run build                                │
│    ├── npm run dev → health check (curl)                        │
│    ├── bombadil browser test (if spec exists)                   │
│    └── lonkero scan (if installed)                              │
│                                                                 │
│  quality=fast → LITE:                                           │
│    └── health check (minimum)                                   │
│                                                                 │
│  quality=none → SKIP                                            │
│                                                                 │
│  Gate: morphmap_integration_gate({ reviewFile })                │
│  PASS → branch ✅     FAIL → reopen 🔴                          │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
mindmap.md ──→ branch-agent reads ──→ spawns workers ──→ .spec files
                                                              │
                                                    worker reads .spec
                                                              │
                                                    worker writes code
                                                              │
                                                    worker runs agent-spec
                                                              │
                                                    evidence → submit_leaf
                                                              │
                                              branch-agent checks gates
                                                              │
                                              reviewer writes review-*.md
                                                              │
                                              integration-review-*.md
                                                              │
                                              branch-agent updates map ✅
```

## Key Files

```
.morphmap/
  morphmap.mindmap.md          ← single source of truth
  config                        ← tools, profiles, posture
  state.json                    ← (mech) runtime state
  status.json                   ← (mech) cross-session sync
  specs/                        ← .spec contracts
  quality-review-*.md           ← judgment review output
  integration-review-*.md       ← post-merge gate output

.pi/
  agents/                       ← agent system prompts
  extensions/morphmap-hooks.ts  ← hooks + (mech) state machine

docs/
  format-spec.md                ← tag definitions
  mech-mindmap.md               ← state machine plan
```
