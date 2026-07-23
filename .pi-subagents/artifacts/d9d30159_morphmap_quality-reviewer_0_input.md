# Task for morphmap/quality-reviewer

Review the mech Phase A pure module — the deterministic state machine core for MorphMap.

Files to review (all pure TypeScript, zero pi imports):
- .morphmap/mech/types.ts (240 LOC — interfaces, enums, emoji maps, emptyEvidence)
- .morphmap/mech/state.ts (337 LOC — StateMachine<S>, transitionLeaf, canStartLeaf, rollupChildState, evidenceHash)
- .morphmap/mech/config.ts (123 LOC — assignModel, assignTools, applyPosture)
- .morphmap/mech/index.ts (7 LOC — barrel)
- .morphmap/mech/state.test.ts (492 LOC — 49 tests, all passing)

Contract (read these as the spec — there is no .spec file yet):
- docs/mech-mindmap.md §2.3 (entities), §2.6 (config tables), §3.6 (dependency resolution needs vs needs-contract), §8.1 (idempotency)

This is a foundational module: every future gate (Phase B) and transition tool (Phase C) builds on it. Correctness of the state machine, idempotency, and dependency resolution is paramount — a bug here propagates everywhere.

Review for:
1. Correctness — any logic bugs in transitionLeaf idempotency, canStartLeaf dependency resolution, evidenceHash stability?
2. Simplicity — over-engineering? Anything that could be simpler?
3. Error handling — are failure modes covered? Any silent failures?
4. Surgical scope — anything outside Phase A's remit (types + state + config)?
5. Test coverage gaps — are the 49 tests missing important cases?

Write findings to .morphmap/quality-review-001-20260722-mech-phaseA.md with OKF frontmatter. Use P0 (blocking) / P1 (urgent) / P2 (normal) / P3 (nice-to-have) priorities. If APPROVED, say so plainly. Do not edit code — report only.

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