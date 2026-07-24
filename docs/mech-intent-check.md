# mech-intent-check — Intent-Aware Contract Enforcement

type: plan
timestamp: 2026-07-23T12:00:00Z
version: 1
summary: Borrow ARIA's intent verification artifact chain to make .spec files intent-aware, content-addressed, and mechanically enforceable. Grill sessions become ambiguity resolution. Evidence becomes cryptographically bound to contracts. AGENTS.md filtering becomes mechanical.
tags: [intent, verification, contract, spec, grill, evidence, content-addressing]
references:
  - ARIA: https://github.com/picassio/ARIA (alpha.25, 192 deterministic gates)
  - one-map: docs/one-map.md
  - mech-mindmap: docs/mech-mindmap.md

---

## Problem

Current MorphMap .spec files describe WHAT to build. They do not declare:

- What must be true when done (required outcomes)
- What must never happen (forbidden outcomes)
- What effects are permitted (allowed effects)
- What evidence proves completion (acceptance criteria)
- What is still ambiguous (unresolved questions)

Agents can claim "done" without structured evidence. The orchestrator reviews the agent's self-assessment. The grill-for-unknowns pattern exists but is ad-hoc — no typed ambiguity records, no cryptographic chain linking intent to interpretation to evidence.

ARIA's **intent verification layer** (alpha.25) solves exactly this: 7 content-addressed artifacts forming a tamper-proof chain from human objective to verified execution. MorphMap already has 80% of the pieces — the missing 20% is the artifact schema and the deterministic linking.

---

## ARIA Reference

ARIA is an experimental programming language + runtime by picassio. Its core rule:

> **"Nothing executes merely because it was requested. It executes only after structure, identity, type, policy, capability, and artifact integrity have been verified."**

Three surfaces: Source Core (language), Verified Runtime (bytecode/VM), and **Intent Verification** (the layer we borrow from).

The intent verification bundle (`aria.intent-verification-bundle/0.9`) chains 7 content-addressed JSON artifacts:

```
intent → interpretation → approval → challenges → program → evidence → verdict
```

Each artifact is SHA-256 hashed. Each references prior hashes by identity. The verifier derives the verdict deterministically — it NEVER accepts a caller-supplied `intentSatisfied` Boolean.

192 deterministic gates enforce:
- No self-challenge (agent cannot review its own interpretation)
- No omitted obligations (all required outcomes must be addressed)
- No excess authority (forbidden outcomes block execution)
- No tampered identities (evidence must be bound to the exact program hash)
- Material ambiguity gates on human resolution (unresolved ambiguities block approval)

**Source:** `github.com/picassio/ARIA`, examples/intent/publish-verified-release.json, schemas/intent-*.schema.json, CHANGELOG.md §Intent Verification alpha.25.

---

## What MorphMap Already Has

| ARIA artifact | MorphMap equivalent | Status |
|--------------|-------------------|--------|
| intent.objective | Branch/leaf goal in mindmap | ✅ |
| intent.requiredOutcomes | .spec acceptance criteria | ⚠️ Implicit in prose, not typed |
| intent.forbiddenOutcomes | .spec boundaries section | ⚠️ Implicit |
| intent.allowedEffects | .spec scope section | ⚠️ Implicit |
| intent.ambiguities | Grill session output | ✅ Pattern exists (grill-for-unknowns skill) |
| interpretation | Branch agent writes .spec | ✅ Contract phase (§4.2) |
| approval | Orchestrator approves .spec | ✅ Human spot-check (§4.2) |
| challenges | spec-reviewer agent | ✅ Reviewer agent |
| program.outcomes | submit_leaf evidence | ✅ Designed (§4.3) |
| evidence | agent-spec lifecycle + tdd-guard | ✅ CLIs exist |
| content-addressed identity | Git commit SHA | ✅ |

**MorphMap has 80% of the pattern already.** The missing 20%: typed artifact schemas, content-addressed chain linking, and the verifier that derives verdicts mechanically instead of relying on agent self-assessment.

---

## Enhancement: Intent-Aware .spec

### New .spec Format

