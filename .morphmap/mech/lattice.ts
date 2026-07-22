/**
 * mech — lattice: maps leaf transitions to the gate chain that must pass.
 *
 *   pending    → in_progress   : preSpawnGates   (morphmap spawn)
 *   in_progress→ submitted     : submitGates     (morphmap_submit_leaf)
 *   submitted  → in_review     : none            (branch agent pickup)
 *   in_review  → done          : reviewGates     (morphmap_approve_leaf)
 *   revision/block/unblock/escape : none         (process transitions)
 *
 * Spec §2.4 + §2.5. Branch-level integration uses runIntegrationGates
 * (gates/integration.ts), not this leaf-transition map.
 */
import type { Gate, LeafStatus, TransitionGateCtx } from "./types";
import { preSpawnGates } from "./gates/pre-spawn";
import { submitGates } from "./gates/submit";
import { reviewGates } from "./gates/review";

/** Returns the gate chain that gates a given leaf transition (empty = none). */
export function gatesForLeafTransition(
  from: LeafStatus,
  to: LeafStatus,
): Gate<TransitionGateCtx>[] {
  if (from === "pending" && to === "in_progress") return preSpawnGates;
  if (from === "in_progress" && to === "submitted") return submitGates;
  if (from === "submitted" && to === "in_review") return [];
  if (from === "in_review" && to === "done") return reviewGates;
  // revision loop, block/unblock, contract-revision escape hatch: no gates
  return [];
}

/** Full gate-chain registry for introspection / tooling. */
export const GATE_CHAINS = {
  preSpawn: preSpawnGates,
  submit: submitGates,
  review: reviewGates,
} as const;

/** Flatten every gate name across all leaf chains (for config.exclude_gates). */
export function allGateNames(): string[] {
  return [
    ...GATE_CHAINS.preSpawn.map((g) => g.name),
    ...GATE_CHAINS.submit.map((g) => g.name),
    ...GATE_CHAINS.review.map((g) => g.name),
  ];
}
