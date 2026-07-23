/**
 * morphmap-compiler.ts — JSONL evidence extractor (impure, bun-testable).
 *
 * Parses agent session JSONL to extract structured evidence for state.json.
 * Replaces agent self-reporting with deterministic extraction.
 *
 * Spec: docs/mech-mindmap.md §2.7 Step A, one-map.md §5.
 */
import type { LeafEvidence } from "../mech/types";

interface JsonlMessage {
  type: string;
  message?: {
    role: string;
    content?: Array<{
      type: string;
      text?: string;
      thinking?: string;
      name?: string;
      input?: Record<string, unknown>;
      content?: string;
      tool_use_id?: string;
    }>;
  };
}

/** Extract evidence from a pi session JSONL log. */
export function compileEvidence(jsonlContent: string): Partial<LeafEvidence> {
  const lines = jsonlContent.split("\n").filter((l) => l.trim());
  const messages: JsonlMessage[] = [];

  for (const line of lines) {
    try {
      messages.push(JSON.parse(line) as JsonlMessage);
    } catch {
      // skip non-JSON lines
    }
  }

  // Flatten all content blocks, tracking tool_use → tool_result pairs
  const toolResults: Record<string, string> = {}; // tool_use_id → result text
  const bashCommands: Array<{ input: string; result: string }> = [];

  for (const msg of messages) {
    if (!msg.message?.content) continue;
    for (const block of msg.message.content) {
      if (block.type === "tool_result" && block.tool_use_id) {
        toolResults[block.tool_use_id] = block.content || "";
      }
    }
  }

  // Find bash tool calls and their results
  for (const msg of messages) {
    if (!msg.message?.content) continue;
    for (const block of msg.message.content) {
      if (block.type === "tool_use" && block.name === "bash") {
        const input = block.input as Record<string, unknown> | undefined;
        const cmd = (input?.command as string) || "";
        const result = toolResults[block.tool_use_id || ""] || "";
        if (cmd && result) {
          bashCommands.push({ input: cmd, result });
        }
      }
    }
  }

  // Extract evidence from bash commands
  const evidence: Partial<LeafEvidence> = {
    specExists: true, // if we're compiling, the leaf was attempted
    specScenarioCount: 0,
    specFileCount: 0,
    agentSpecPassed: false,
    tddGuardPassed: null,
    npmTestPassed: false,
    npmBuildPassed: false,
    boundariesClean: true,
    filesChanged: [],
    testsRun: [],
    healthCheckPassed: null,
    bombadilPassed: null,
    lonkeroPassed: null,
    qualityReviewExists: false,
    qualityReviewP0Count: 0,
    qualityReviewP1Count: 0,
  };

  for (const { input: cmd, result } of bashCommands) {
    // agent-spec lifecycle
    if (cmd.includes("agent-spec lifecycle")) {
      // agent-spec output: "Quality: 100% ..." with "0 fail" = pass
      // "0 fail" means 0 failures (pass), "1 fail" means 1 failure (fail)
      const hasNonZeroFail = result.match(/[1-9]\d*\s+(fail|failed)/i);
      const hasQuality = result.includes("Quality:") || result.includes("100%");
      evidence.agentSpecPassed = !hasNonZeroFail && hasQuality;
    }

    // tdd-guard
    if (cmd.includes("tdd-guard")) {
      evidence.tddGuardPassed = !result.includes("FAIL") && !result.includes("fail");
    }

    // npm test
    if (cmd.match(/npm test\b/) || cmd.match(/npm run test\b/)) {
      evidence.npmTestPassed = result.includes("pass") || result.includes("PASS") || result.includes("passed");
      // Extract test names from output
      const testMatches = result.matchAll(/✓\s+(.+)/g);
      for (const m of testMatches) {
        evidence.testsRun!.push(m[1].trim());
      }
    }

    // npm run build
    if (cmd.match(/npm run build\b/)) {
      evidence.npmBuildPassed = result.includes("built") || result.includes("success") || result.includes("Built");
    }

    // git diff --name-only
    if (cmd.includes("git diff --name-only")) {
      const files = result
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
      evidence.filesChanged = [...new Set([...evidence.filesChanged!, ...files])];
    }
  }

  return evidence;
}

/** Parse a JSONL file from disk and extract evidence. */
export function compileEvidenceFromFile(jsonlPath: string): Partial<LeafEvidence> {
  const { readFileSync } = require("node:fs");
  const content = readFileSync(jsonlPath, "utf8");
  return compileEvidence(content);
}
