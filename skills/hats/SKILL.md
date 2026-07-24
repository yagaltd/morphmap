---
name: morphmap-hats
description: Structured reasoning via 6 Thinking Hats. Containerize evaluation into facts → risks → benefits → alternatives → decision. Four contexts: eval, rca, brownfield, review.
user-invocable: true
argument-hint: "--context eval|rca|brownfield|review [subject]"
---

# Six Thinking Hats — Structured Reasoning

Containerize brainstorming into five agent hats + one human hat.
Each hat is a distinct mode of thinking. Hats are sequential — no mixing.

**Output goes to `## decisions` in the mindmap.** The map IS the record.
Optional `--file` flag writes a separate `.morphmap/hats-<context>-<date>.md`
for audit or handoff — but the default is a structured decision-log entry.

## Hat Definitions

### ⬜ White Hat — Facts, Data, What We Know

**Goal:** Gather all objective information. No opinions. No interpretations.

**How:** Spawn `morphmap/scout` (codebase) or `morphmap/researcher` (external docs).
Read existing `.spec` files, mindmap context, git log, state.db.

**Output:** Bullet list of facts. Every fact has a source reference.
Example:
```markdown
- 37 TypeScript files in src/ (tokei stats)
- Auth module uses JWT with 15-min expiry (src/auth/config.ts:12)
- 3 failing tests in payment module since last deploy (git log)
- API latency p99 = 240ms (datadog dashboard)
```

### 🟨 Yellow Hat — Benefits, Value, Upside

**Goal:** What does success look like? Best-case scenario. Why is this worth doing?

**How:** Agent reasoning. List every positive outcome, every stakeholder benefit.
No realism constraint — be optimistic.

**Output:** Value propositions with confidence levels.
```markdown
- Users get 3x faster checkout (high confidence — benchmarked)
- Dev team removes 400 lines of duplicate auth code (high confidence — measured)
- Zero-downtime deploy becomes possible (medium confidence — depends on DB migration)
```

### ⬛ Black Hat — Risks, Weaknesses, Caution

**Goal:** What can go wrong? Worst-case. What are the failure modes?

**How:** Spawn `grill-for-unknowns` skill. Add structured risk matrix.
Check: dependencies, edge cases, security, performance, breaking changes.

**Output:** Risk matrix with severity + likelihood + mitigation.
```markdown
| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| DB migration fails in production | 🔴 critical | medium | Rollback plan + dry-run on staging |
| JWT format changes break mobile clients | 🟡 high | high | Versioned API + deprecation window |
| Rate limiting false-positives | 🟢 low | low | Configurable threshold + monitoring |
```

### 🟩 Green Hat — Alternatives, Creativity

**Goal:** What other options exist? Can we solve this differently?
Reject the first answer. Generate at least 3 alternatives.

**How:** Agent reasoning. For each alternative: what changes? what stays?
Rate each: simpler? faster? cheaper? lower risk?

**Output:** Comparison table.
```markdown
| Approach | Simpler | Faster | Cheaper | Lower Risk | Verdict |
|----------|---------|--------|---------|------------|---------|
| A: Rewrite auth module | no | no | no | no | Rejected — too large scope |
| B: Wrap existing auth with adapter | yes | yes | yes | yes | ✅ Chosen |
| C: Add new auth alongside old, migrate gradually | maybe | no | no | yes | Fallback if B fails |
```

### 🔴 Red Hat — Gut Feel, Intuition (HUMAN ONLY)

**Goal:** What does the human feel about this? No justification needed.

**How:** `interview()` with one question. "What is your gut feeling about <subject>?"
Options: "feels right", "uneasy — can't explain", "something's missing", "go for it".

**Output:** Human's verbatim response. No agent interpretation. No follow-up.
```markdown
Human gut: "uneasy about the auth migration timing — feels rushed"
```

### 🟦 Blue Hat — Process, Meta-Control, Decision

**Goal:** Synthesize all hats into a decision. What is the verdict?

**How:** Agent reads all previous hat outputs. Checks for:
- White facts that contradict Yellow optimism
- Black risks that have no mitigation
- Green alternatives that everyone missed
- Red gut feel that should override logic

**Output:** Decision summary.
```markdown
## Verdict: GREEN — proceed with approach B

### Why
- White facts confirm auth module is well-tested (94% coverage)
- Yellow benefits are realistic: 3x faster, 400 lines removed
- Black risks are mitigated: rollback plan exists, versioned API
- Green alternative B is simplest, fastest, cheapest
- Red gut: human feels good about it

### Action
1. Write `.spec` files for approach B
2. Deploy to staging first, verify migration dry-run
3. Monitor p99 latency for 48h after production deploy
```

---

## Contexts

### 1. EVAL — Evaluate a Decision Before Executing

**Use when:** Branch agent is about to write `.spec` for a significant leaf.
**Agent:** branch-agent, leaf-worker, or orchestrator.
**Sequence:** White → Black → Yellow → Green → Red (human) → Blue