```yaml
# Current fields (preserved)
goal: Implement JWT token refresh endpoint
context: |
  The current token system lacks refresh capability...
scope: [src/auth/refresh.ts, tests/auth/refresh.test.ts]
boundaries: [Do not change login flow, Do not touch database schema]

# New: intent signature (borrowed from ARIA)
intent:
  required_outcomes:
    - id: tests.pass
      description: All unit and integration tests pass
      verify: "npm test -- auth/jwt-refresh"
    - id: spec.pass
      description: agent-spec lifecycle returns pass
      verify: "agent-spec lifecycle --code ."
    - id: build.pass
      description: TypeScript compilation succeeds
      verify: "npm run build"
  forbidden_outcomes:
    - id: database.write
      description: This is a read-only endpoint
    - id: existing.auth.broken
      description: Must not break login, logout, or registration
  allowed_effects:
    - file.write:src/auth/refresh.ts
    - file.write:tests/auth/refresh.test.ts
    - file.read:src/auth/*
  acceptance_evidence:
    - criterion_id: tests.pass
      kind: test-report
      command: "npm test -- auth/jwt-refresh"
    - criterion_id: spec.pass
      kind: agent-spec-lifecycle
      command: "agent-spec lifecycle --code ."
  ambiguities:
    - id: error-format
      question: "Should errors follow RFC 7807 Problem Details or our custom format?"
      resolution: null
    - id: token-storage
      question: "Store refresh token in httpOnly cookie or localStorage?"
      resolution: null
  require_independent_review: true
  require_critic_challenge: true     # [qa: strict] only
```

### Content-Addressed Artifact Chain

Every artifact gets a SHA-256 identity. The chain is immutable:

```
mindmap node: auth/jwt-refresh
  ↓
.spec written by branch agent → sha256:spec-A
  ↓ (references sha256:spec-A)
orchestrator approval → sha256:approval-B
  ↓ (references sha256:spec-A)
critic challenge → sha256:challenge-C
  ↓ (references sha256:approval-B + resolutions)
approved .spec (revised) → sha256:spec-D
  ↓ (references sha256:spec-D)
leaf worker submit_leaf → sha256:evidence-E
  ↓ (references sha256:spec-D + sha256:evidence-E)
verdict derived by compiler → sha256:verdict-F
```

Evidence is bound to the exact .spec hash it was implemented against. You cannot:
- Swap .spec after implementation and claim compliance
- Submit evidence from a different leaf to this one
- Tamper with evidence without changing its hash
- Claim `tests.pass=true` when `forbidden_outcomes[0]` was triggered

### submit_leaf Shapes to Evidence Schema

Current submit_leaf:
```json
{ "specPassed": true, "testsRun": 2, "buildPassed": true }
```

Enhanced submit_leaf (mapped to .spec intent):
```json
{
  "specId": "sha256:spec-D",
  "required_outcomes": [
    { "id": "tests.pass", "actual": true, "output_sha": "sha256:test-output" },
    { "id": "spec.pass", "actual": true, "output_sha": "sha256:spec-output" },
    { "id": "build.pass", "actual": true, "output_sha": "sha256:build-output" }
  ],
  "forbidden_outcomes_triggered": [],
  "evidence": [
    { "criterion_id": "tests.pass", "kind": "test-report", "digest": "sha256:test-report", "passed": true },
    { "criterion_id": "spec.pass", "kind": "agent-spec-lifecycle", "digest": "sha256:spec-report", "passed": true }
  ]
}
```

The compiler checks: required_outcomes all match? forbidden_outcomes_triggered is empty? Evidence is complete per acceptance_evidence? If any gap → verdict = rejected. Agent cannot override.

---

## Enhancement: Grill Sessions as Ambiguity Resolution

ARIA's independent challenge + ambiguity resolution process formalizes the grill-for-unknowns pattern:

```
1. Orchestrator captures dagim's request → writes intent JSON
2. Branch agent writes .spec (interpretation) → includes found ambiguities
3. Orchestrator spawns independent critic → critic writes challenges
   (ambiguities the branch agent missed, wrong assumptions, missing constraints)
4. Orchestrator detects:
   - Branch agent ambiguities: 2 unresolved
   - Critic challenges: 3 additional material ambiguities
   → Grill session fires: orchestrator asks dagim to resolve all 5
5. Dagim resolves each ambiguity → orchestrator writes approval with resolutions
6. Branch agent revises .spec with resolved ambiguities → new hash
7. Orchestrator approves revised .spec → execution proceeds
```

This IS `/morphmap-grill` but with typed, auditable ambiguity records. Not "I'm uncertain about error format." It's:

```json
{
  "id": "error-format",
  "question": "Should errors follow RFC 7807 Problem Details or our custom format?",
  "severity": "material",
  "discovered_by": "agent:branch-agent",
  "resolution": null
}
```

After grill:
```json
{
  "id": "error-format",
  "resolution": "RFC 7807 Problem Details",
  "resolved_by": "human:dagim",
  "resolved_at": "2026-07-23T14:30:00Z"
}
```

Ambiguities are not mistakes. They are signals that something needs clarification before code is written. Grill sessions resolve them BEFORE implementation, not during code review.

---

## Enhancement: Mechanical AGENTS.md Filtering

Current: "high value/high impact" → orchestrator judgment.

With intent signatures, the AGENTS.md filter is mechanical:

