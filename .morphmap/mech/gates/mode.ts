/**
 * mech gates — mode transition guard.
 * Validates agent mode changes. Some transitions require human approval.
 * Pure: no I/O. Uses MODE_TRANSITION matrix from types.
 *
 * Spec: AGENTS.md §Agent Mode, docs/one-map.md §9 (Phase one-map)
 */

import type { AgentMode, GateResult } from "../types";
import { MODE_TRANSITION } from "../types";
import { pass, fail } from "./common";

export interface ModeGateCtx {
  from: AgentMode;
  to: AgentMode;
}

export type ModeGate = {
  name: string;
  run(ctx: ModeGateCtx): GateResult;
};

/** Ensures the mode transition is legal per the transition matrix.
 *  research→plan requires intermediate step (research→brainstorm→plan).
 *  This gate only checks mechanical legality — not human approval. */
export const modeTransitionLegal: ModeGate = {
  name: "modeTransitionLegal",
  run(ctx) {
    if (ctx.from === ctx.to) return pass();

    const allowed = MODE_TRANSITION[ctx.from]?.[ctx.to];
    if (!allowed) {
      return fail(
        `mode transition not allowed: ${ctx.from} → ${ctx.to}. ` +
        `Allowed from ${ctx.from}: ${Object.entries(MODE_TRANSITION[ctx.from])
          .filter(([, ok]) => ok)
          .map(([m]) => m)
          .join(", ")}`
      );
    }

    return pass();
  },
};

/** Mode gate chain: all gates that must pass before mode switch. */
export const modeGates: ModeGate[] = [
  modeTransitionLegal,
];