```
White:  "What do we know about this feature area?"
Black:  "What risks exist?" (spawn grill-for-unknowns)
Yellow: "What is the value if this works?"
Green:  "What alternatives did we consider?"
Red:    "Human, your gut check?" (interview)
Blue:   "Verdict: proceed / revise / reject"
```

### 2. RCA — Root Cause Analysis

**Use when:** Bug found, leaf failed multiple times, escalation triggered.
**Agent:** reviewer, orchestrator.
**Sequence:** White → Black → Green → Yellow → Blue

```
White:  "What happened? Timeline, error messages, affected systems."
Black:  "Why did it happen? Chain of causation. Don't stop at first answer."
Green:  "What are possible fixes? Generate 3+ options."
Yellow: "Which fix gives most value for least risk?"
Blue:   "Chosen fix + implementation plan."
```

### 3. BROWNFIELD — Adding Feature to Existing Codebase

**Use when:** `/morphmap-plan --branch` on an existing project with code.
**Agent:** branch-agent.
**Sequence:** White → Black → Green → Yellow → Red → Blue

```
White:  "What exists? Scout codebase, read existing .spec, check git history."
Black:  "What could break? Dependencies, API surface changes, DB schema."
Green:  "How could we add this? 3+ approaches with tradeoffs."
Yellow: "Which approach maximizes value while minimizing risk?"
Red:    "Human: does this direction feel right?"
Blue:   "Chosen approach + boundaries for .spec file."
```

### 4. REVIEW — Post-Leaf Assessment

**Use when:** Reviewer has completed mechanical verification, before approve_leaf.
**Agent:** reviewer.
**Sequence:** White → Yellow → Black → Green → Blue

```
White:  "What was actually delivered? Files changed, tests added, behavior modified."
Yellow: "What was done well? Clean code, good tests, edge cases handled."
Black:  "What are the issues? P0/P1 counts, risky patterns, uncovered paths."
Green:  "What should be improved? Refactoring suggestions, tech debt to address."
Blue:   "Verdict: approve / changes requested / reject."
```

---

## Integration Points

### With existing tools

| Hat | Uses |
|-----|------|
| White | `morphmap/scout`, `morphmap/researcher`, git log, state.db queries |
| Black | `grill-for-unknowns` skill, risk matrix template |
| Red | `interview()` with 1 question, 4 options, slight conviction |
| Blue | Agent reads all hat sections, outputs verdict |

### With mindmap

After hats session completes, write a structured entry to `## decisions`.
This is the DEFAULT output — no separate file unless `--file` is passed.

```markdown
### YYYY-MM-DD
- [hats:eval] <subject> · verdict: PROCEED
  - White: <N facts gathered — scout/researcher refs>
  - Yellow: <top benefit>
  - Black: <top risk, mitigated by X>
  - Green: <chosen approach> over <alternatives considered>
  - Red: <human gut verbatim>
  - .spec boundaries updated: <list>
```

Example:
```markdown
### 2026-07-24
- [hats:eval] JWT refresh token feature · verdict: PROCEED
  - White: 37 TS files, auth uses JWT 15-min expiry (scout-003-20260724-auth.md)
  - Yellow: 3x better session UX for mobile users
  - Black: mobile client breakage if JWT format changes — mitigated by versioned API
  - Green: adapter pattern over rewrite — simpler, 400 LOC saved
  - Red: "feels right but check mobile clients"
  - .spec boundaries updated: mobile API versioning, rollback plan
```

If `--file` flag: also write `.morphmap/hats-<context>-<YYYYMMDD>-<HHMMSS>.md`.
Link from decision entry: `→ .morphmap/hats-eval-20260724-150000.md`.

### With .spec files

When EVAL or BROWNFIELD produces a verdict of PROCEED:
- White facts → `.spec` Context section
- Black risks → `.spec` Boundaries + Dependencies
- Green alternatives → `.spec` Design Decisions
- Blue verdict → `.spec` Acceptance Criteria (what success looks like)

### With mech gates

- If Black hat finds risks with no mitigation → `ambiguitiesResolved` gate blocks spawn
- If Red hat = "uneasy" → branch agent escalates to orchestrator before proceeding
- If Blue hat = REJECT → leaf stays ⬜, decision logged, no worker spawned

---

## Rules

1. **One hat at a time.** Never blend hats. White facts don't include opinions.
2. **Red Hat is ALWAYS human.** Agent never evaluates Red. If human unavailable, skip Red (note: "Red hat skipped — human not available").
3. **Green Hat must generate 3+ alternatives.** First answer is rarely best.
4. **Blue Hat is the final step.** After Blue, no more hats for this subject.
5. **Output is always written.** Hat sessions are append-only records. Don't redo a hat that already exists for a subject.
6. **Time-box each hat.** 5 minutes max per hat (except White which uses scout spawn time). If stuck, note "time-box reached" and move to next hat.
7. **Hat refusal is valid.** If the agent cannot meaningfully contribute to a hat (e.g., no data for White), note the gap and move on. Don't fabricate.
