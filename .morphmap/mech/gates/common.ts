/**
 * mech gates — shared result helpers.
 * Pure. No I/O. Every gate returns one of these.
 */
import type { GateResult } from "../types";

/** Gate passed. */
export const pass = (): GateResult => ({ pass: true });

/** Gate passed silently — not applicable / data absent. Distinct from pass()
 *  only by intent; both return pass:true so runGates treats them identically. */
export const skip = (): GateResult => ({ pass: true });

/** Hard failure — blocks the transition (severity "block"). */
export const fail = (reason: string): GateResult => ({
  pass: false,
  reason,
  severity: "block",
});

/** Soft failure — never blocks, accumulates as a warning (severity "warn"). */
export const warn = (reason: string): GateResult => ({
  pass: false,
  reason,
  severity: "warn",
});
