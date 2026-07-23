# Task for morphmap/researcher

[Read from: /home/aurel/Documents/current/Morph/MorphMap/docs/mech-mindmap.md]

Apply 5-Why to SECTION 8 (Operations) of /home/aurel/Documents/current/Morph/MorphMap/docs/mech-mindmap.md

Drill into:
1. Session crash recovery via state.json — why state.json as recovery anchor? Why not git reflog?
2. Human override (force_approve) — why only depth 0? Why not delegated?
3. Rollback/disable (mech.enabled flag) — why additive gates? Why not toggle per gate?
4. Backward compatibility — why optional tags? Why not migration script?

For each: 5-Why chain, verdict, hidden assumptions.
Write to /tmp/mech-5why-section8.md

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