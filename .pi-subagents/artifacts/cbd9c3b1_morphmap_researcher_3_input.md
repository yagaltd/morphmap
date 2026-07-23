# Task for morphmap/researcher

[Read from: /home/aurel/Documents/current/Morph/MorphMap/docs/mech-mindmap.md]

Apply 5-Why to SECTION 5 (Brownfield Adaptation) of /home/aurel/Documents/current/Morph/MorphMap/docs/mech-mindmap.md

Drill into:
1. Discovery phase (codebase-graph) — why build graph at init? Why not on-demand?
2. Tree-sitter for codebase parsing — why tree-sitter? Why not git grep or regex?
3. Per-module codebase-graph files — why split? Why not one file with streaming?
4. Incremental graph updates after each leaf — why after? Why not continuous?
5. Audit command — why advisory only? Why not compulsory before greenfield changes?

For each: 5-Why chain, verdict, hidden assumptions.
Write to /tmp/mech-5why-section5.md

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