/**
 * MorphMap Hooks — semi-mechanical process automation for pi.
 *
 * Three-layer enforcement for MorphMap conventions:
 *   Layer 1: Mechanical blocks (spec guard, path guard)
 *   Layer 2: Agent rules (execution loop, map write protocol)
 *   Layer 3: Improve loop (failure recovery, intercom audit, auto-improve trigger)
 *
 * Installed automatically with the MorphMap pi package via package.json.
 *
 * Module structure (each hook type in its own file under hooks/):
 *   hooks/spec-guard.ts        — pre-tool: .spec enforcement, model guard, goal reminders
 *   hooks/render-pipeline.ts   — post-tool: auto-render HTML, CHANGELOG, state.json sync
 *   hooks/telemetry.ts         — post-tool: token/cost tracking, compiler hook
 *   hooks/failure-recovery.ts  — post-tool: error pattern matching, improve trigger
 *   hooks/helpers.ts           — shared utilities (extractors, session state)
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  registerSpecGuards,
} from "./hooks/spec-guard";
import {
  registerRenderPipeline,
} from "./hooks/render-pipeline";
import {
  registerTelemetry,
} from "./hooks/telemetry";
import {
  registerFailureRecovery,
} from "./hooks/failure-recovery";
import {
  registerFileStructureGuard,
} from "./hooks/file-structure-guard";

let _mechRegistered = false;

export default function (pi: ExtensionAPI) {
  // Lazy-register mech tools to avoid bun:sqlite dependency at extension load time.
  // The static import chain (morphmap-tools-pi → morphmap-tools → morphmap-state →
  // morphmap-db → bun:sqlite) breaks when pi loads the extension in contexts
  // without bun's SQLite (e.g., reviewer subagent). Deferred to first tool call.
  if (!_mechRegistered) {
    pi.on("tool_call", async () => {
      if (_mechRegistered) return;
      try {
        const { registerMechTools } = await import(
          "../../.morphmap/mech-pi/morphmap-tools-pi"
        );
        registerMechTools(pi);
        _mechRegistered = true;
      } catch {
        // SQLite not available in this runtime — mech tools unavailable.
        // The extension continues without them (hooks still work).
        _mechRegistered = true;
      }
    });
  }

  // Layer 1+2: Pre-tool enforcement
  registerSpecGuards(pi);

  // Layer 1+2: Post-tool automation
  registerRenderPipeline(pi);
  registerTelemetry(pi);
  registerFileStructureGuard(pi);

  // Layer 3: Failure recovery + improve loop
  registerFailureRecovery(pi);
}
