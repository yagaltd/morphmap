/**
 * mech gates — review (reviewer → branch agent, on approve_leaf).
 * Spec §2.4 reviewGates. Proves the work was reviewed, not just done.
 * QA-tier conditional: P1 enforced only at [qa: full|strict] (§4.1).
 */
import type { Gate, LeafEvidence, TransitionGateCtx } from "../types";
import { fail, pass, skip } from "./common";

export const qualityReviewExists: Gate<TransitionGateCtx> = {
  name: "qualityReviewExists",
  run: ({ evidence }) =>
    evidence.qualityReviewExists
      ? pass()
      : fail("no quality-review file for leaf"),
};

export const p0CountZero: Gate<TransitionGateCtx> = {
  name: "P0Count=0",
  run: ({ evidence }) =>
    evidence.qualityReviewP0Count === 0
      ? pass()
      : fail(`${evidence.qualityReviewP0Count} unresolved P0 finding(s)`),
};

// P1 enforced only at [qa: full] or [qa: strict] (§4.1 tier table).
export const p1CountZeroIfFull: Gate<TransitionGateCtx> = {
  name: "P1Count=0",
  run: ({ leaf, evidence }) => {
    if (leaf.qa !== "full" && leaf.qa !== "strict") return skip();
    return evidence.qualityReviewP1Count === 0
      ? pass()
      : fail(
          `${evidence.qualityReviewP1Count} unresolved P1 finding(s) at [qa: ${leaf.qa}]`,
        );
  },
};

// Factory for optional-result gates (null = tool absent / not run → skip).
// Finding A: tdd-guard / bombadil / lonkero / healthCheck may be absent.
function optionalResultGate(
  name: string,
  field: keyof LeafEvidence,
  label: string,
): Gate<TransitionGateCtx> {
  return {
    name,
    run: ({ evidence }) => {
      const v = evidence[field];
      if (v === null || v === undefined) return skip();
      return v ? pass() : fail(`${label} failed`);
    },
  };
}

export const healthCheckPassed = optionalResultGate(
  "healthCheckPassed",
  "healthCheckPassed",
  "health check",
);
export const bombadilPassed = optionalResultGate(
  "bombadilPassed",
  "bombadilPassed",
  "bombadil property test",
);
export const lonkeroPassed = optionalResultGate(
  "lonkeroPassed",
  "lonkeroPassed",
  "lonkero security scan",
);

export const reviewGates: Gate<TransitionGateCtx>[] = [
  qualityReviewExists,
  p0CountZero,
  p1CountZeroIfFull,
  healthCheckPassed,
  bombadilPassed,
  lonkeroPassed,
];
