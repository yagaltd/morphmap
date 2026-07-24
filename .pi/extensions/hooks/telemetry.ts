/**
 * hooks/telemetry.ts — post-tool hooks: token/cost tracking + compiler hook.
 *
 * Extracted from morphmap-hooks.ts. Tracks morphmap agent completions
 * and extracts structured evidence from leaf-worker session JSONL.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getState, extractLeafName, extractTaskLabel, today } from "./helpers";

export function registerTelemetry(pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    const state = getState(ctx);

    if (event.toolName === "subagent" && !event.isError) {
      const result = event.result as any;
      const agent = event.input?.agent as string | undefined;
      const task = event.input?.task as string | undefined;
      const model = (event.input?.model as string) || "unknown";
      const thinking = (event.input?.thinking as string) || "off";

      // Intercom audit: track leaf completions
      if (agent === "morphmap/leaf-worker" && result?.ok && task) {
        const leafName = extractLeafName(task);
        state.lastLeafCompletion = {
          turn: state.turnCount,
          leaf: leafName ?? "unknown",
        };
        state.pendingIntercomCheck = true;
      }

      // Telemetry: token/cost delta for ALL morphmap agents
      if (agent && agent.startsWith("morphmap/") && result?.ok) {
        const agentName = agent.replace("morphmap/", "");
        const taskLabel = extractTaskLabel(task || "");
        const postTokensIn = parseInt(
          process.env.PI_RUN_TOKENS_IN || "0",
          10
        );
        const postTokensOut = parseInt(
          process.env.PI_RUN_TOKENS_OUT || "0",
          10
        );
        const postCost = parseFloat(
          process.env.PI_RUN_ESTIMATED_COST || "0"
        );
        const deltaIn = postTokensIn - (state._preSpawnTokensIn || 0);
        const deltaOut = postTokensOut - (state._preSpawnTokensOut || 0);
        const deltaCost = (
          postCost - (state._preSpawnCost || 0)
        ).toFixed(4);

        // Write session to SQLite
        try {
          const { recordSession } = await import(
            "../../../../.morphmap/mech-pi/morphmap-state"
          );
          const sessionUuid = result?.session || result?.asyncId || `unknown-${Date.now()}`;
          recordSession(".morphmap/state.db", {
            branchId: "root",
            sessionUuid,
            agentType: agentName,
            model,
            thinking,
            tokensIn: deltaIn,
            tokensOut: deltaOut,
            cost: parseFloat(deltaCost),
            status: "completed",
          });
        } catch {
          // DB not seeded yet — skip
        }

        try {
          const { execSync } = await import("node:child_process");
          const entry = `- ${today()}: [telemetry] agent-result: agent=morphmap/${agentName} task=${taskLabel} model=${model} thinking=${thinking} tokens-in=${deltaIn} tokens-out=${deltaOut} cost=$${deltaCost} result=✅`;
          execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, {
            stdio: "pipe",
          });
        } catch {
          // Silent
        }
      }

      // Compiler hook: extract evidence from leaf-worker JSONL
      if (agent === "morphmap/leaf-worker" && result?.ok) {
        try {
          const {
            compileEvidence,
          } = await import(
            "../../../../.morphmap/mech-pi/morphmap-compiler"
          );
          const { loadState, saveState } = await import(
            "../../../../.morphmap/mech-pi/morphmap-state"
          );
          const { readFileSync, existsSync } = await import("node:fs");

          const sessionPath =
            result?.session || result?.sessionPath || result?.asyncDir;
          if (sessionPath && existsSync(sessionPath)) {
            const jsonl = readFileSync(sessionPath, "utf8");
            const evidence = compileEvidence(jsonl);

            const statePath = ".morphmap/state.db";
            const branchState = loadState(statePath);
            if (branchState && branchState.leaves) {
              const leafName = extractLeafName(result?.output || "");
              if (leafName && branchState.leaves[leafName]) {
                branchState.leaves[leafName].evidence = {
                  ...branchState.leaves[leafName].evidence,
                  ...evidence,
                };
                saveState(statePath, branchState);
              }
            }
          }
        } catch {
          // Silent — compiler is best-effort
        }
      }
    }
  });
}
