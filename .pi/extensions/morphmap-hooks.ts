/**
 * MorphMap Hooks — semi-mechanical process automation for pi.
 *
 * Three-layer enforcement for MorphMap conventions:
 *   Layer 1: Mechanical blocks (spec guard, path guard)
 *   Layer 2: Agent rules (execution loop, map write protocol)
 *   Layer 3: Improve loop (failure recovery, intercom audit, auto-improve trigger)
 *
 * Installed automatically with the MorphMap pi package via package.json.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ── Session state (survives across hook invocations) ──────────

interface SessionState {
  failureCounts: Map<string, number>;        // toolName → fail count
  lastLeafCompletion: { turn: number; leaf: string } | null;
  pendingIntercomCheck: boolean;
  turnCount: number;
  notifiedPatterns: Set<string>;             // avoid duplicate improve notifications
}

function getState(ctx: any): SessionState {
  if (!ctx._morphmapState) {
    ctx._morphmapState = {
      failureCounts: new Map(),
      lastLeafCompletion: null,
      pendingIntercomCheck: false,
      turnCount: 0,
      notifiedPatterns: new Set(),
    };
  }
  return ctx._morphmapState;
}

// ── Known failure patterns and recovery suggestions ───────────

const FAILURE_PATTERNS: Record<string, { pattern: RegExp; suggestion: string; severity: "retry" | "alternative" | "fix" }> = {
  contextModeOverwrite: {
    pattern: /context.mode.*overwrite|ctx_execute.*blocked|FTS5.*locked/i,
    suggestion: "context-mode conflict. Retry with built-in tool (bash/read) or wait 2s for FTS5 lock release.",
    severity: "retry",
  },
  toolNotFound: {
    pattern: /command not found|not found|no such file/i,
    suggestion: "Tool not available. Update agent system prompt to remove or replace this tool reference.",
    severity: "fix",
  },
  permissionDenied: {
    pattern: /permission denied|EACCES|not allowed/i,
    suggestion: "Permission denied. Check file ownership or use a path inside the project.",
    severity: "alternative",
  },
  subagentTimeout: {
    pattern: /timeout|timed out|deadline exceeded/i,
    suggestion: "Subagent timeout. Increase timeoutMs or split the task into smaller leaves.",
    severity: "retry",
  },
  npmPackageMissing: {
    pattern: /npm.*not found|cannot find module|ENOENT.*node_modules/i,
    suggestion: "Missing npm package. Run 'npm install' or add to package.json dependencies.",
    severity: "fix",
  },
  gitConflict: {
    pattern: /merge conflict|CONFLICT|would be overwritten/i,
    suggestion: "Git conflict detected. Resolve manually or use worktree isolation for parallel branches.",
    severity: "alternative",
  },
};

// ── MAIN ──────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {

  // ============================================================
  // PRE-TOOL HOOKS
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const state = getState(ctx);
    state.turnCount++;

    // ── Intercom audit (check if previous leaf completion was signaled) ──

    if (state.pendingIntercomCheck) {
      if (event.toolName === "intercom" || event.toolName === "subagent_supervisor") {
        state.pendingIntercomCheck = false;
      } else if (state.turnCount - (state.lastLeafCompletion?.turn ?? 0) > 8) {
        // 8 turns since leaf completion, no intercom sent
        try {
          const { execSync } = await import("node:child_process");
          const mapPath = ".morphmap/morphmap.mindmap.md";
          const mapContent = execSync(`cat "${mapPath}"`, { encoding: "utf8", stdio: "pipe" });
          
          // Check if map was updated (leaf status changed)
          const leaf = state.lastLeafCompletion?.leaf ?? "unknown";
          if (!mapContent.includes(leaf) || mapContent.includes(`⬜ ${leaf}`)) {
            pi.ui?.notify({
              title: "MorphMap: intercom may be missing",
              body: `Leaf '${leaf}' completed but map not updated and no intercom sent. Check step 7b in execution loop.`,
              style: "warning",
            });
          }
        } catch {
          // Silent
        }
        state.pendingIntercomCheck = false;
        state.lastLeafCompletion = null;
      }
    }

    // ── 1. Block subagent spawn without .spec file ────────────

    if (event.toolName === "subagent") {
      const agent = event.input?.agent as string | undefined;
      const task = event.input?.task as string | undefined;

      if (agent === "morphmap/leaf-worker" && task) {
        const specPath = extractSpecPath(task);
        if (specPath) {
          try {
            const fs = await import("node:fs/promises");
            await fs.access(specPath);
          } catch {
            pi.ui?.notify({
              title: "MorphMap: blocked leaf-worker",
              body: `.spec file missing: ${specPath}`,
              style: "warning",
            });
            return {
              block: true,
              reason: `.spec file not found: ${specPath}. Write the .spec before spawning leaf worker.`,
            };
          }
        }
      }
    }

    // ── 2. Warn on update_goal complete (gate reminder) ───────

    if (event.toolName === "update_goal") {
      const status = event.input?.status as string | undefined;
      if (status === "complete") {
        pi.ui?.notify({
          title: "MorphMap: goal completion",
          body: "Step 13: run goal completion gate before marking complete. Check: pending leaves, missing .specs, unresolved deps.",
          style: "info",
        });
      }
    }
  });

  // ============================================================
  // POST-TOOL HOOKS
  // ============================================================

  pi.on("tool_result", async (event, ctx) => {
    const state = getState(ctx);

    // ── 3. Auto-render + commit after map edit ─────────────────

    if (event.toolName === "write" || event.toolName === "edit") {
      const path = event.input?.path as string | undefined;
      if (path && isMindmapFile(path) && !event.isError) {
        try {
          const { execSync } = await import("node:child_process");
          
          execSync(
            "npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open",
            { stdio: "pipe", timeout: 15000 }
          );

          execSync("git add .morphmap/morphmap.mindmap.md .morphmap/morphmap.mindmap.html", {
            stdio: "pipe",
          });
          execSync(
            `git commit -m "map: auto-render after edit" --allow-empty`,
            { stdio: "pipe" }
          );

          pi.ui?.notify({
            title: "MorphMap: map rendered",
            body: "HTML regenerated and committed.",
            style: "success",
          });
        } catch {
          // Silent — don't block the agent on render failure
        }
      }
    }

    // ── 4. Intercom audit: track leaf completions ──────────────

    if (event.toolName === "subagent" && !event.isError) {
      const result = event.result as any;
      const agent = event.input?.agent as string | undefined;
      const task = event.input?.task as string | undefined;

      if (agent === "morphmap/leaf-worker" && result?.ok && task) {
        const leafName = extractLeafName(task);
        state.lastLeafCompletion = { turn: state.turnCount, leaf: leafName ?? "unknown" };
        state.pendingIntercomCheck = true;
      }
    }

    // ── 5. Failure recovery: detect known patterns ─────────────

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
          
          const notifyStyle = pattern.severity === "fix" ? "error" :
                              pattern.severity === "alternative" ? "warning" : "info";
          
          pi.ui?.notify({
            title: `MorphMap: ${pattern.severity.toUpperCase()} — ${toolName} failure`,
            body: pattern.suggestion,
            style: notifyStyle,
          });

          break; // Report first match only
        }
      }

      // ── 6. Auto-trigger improve on repeated failures ─────────

      const patternKey = `${toolName}:${matchedPattern ?? "unknown"}`;
      if (count >= 3 && !state.notifiedPatterns.has(patternKey)) {
        state.notifiedPatterns.add(patternKey);
        
        pi.ui?.notify({
          title: "MorphMap: repeated failure — improve loop recommended",
          body: `${toolName} failed ${count}x (pattern: ${matchedPattern ?? "unclassified"}).\nRun /morphmap-improve to find root cause and fix.\nConsider: edit agent system prompt, replace tool, or restructure task.`,
          style: "error",
        });

        // Log improve trigger to decisions
        try {
          const { execSync } = await import("node:child_process");
          const entry = `- ${today()}: [telemetry] improve-trigger: tool=${toolName} failures=${count} pattern=${matchedPattern ?? "unknown"}`;
          execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, { stdio: "pipe" });
        } catch {
          // Silent
        }
      }

      // ── 7. Rich telemetry logging ────────────────────────────

      try {
        const { execSync } = await import("node:child_process");
        const shortError = errorMsg.replace(/\n/g, " ").slice(0, 150);
        const entry = `- ${today()}: [telemetry] tool-failure: tool=${toolName} attempt=${count} pattern=${matchedPattern ?? "unclassified"} error="${shortError}"`;
        execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, { stdio: "pipe" });
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

// ── HELPERS ───────────────────────────────────────────────────

function isMindmapFile(path: string): boolean {
  return path.includes("morphmap.mindmap.md") || path.includes(".mindmap.md");
}

function extractSpecPath(task: string): string | null {
  const match = task.match(/\.spec\s+(\S+\.spec)/);
  return match ? match[1] : null;
}

function extractLeafName(task: string): string | null {
  // Task format: "Implement <leaf-name> against .spec <path>."
  const match = task.match(/^Implement\s+(.+?)\s+against/i);
  return match ? match[1].trim() : null;
}

function extractError(event: any): string {
  // Try multiple places where errors might be stored
  const result = event.result;
  if (typeof result === "string") return result;
  if (result?.error) return String(result.error);
  if (result?.stderr) return String(result.stderr);
  if (result?.message) return String(result.message);
  if (result === undefined || result === null) return "unknown error (no result)";
  return JSON.stringify(result).slice(0, 500);
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}