```yaml
# .morphmap/config/filters.yaml
routing_rules:
  - match:
      intent.forbidden_outcomes[*].id contains 'auth.broken'
    action: escalate_to_human
    reason: "Authentication changes require explicit approval"
  
  - match:
      intent.required_outcomes.length >= 4
    action: spawn_independent_critic
    reason: "Complex outcomes benefit from adversarial review"
  
  - match:
      intent.ambiguities.length >= 1 AND intent.ambiguities[*].resolution == null
    action: grill_before_dispatch
    reason: "Unresolved ambiguities must be settled before implementation"
  
  - match:
      intent.require_independent_review == true
    action: spawn_spec_reviewer
    reason: "Contract requested independent review"
  
  - match:
      intent.require_critic_challenge == true
    action: spawn_independent_critic
    reason: "Contract requested adversarial challenge"

qa_tier_routing:
  qa_none:    { intent_required: false, critic: false, evidence: none }
  qa_basic:   { intent_required: true, critic: false, evidence: [agent-spec] }
  qa_full:    { intent_required: true, critic: true, evidence: [agent-spec, tdd-guard] }
  qa_strict:  { intent_required: true, critic: true, evidence: [agent-spec, tdd-guard, bombadil], full_bundle: true }
```

No judgment. No "I think this is important." The filter matches intent fields → action fires. The decision is auditable. The reason is recorded.

---

## Implementation Path

### Phase D (current mech v0.1 scope)

| Step | What changes | File |
|------|-------------|------|
| 1 | Add intent, interpretation, approval, challenge schemas | `.morphmap/schemas/intent-verification.schema.json` |
| 2 | Extend .spec format with optional intent block | `docs/format-spec.md` |
| 3 | Add ambiguity resolution fields to grill skill | `skills/grill-for-unknowns/SKILL.md` |
| 4 | Extend submit_leaf to map evidence to .spec intent | mech pure module |
| 5 | Add SHA-256 hashing to compiler (content-address artifacts) | mech pure module |
| 6 | Add verdict derivation: required_outcomes all true? forbidden none? evidence complete? | mech pure module |
| 7 | Add mechanical filter rules to config | `.morphmap/config/filters.yaml` |

### Phase 4 (one-map)

Extract compiler to Rust. Content-addressing via `sha256` crate. Verdict derivation as a deterministic gate — no agent involvement.

---

## What We Do NOT Borrow

- **ARIA's language (glyphs, typed values, operators)** — MorphMap is not a programming language. We don't need a new syntax. The .spec is markdown. The intent is JSON. Both are universal.

- **ARIA's VM / bytecode / capability system** — MorphMap delegates execution to agent-spec, tdd-guard, bombadil. We don't need a new execution substrate. We need a verification chain on top of existing tools.

- **ARIA's glyph UI (Etherflow, Bufferflow, Signalflow)** — MorphMap's UI is the mindmap. The intent chain is visible as status + evidence on each leaf node.

---

## Why This Matters

The gap ARIA identified is real for MorphMap:

> "Code can be perfectly valid and still be wrong. The compiler only sees code. It does not see the original intent, why the change was requested, what effects are acceptable, or whether the final result still matches what the human approved."

MorphMap's branch agent writes .spec. Leaf worker implements. Reviewer reviews. But the chain from "what dagim wanted" to "what was implemented" has no cryptographic binding. The orchestrator reviews the agent's self-assessment. Evidence is not bound to a specific .spec identity. Ambiguities are resolved in chat, not recorded.

Intent-aware .spec + content-addressed artifact chain closes this gap:
- Dagim's intent is cryptographically hashed
- Branch agent's interpretation is bound to intent hash
- Approval is bound to interpretation hash
- Evidence is bound to program hash
- Verdict is derived, not claimed

The cost: adding typed intent fields to .spec (optional, scales with qa tier) and SHA-256 hashing in the compiler. The benefit: every leaf completion is auditable from human intent to verified execution.

---

## Design Decisions

- **Intent signature is optional** — `qa: none` leaves skip it entirely. `qa: strict` leaves include full 7-artifact bundle. The mechanism scales.
- **Content-addressing via SHA-256** — Same primitive as Git. No new cryptography. Git commits already give us the hash; we add semantic hashing of the JSON artifacts.
- **Verdict is derived, never claimed** — The compiler, not the agent, determines whether intent was satisfied. Agent submits evidence. Compiler matches evidence against required outcomes. No `intentSatisfied` Boolean in agent output.
- **Grill sessions produce typed ambiguity records** — Not ad-hoc uncertainty. Structured questions with severity, discoverer, and resolution. Audit trail of human decisions.
- **AGENTS.md filtering becomes mechanical** — Intent fields drive routing. No orchestrator judgment for "is this important?" The filter reads the intent and acts.
- **Evidence is bound to program identity** — submit_leaf references the exact .spec hash. Cannot swap evidence between implementations.
