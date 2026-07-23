# Task for morphmap/scout

Verify the MorphMap codebase at /home/aurel/Documents/current/Morph/MorphMap against the intended design. The user's vision:

1. Human + Root Orchestrator establish project + initial map with first branches
2. Each branch agent creates its OWN plan/tree of sub-branches + leaves (.spec files)
3. Each branch is responsible for building its team of sub-branches (optional) and leaves
4. Execution runs in LOOPS — orchestrator routes user requests, /morphmap-delegate loops
5. Previously used /goal from pi-codex-goal, now uses own "mech scripts" inspired by /home/aurel/Documents/vibe/trio
6. Commands (/morphmap-review, /morphmap-amend) are for extra human control

Verify against the ACTUAL code:

A. Branch agent autonomy: Does branch-agent.md actually create its own plan/tree? Read .pi/agents/branch-agent.md — does it write .spec files, spawn sub-branch agents, spawn leaf workers? Does it loop (pull next leaf → build → verify → repeat)?

B. Delegate skill: Read skills/delegate/SKILL.md — does it loop? Does it re-spawn branch agents after completions? Does it use /goal or mech scripts?

C. Mech scripts: Check .morphmap/mech/ — are these the "mech scripts" the user refers to? Are they wired into the execution loop? Read morphmap-hooks.ts to see if they're actually called during execution.

D. Orchestrator routing: Does the Root Orchestrator (AGENTS.md) actually route user requests and delegate in a loop? Or does it only act on explicit commands?

E. The fractal comparison: Fractal has autonomous loops (PREPARE→PLAN→EXECUTE→REVIEW→COMMIT, repeat). Does MorphMap have an equivalent loop, or is it trigger-based (one-shot per command)?

F. Check: does the branch agent actually read a 'plan.md' from agent-spec, or does it write .spec files itself?

Read these files:
- .pi/agents/branch-agent.md (full)
- skills/delegate/SKILL.md (full)
- skills/plan/SKILL.md (full)
- .morphmap/mech/index.ts, .morphmap/mech/tools.ts
- .pi/extensions/morphmap-hooks.ts (check if mech tools are wired in)
- AGENTS.md (Root Orchestrator behavior)
- .pi/agents/leaf-worker.md (to see if it loops or is one-shot)

Output: structured verification — for each of A-F, state YES/NO/Partial with specific evidence (file:line). Then a verdict: does the implementation match the user's vision, or is there a gap?

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