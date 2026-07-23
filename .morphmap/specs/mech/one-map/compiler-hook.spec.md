spec: task
name: "compiler-hook"
inherits: project
tags: [mech, one-map, compiler, hooks, typescript]
---

## Intent

Add a compiler hook to `morphmap-hooks.ts` that parses agent JSONL output on `tool_result` events and extracts structured evidence. This replaces agent self-reporting with deterministic evidence extraction.

When a leaf worker completes, the compiler parses the agent's JSONL session log to find:
- `agent-spec lifecycle` exit code → `agentSpecPassed`
- `tdd-guard lint` exit code → `tddGuardPassed`
- `npm test` exit code → `npmTestPassed`
- `npm run build` exit code → `npmBuildPassed`
- `git diff --name-only` output → `filesChanged`
- Test names from test output → `testsRun`

The extracted evidence is written to the leaf's entry in `state.json`.

## Decisions

- Hook fires on `tool_result` events where `toolName === "subagent"` and the subagent was a leaf-worker
- JSONL path: pi session log at `~/.pi/agent/sessions/.../run-0/session.jsonl`
- Parse tool calls and results from the JSONL to find test/build/spec outputs
- Evidence written to `state.json` → `leaves[leafId].evidence`
- If evidence is incomplete (e.g., no test output found), leave fields as-is (don't overwrite with defaults)
- Compiler is best-effort: if JSONL parsing fails, don't block the agent

## Boundaries

### Allowed Changes
- Edit `.pi/extensions/morphmap-hooks.ts` — add compiler hook in the `tool_result` handler
- Create `.morphmap/mech-pi/morphmap-compiler.ts` — pure parser for JSONL → evidence
- Create `.morphmap/mech-pi/morphmap-compiler.test.ts` — 8 tests for evidence extraction
- Do NOT modify `.morphmap/mech/` (pure module)
- Do NOT modify agent prompt files

### Forbidden
- Do NOT block agent execution on compiler failure
- Do NOT change the existing telemetry/logging hooks
- Do NOT change the existing auto-render/changelog hooks

## Completion Criteria

Scenario: Extract test results from JSONL
  Test:
    Package: morphmap-compiler
    Filter: test_results
  Given a JSONL with npm test output
  When parseTestResults is called
  Then it returns { npmTestPassed: true, testsRun: ["test1", "test2"] }

Scenario: Extract build results from JSONL
  Test:
    Package: morphmap-compiler
    Filter: build_results
  Given a JSONL with npm run build output
  When parseBuildResults is called
  Then it returns { npmBuildPassed: true }

Scenario: Extract agent-spec results from JSONL
  Test:
    Package: morphmap-compiler
    Filter: agent_spec_results
  Given a JSONL with agent-spec lifecycle output
  When parseAgentSpecResults is called
  Then it returns { agentSpecPassed: true }

Scenario: Extract files changed from JSONL
  Test:
    Package: morphmap-compiler
    Filter: files_changed
  Given a JSONL with git diff output
  When parseFilesChanged is called
  Then it returns { filesChanged: ["src/file1.ts", "src/file2.ts"] }

Scenario: Missing evidence in JSONL
  Test:
    Package: morphmap-compiler
    Filter: missing_evidence
  Given a JSONL with no test output
  When parseTestResults is called
  Then it returns { npmTestPassed: false, testsRun: [] }

Scenario: Compiler hook fires on leaf-worker completion
  Test:
    Package: morphmap-hooks
    Filter: hook_fires
  Given a subagent completion event for a leaf-worker
  When the tool_result hook fires
  Then it calls the compiler and updates state.json

Scenario: Compiler doesn't block on failure
  Test:
    Package: morphmap-hooks
    Filter: no_block
  Given a JSONL that can't be parsed
  When the compiler hook runs
  Then it logs a warning but doesn't block the agent

Scenario: Evidence written to state.json
  Test:
    Package: morphmap-hooks
    Filter: evidence_written
  Given a parsed evidence object
  When the compiler hook runs
  Then state.json is updated with evidence for the leaf

## Out of Scope

- Parsing non-leaf-worker subagent completions
- Real-time evidence streaming (batch after completion)
- Evidence for branch agents (only leaf workers)
