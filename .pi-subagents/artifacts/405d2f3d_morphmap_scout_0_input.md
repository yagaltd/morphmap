# Task for morphmap/scout

Inspect ~/Documents/vibe/fractal/ — a Python project (plasma-fractal) described as "Hierarchical agent loops with recursive self-organization." 

Deep analysis needed:
1. Architecture: how does the Node/Loop/agent system work? Read fractal/core/loop.py, fractal/core/node.py, fractal/core/agent.py, fractal/core/record.py, fractal/core/db.py, fractal/core/plan.py, fractal/core/worktree.py, fractal/core/session.py, fractal/_node/NODE.md, fractal/_node/steps/, fractal/_node/modes/
2. Orchestration model: how does a node spawn child nodes? What are "steps"? How does iteration work? What are the hard caps (iterations, depth, children, cost, time)?
3. Log/trace: how does the SQLite database (schema.sql) record runs? What events are tracked? How does the TUI dashboard work?
4. Compare with MorphMap: MorphMap uses push (root plans tree) → pull (branch agents pull leaves from mindmap). Fractal uses recursive self-organization (nodes spawn children for separable subtasks). How do these differ? What does fractal have that MorphMap doesn't (SQLite telemetry, TUI, worktree-per-node, step-based iteration)? What does MorphMap have that fractal doesn't (mindmap kanban, .spec contracts, quality gates, OKF handoff files, deterministic state machine)?
5. The user asks: "why orchestrator doesn't fire constantly subagents or add to map discussions" — analyze MorphMap's design. The Root Orchestrator is THREE HATS (Planner/Intake/Triage) but only acts on explicit triggers (/morphmap-plan, /morphmap-amend, /morphmap-triage). It does NOT continuously spawn subagents. Why? Compare with fractal's continuous Loop that runs until budget/depth caps.

Write a structured comparison. Be specific about file paths and code patterns. Output ~800-1200 words.

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