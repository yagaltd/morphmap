/**
 * hooks/failure-recovery.ts — post-tool hooks: error pattern matching + improve trigger.
 *
 * Extracted from morphmap-hooks.ts. Matches tool errors against known
 * failure patterns and auto-triggers /morphmap-improve on repeated failures.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getState, extractError, today } from "./helpers";

// ── Known failure patterns ────────────────────────────────────

const FAILURE_PATTERNS: Record<
  string,
  { pattern: RegExp; suggestion: string; severity: "retry" | "alternative" | "fix" }
> = {
  contextModeOverwrite: {
    pattern: /context.mode.*overwrite|ctx_execute.*blocked|FTS5.*locked/i,
    suggestion:
      "context-mode conflict. Retry with built-in tool (bash/read) or wait 2s for FTS5 lock release.",
    severity: "retry",
  },
  toolNotFound: {
    pattern: /command not found|not found|no such file/i,
    suggestion:
      "Tool not available. Update agent system prompt to remove or replace this tool reference.",
    severity: "fix",
  },
  permissionDenied: {
    pattern: /permission denied|EACCES|not allowed/i,
    suggestion:
      "Permission denied. Check file ownership or use a path inside the project.",
    severity: "alternative",
  },
  subagentTimeout: {
    pattern: /timeout|timed out|deadline exceeded/i,
    suggestion:
      "Subagent timeout. Increase timeoutMs or split the task into smaller leaves.",
    severity: "retry",
  },
  npmPackageMissing: {
    pattern: /npm.*not found|cannot find module|ENOENT.*node_modules/i,
    suggestion:
      "Missing npm package. Run 'npm install' or add to package.json dependencies.",
    severity: "fix",
  },
  gitConflict: {
    pattern: /merge conflict|CONFLICT|would be overwritten/i,
    suggestion:
      "Git conflict detected. Resolve manually or use worktree isolation for parallel branches.",
    severity: "alternative",
  },
};

export function registerFailureRecovery(pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    const state = getState(ctx);

    if (event.isError) {
      const errorMsg = extractError(event);
      const toolName = event.toolName;

      // Increment failure count
      const count = (state.failureCounts.get(toolName) || 0) + 1;
      state.failureCounts.set(toolName, count);

      // Match against known patterns
      let matchedPattern: string | null = null;
      for (const [key, pattern] of Object.entries(FAILURE_PATTERNS)) {
        if (pattern.pattern.test(errorMsg)) {
          matchedPattern = key;

          const notifyStyle =
            pattern.severity === "fix"
              ? "error"
              : pattern.severity === "alternative"
                ? "warning"
                : "info";

          pi.ui?.notify({
            title: `MorphMap: ${pattern.severity.toUpperCase()} — ${toolName} failure`,
            body: pattern.suggestion,
            style: notifyStyle,
          });

          break;
        }
      }

      // Auto-trigger improve on repeated failures (3+)
      const patternKey = `${toolName}:${matchedPattern ?? "unknown"}`;
      if (count >= 3 && !state.notifiedPatterns.has(patternKey)) {
        state.notifiedPatterns.add(patternKey);
        pi.ui?.notify({
          title: "MorphMap: repeated failure — improve loop recommended",
          body: `${toolName} failed ${count}x (pattern: ${matchedPattern ?? "unclassified"}).\nRun /morphmap-improve to find root cause and fix.`,
          style: "error",
        });
        try {
          const { execSync } = await import("node:child_process");
          const entry = `- ${today()}: [telemetry] improve-trigger: tool=${toolName} failures=${count} pattern=${matchedPattern ?? "unknown"}`;
          execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, {
            stdio: "pipe",
          });
        } catch {
          // Silent
        }
      }

      // Rich telemetry logging
      try {
        const { execSync } = await import("node:child_process");
        const shortError = errorMsg.replace(/\n/g, " ").slice(0, 150);
        const entry = `- ${today()}: [telemetry] tool-failure: tool=${toolName} attempt=${count} pattern=${matchedPattern ?? "unclassified"} error="${shortError}"`;
        execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, {
          stdio: "pipe",
        });
      } catch {
        // Silent
      }
    } else {
      // Reset failure count on success
      if (state.failureCounts.has(event.toolName)) {
        state.failureCounts.delete(event.toolName);
      }
    }
  });
}
