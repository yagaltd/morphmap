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
import { registerMechTools } from "../../.morphmap/mech-pi/morphmap-tools-pi";
import {
  registerSpecGuards,
  registerRenderPipeline,
  registerTelemetry,
  registerFailureRecovery,
  registerFileStructureGuard,
} from "./hooks";

export default function (pi: ExtensionAPI) {
  // Register the three deterministic transition tools (§2.5).
  registerMechTools(pi);

  // Layer 1+2: Pre-tool enforcement
  registerSpecGuards(pi);

  // Layer 1+2: Post-tool automation
  registerRenderPipeline(pi);
  registerTelemetry(pi);
  registerFileStructureGuard(pi);

  // Layer 3: Failure recovery + improve loop
  registerFailureRecovery(pi);
}
