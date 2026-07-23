# Task for morphmap/quality-reviewer

Review mech Phase B (gates) + Phase C (transition tools) — the deterministic enforcement layer for MorphMap. This is a batched review of two phases together.

Files to review (all pure TypeScript, zero pi imports):
- .morphmap/mech/gates/common.ts (shared pass/fail/warn/skip helpers)
- .morphmap/mech/gates/pre-spawn.ts (7 gates: specFileExists, specScenarioCount, specFileCount, specEstLOC[soft], modelAssigned, toolsAssigned, dependenciesResolvable)
- .morphmap/mech/gates/submit.ts (6 gates: agentSpecLifecycle, tddGuardPassed, npmTestAndBuild, boundariesClean, crossLeafNoConflict, filesMatchSpec)
- .morphmap/mech/gates/review.ts (6 gates: qualityReviewExists, P0Count=0, P1Count=0[qa:full], healthCheckPassed, bombadilPassed, lonkeroPassed)
- .morphmap/mech/gates/integration.ts (4 gates + runIntegrationGates: allLeavesSubmitted, crossLeafConflictsResolved, integrationReviewExists, integrationHealthCheckPassed)
- .morphmap/mech/lattice.ts (gatesForLeafTransition — maps transitions to gate chains)
- .morphmap/mech/tools.ts (submitLeaf/approveLeaf/integrationGate — pure handlers that select gates + call transitionLeaf/runIntegrationGates)

Tests: .morphmap/mech/gates.test.ts + .morphmap/mech/tools.test.ts — 113 tests total across the whole mech module, all passing.

Contract (read as the spec — no .spec file exists):
- docs/mech-mindmap.md §2.4 (gate chains), §2.5 (transition tools), §4.1 (QA tier table), §2.6 (config tables)

Context: Phase A (types.ts, state.ts, config.ts) was already reviewed and fixed (P1 spec divergence on needs-contract, P2 done-terminal). These Phase B+C files BUILD ON Phase A. The gates are the actual "done = proof" enforcement — a wrong gate propagates into every transition. The tools are the single enforcement point agents must go through.

Review for:
1. Correctness — any gate logic bugs? Does each gate faithfully implement §2.4/§4.1? Are the QA-tier conditionals right? Does the tool→gate wiring match the transition?
2. Completeness — any §2.4 gate missing or mis-specified? Any evidence field read incorrectly?
3. Tool/gate consistency — does submitLeaf wire submitGates to in_progress→submitted? Does approveLeaf wire reviewGates to in_review→done? Does integrationGate exercise the right checks?
4. Simplicity — over-engineering? Duplicated logic? (Note: Phase B already consolidated a divergent gate runner after Phase A review — check it stayed consolidated.)
5. Edge cases / silent failures — tool-absent skips (null evidence), missing context (no graph → skip), idempotent re-submit handling.
6. Test coverage gaps — anything important untested in gates.test.ts / tools.test.ts?

Write findings to .morphmap/quality-review-002-20260722-mech-phaseBC.md with OKF frontmatter. P0 (blocking) / P1 (urgent) / P2 (normal) / P3 (nice-to-have). If APPROVED, say so plainly. Do not edit code — report only.

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