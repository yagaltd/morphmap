# Future MorphMap — Mech State Machine Architecture

```mermaid
graph TB
    subgraph FRACTAL["Fractal Architecture — Same Loop at Every Depth"]
        D0["Depth 0: Orchestrator<br/>= branch-agent(root map)<br/>Research: scouts + researcher<br/>Grill: pi-interview (human)<br/>Plan: morphmap.mindmap.md"]
        D1["Depth 1: Branch Agent<br/>Research: ctx_search<br/>Grill: spec-reviewer (optional)<br/>Plan: plans/name.plan.md"]
        D2["Depth 2+: Sub-Branch Agent<br/>Research: ctx_search<br/>Grill: spec-reviewer (optional)<br/>Plan: parent subtree"]
        LEAF["Leaf Worker<br/>No research. No planning.<br/>Reads .spec + tests<br/>Executes only"]
        
        D0 -->|spawns| D1
        D1 -->|spawns| D2
        D2 -->|spawns| LEAF
        LEAF -->|reports to| D2
        D2 -->|reports to| D1
        D1 -->|reports to| D0
    end

    subgraph STATE["State Machine (mech/ pure module)"]
        ENTITIES["Entities: Leaf | Branch | Integration | DependencyGraph | Session"]
        GATES["Gates: preSpawn → submit → review → integration"]
        TOOLS["Transition Tools (pi-registered):<br/>morphmap_submit_leaf(evidence)<br/>morphmap_approve_leaf(evidence)<br/>morphmap_integration_gate(reviewFile)"]
        CONFIG["Config Tables: assignModel() | assignTools() | applyPosture()"]
    end

    subgraph QUALITY["Quality Pipeline (per [qa:] tag)"]
        NONE["[qa: none]<br/>self-verify → ✅"]
        REVIEW["[qa: review]<br/>+ reviewer mech re-verify"]
        FULL["[qa: full]<br/>+ quality-reviewer + bug-hunter"]
        STRICT["[qa: strict]<br/>+ spec-reviewer + test-writer<br/>+ test-reviewer + refactor pass"]
    end

    subgraph INTEGRATION["Integration Gate (post-merge)"]
        HEALTH["health check (curl)"]
        BOMBADIL["bombadil browser test"]
        LONKERO["lonkero security scan"]
        PASS["✅ branch complete"]
        FAIL["🔴 reopen affected leaves"]
    end

    subgraph RECOVERY["Persistence + Recovery"]
        STATEJSON[".morphmap/state.json<br/>written on every transition"]
        CRASH["Session crash → restart<br/>→ /morphmap-recover --auto<br/>→ read state.json<br/>→ resume from last ✅ leaf"]
        OVERRIDE["Human override:<br/>morphmap_force_approve(leafId, reason)<br/>→ audit log"]
        DISABLE["Rollback: mech.enabled: false<br/>or --no-mech flag"]
    end

    subgraph PIPELINE["Execution Flow"]
        S1["⬜ Leaf created<br/>preSpawn gates check"]
        S2["🔄 Leaf in progress<br/>worker executes"]
        S3["⏳ Leaf submitted<br/>submit gates check"]
        S4["⏳ Leaf in review<br/>review gates check"]
        S5["✅ Leaf approved<br/>state.json updated"]
        S6["🔴 Leaf failed<br/>retry or escalate"]
        
        S1 -->|gates pass| S2
        S2 -->|worker submits| S3
        S3 -->|gates pass| S4
        S4 -->|gates pass| S5
        S3 -->|gates fail| S6
        S4 -->|gates fail| S6
        S6 -->|fix + retry| S1
    end

    FRACTAL --> STATE
    STATE --> QUALITY
    QUALITY --> INTEGRATION
    INTEGRATION --> RECOVERY
    STATE --> PIPELINE
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| One agent (branch-agent.md) at every depth | No special orchestrator logic. Same system prompt, different scope. |
| Pure gates (mech/) + impure wiring (morphmap-hooks.ts) | Gates are testable in isolation. Hooks bind to pi lifecycle. |
| state.json as source of truth | Survives crashes. pi session memory is read-through cache. |
| Transition tools as pi-registered tools | Follows Trio pattern. TypeBox-validated. Visible to agents. |
| Backward compatible | Existing projects unchanged. mech.enabled: false = today's behavior. |
| Human override always available | morphmap_force_approve with audit log. Trust requires escape hatch. |

## File Structure

```
.morphmap/
  morphmap.mindmap.md          ← steering map (depth 0 plan)
  plans/<name>.plan.md         ← branch plans (depth 1+)
  specs/<leaf>.spec            ← contracts
  state.json                   ← runtime state (authoritative)
  config                       ← model profiles, tools, posture

  mech/                         ← PURE MODULE (zero pi imports)
    types.ts                   ← interfaces
    state.ts                   ← StateMachine<T>
    config.ts                  ← lookup tables
    gates/
      pre-spawn.ts             ← preSpawn gate chain
      submit.ts                ← submit gate chain
      review.ts                ← review gate chain
      integration.ts           ← integration gate chain
    lattice.ts                 ← compose all chains
    recovery.ts                ← error classifier, retry logic

.pi/
  agents/
    branch-agent.md            ← universal agent (every depth)
    leaf-worker.md             ← structured Plan→Build→Verify→Submit
    reviewer.md                ← mechanical + integration modes
    quality-reviewer.md        ← judgment review
    spec-reviewer.md           ← .spec atomicity review
    refactor-worker.md         ← post-code optimization
  extensions/
    morphmap-hooks.ts          ← IMPURE MODULE (pi wiring)
```

## Cost

~1750 lines TypeScript, ~9.5 hours. Pure module: ~900 lines. Impure: ~850 lines.
