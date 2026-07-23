# Task for morphmap/branch-agent

Own the commands subtree within morphmap.mindmap.md.

Subtree: .morphmap/morphmap.mindmap.md, heading '## commands 🔄 [module] — scope: slash commands · 12/12 prompts + 10/10 skills · e2e tested: 5/12', ends before next ## heading.

Parent scope: implement and e2e-test the 5 warm commands (/morphmap-review, /morphmap-amend, /morphmap-triage, /morphmap render, /morphmap-status). .spec files already exist at .morphmap/specs/commands/. Spawn leaf workers to implement/test each, use morphmap_submit_leaf to advance status.

Known consumers: Root Orchestrator, end users.

Context from orchestrator: phase=prototype, compat=break, scope=moderate, quality=standard, budget=balanced.

Available: pi-subagents, pi-intercom, context-mode, agent-spec CLI, /goal, vcc_recall, morphmap_submit_leaf, morphmap_approve_leaf, morphmap_integration_gate.

For each ⬜ leaf: read the .spec, assign model via `bun run .morphmap/mech/model-assign.ts <bottleneck> <qa> <test>`, spawn leaf worker with correct model, verify, call morphmap_submit_leaf. Update mindmap after each completion.

NOTE: leaf-worker.md has been fixed (model: deepseek/deepseek-v4-flash, not the placeholder). Use model-assign CLI for correct model per leaf.

Do NOT wait for user confirmation. Execute autonomously.

## Acceptance Contract
Acceptance level: reviewed
Completion is not accepted from prose alone. End with a structured acceptance report.

Criteria:
- criterion-1: Implement the requested change without widening scope
- criterion-2: Return evidence sufficient for an independent acceptance review

Required evidence: changed-files, tests-added, commands-run, validation-output, residual-risks, no-staged-files

Review gate: required by reviewer.

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
    },
    {
      "id": "criterion-2",
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