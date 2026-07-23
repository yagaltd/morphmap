# Task for morphmap/scout

Recon a repo OUTSIDE the current project. Target: /home/aurel/Documents/current/CognitiveOS/v3 (and its crates/ folder). This is a Rust workspace the user describes as "RAG + memory + coding parsing + inference — a database that records events with time and hierarchy as a mindmap (not a DAG)."

Do NOT speculate. Read the actual code + manifests + docs. Report ONLY what's implemented and present, clearly separating implemented vs stub/aspirational.

Investigate and report:

1. **Workspace shape** — list crates in crates/ + the workspace Cargo.toml. For each crate: name, purpose (from lib.rs / README / comments), rough maturity (LOC, whether it has real logic or is a stub/skeleton), test presence.

2. **The three load-bearing claims** — for each, state IMPLEMENTED / PARTIAL / NOT-IMPLEMENTED with file evidence:
   a. Temporal event store: is there an event/log/store with timestamps + hierarchy (parent/child, not just a flat DAG)? Where (file paths)?
   b. Code parsing via tree-sitter: is tree-sitter actually wired (parsing .ts/.js/.rs/.php etc into nodes)? Or declared as a dependency but unused / planned?
   c. Hash-synced graph index (nodes + edges keyed by file hash, kept in sync with file changes): does this exist and work, or is it aspirational?

3. **"Forget vs compaction"** — is there any mechanism that prunes/forgets irrelevant nodes (the user claims it's "in the kaizen/improvement loop")? Find the actual code or conclude it's absent. Distinguish: automatic node-forgetting vs a human-in-loop improvement flow.

4. **What's usable TODAY vs aspirational** — concrete: which parts are real enough that another tool (a task-status enforcer called "mech") could query them now? Which are vapor?

5. **Inference / RAG** — is there a working retrieval/embedding path, or stubs?

Return a tight structured report: crate inventory (table), the 3 claims verdict (implemented/partial/no + evidence file), forget-mechanism verdict, and a one-paragraph "how real is the substrate today." Cite file paths for every claim. Do not edit anything — recon only.

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