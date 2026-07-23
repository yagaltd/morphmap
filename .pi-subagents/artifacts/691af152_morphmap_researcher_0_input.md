# Task for morphmap/researcher

Apply 5-Why technique to SECTION 1 (Introduction) of this document:

/home/aurel/Documents/current/Morph/MorphMap/docs/mech-mindmap.md

Read the section. For each key claim, ask "Why?" up to 5 times to drill to root cause.

Claims to drill into:
1. "MorphMap currently trusts agents to enforce quality" → Why does trust fail? Why replace with code gates?
2. "The MorphShell experiment proved the trust model is broken" → Why did agents claim all tests passed? Why no one verified?
3. "mech replaces agent judgment with deterministic code gates" → Why TypeScript? Why not Rust? Why pure/impure split?
4. "JSON as machine-native source of truth and markdown as human presentation" → Why JSON? Why not keep markdown as source?
5. "~1750 lines of TypeScript across 6 implementation phases" → Why 6 phases? Why this order?

For each 5-Why chain, assess: does the reasoning hold? Is there a hidden assumption at any level?

Output format: for each claim, show the 5-Why chain, then verdict (solid / weak / needs-decision).

Focus on section 1 only. Write findings to /tmp/mech-5why-section1.md

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