/**
 * hooks/spec-guard.ts — pre-tool hooks: spec enforcement + model guard.
 *
 * Extracted from morphmap-hooks.ts. Pure enforcement logic — no changelog/telemetry.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  getState,
  extractSpecPath,
  extractBottleneck,
} from "./helpers";

export function registerSpecGuards(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    const state = getState(ctx);
    state.turnCount++;

    // ── Git DEPRECATED: block destructive git, suggest jj ──
    if (event.toolName === "bash") {
      const cmd = (event.input?.command as string) || "";
      const blocked = [
        { pattern: /git add/, suggestion: "jj commit" },
        { pattern: /git commit/, suggestion: "jj commit -m '...'" },
        { pattern: /git merge/, suggestion: "jj rebase -d main && jj squash" },
        { pattern: /git stash/, suggestion: "(not needed — jj auto-tracks)" },
        { pattern: /git branch/, suggestion: "jj bookmark" },
        { pattern: /git checkout --/, suggestion: "jj abandon <change-id>" },
        { pattern: /git reset/, suggestion: "jj undo" },
        { pattern: /git worktree/, suggestion: "jj new + jj edit" },
      ];
      for (const b of blocked) {
        if (b.pattern.test(cmd)) {
          pi.ui?.notify({
            title: "MorphMap: git is DEPRECATED",
            body: `Use instead: ${b.suggestion}`,
            style: "warning",
          });
          if (/git commit|git add|git merge/.test(cmd)) {
            return {
              block: true,
              reason: `git is deprecated. Use jj: ${b.suggestion}`,
            };
          }
          break;
        }
      }
    }

    // ── Intercom audit: check if previous leaf completion was signaled ──
    if (state.pendingIntercomCheck) {
      if (event.toolName === "intercom" || event.toolName === "subagent_supervisor") {
        state.pendingIntercomCheck = false;
      } else if (state.turnCount - (state.lastLeafCompletion?.turn ?? 0) > 8) {
        try {
          const { execSync } = await import("node:child_process");
          const mapPath = ".morphmap/morphmap.mindmap.md";
          const mapContent = execSync(`cat "${mapPath}"`, {
            encoding: "utf8",
            stdio: "pipe",
          });
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

    // ── Block subagent spawn without .spec file ──
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

        // Model enforcement — only for leaf workers
        const model = event.input?.model as string | undefined;
        if (model && task) {
          const bottleneck = extractBottleneck(task);
          const isFlash = model.includes("flash");

          if (bottleneck === "🔴" && isFlash) {
            return {
              block: true,
              reason: `🔴 BLOCKING leaf spawned with ${model}. Config requires claude-sonnet-4 or equivalent.`,
            };
          }

          if (bottleneck === "🟡" && isFlash) {
            pi.ui?.notify({
              title: "MorphMap: model may be too weak",
              body: `🟡 RISKY leaf spawned with ${model}. Config suggests deepseek-v4-pro with high thinking. Consider respawning.`,
              style: "warning",
            });
          }
        }

        // Save token baseline for telemetry
        if (agent && agent.startsWith("morphmap/")) {
          state._preSpawnTokensIn = parseInt(
            process.env.PI_RUN_TOKENS_IN || "0",
            10
          );
          state._preSpawnTokensOut = parseInt(
            process.env.PI_RUN_TOKENS_OUT || "0",
            10
          );
          state._preSpawnCost = parseFloat(
            process.env.PI_RUN_ESTIMATED_COST || "0"
          );
          state._preSpawnAgent = agent;
          state._preSpawnTask = task || "";
        }
      }
    }

    // ── Warn on update_goal complete ──
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
}
