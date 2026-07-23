# Task for morphmap/researcher

[Read from: /home/aurel/Documents/current/Morph/MorphMap/docs/mech-mindmap.md]

Apply 5-Why to SECTION 2 (Architecture) of /home/aurel/Documents/current/Morph/MorphMap/docs/mech-mindmap.md

Drill into:
1. Pure/impure split — why is this the right abstraction? Why not monolith?
2. JSON source of truth — why state.json per branch? Why not one global state?
3. State machine entities (Leaf, Branch, etc.) — why these specific entities? Why not event-sourcing?
4. Gate chains (preSpawn, submit, review, integration) — why 4 chains? Why not 3 or 5?
5. Transition tools as pi-registered tools — why not hooks? Why follow Trio pattern?
6. Configuration table lookups — why pure functions? Why not agent chooses model?

For each: 5-Why chain, verdict (solid/weak/needs-decision), hidden assumptions.
Write to /tmp/mech-5why-section2.md

---
Update progress at: /home/aurel/Documents/current/Morph/MorphMap/.pi-subagents/artifacts/progress/cbd9c3b1/progress.md

## Acceptance Contract
Acceptance level: attested
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Return concrete findings with file paths and severity when applicable

Required evidence: review-findings, residual-risks

Finish with a fenced JSON block tagged `acceptance-report` in this shape:
Use empty arrays when no items apply; array fields contain strings unless object entries are shown.
`criteriaSatisfied[].status` must be exactly one of: satisfied, not-satisfied, not-applicable.
`commandsRun[].result` must be exactly one of: passed, failed, not-run.
`manualNotes` and `notes` are optional strings; an empty string means no note and does not satisfy `manual-notes` evidence.
```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "specific proof"
    }
  ],
  "changedFiles": [
    "src/file.ts"
  ],
  "testsAddedOrUpdated": [
    "test/file.test.ts"
  ],
  "commandsRun": [
    {
      "command": "command",
      "result": "passed",
      "summary": "short result"
    }
  ],
  "validationOutput": [
    "validation output or concise summary"
  ],
  "residualRisks": [
    "none"
  ],
  "noStagedFiles": true,
  "diffSummary": "short description of the diff",
  "reviewFindings": [
    "blocker: file.ts:12 - issue found, or no blockers"
  ],
  "manualNotes": "anything else the parent should know"
}
```