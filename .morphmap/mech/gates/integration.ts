/**
 * mech gates — integration (all leaves → branch complete).
 * Spec §2.4 integrationGates. Branch-level, not leaf-level: runs via
 * morphmap_integration_gate tool, separate from transitionLeaf.
 *
 * Reads branch state + child rollup. Direct leaves must be submitted;
 * sub-branches must be complete (via rollupChildState).
 */
import type { BranchState, DependencyGraph, GateResult } from "../types";
import type { BranchRollup } from "../state";
import { reachedAtLeast } from "../state";
import { fail, pass, skip } from "./common";

export interface IntegrationGateCtx {
  branch: BranchState;
  graph: DependencyGraph;
  rollup: BranchRollup;
}

export interface IntegrationGate {
  name: string;
  run: (ctx: IntegrationGateCtx) => GateResult;
}

// Every direct leaf must have reached at least "submitted"; every
// sub-branch must be complete (rollup.allComplete).
export const allLeavesSubmitted: IntegrationGate = {
  name: "allLeavesSubmitted",
  run: ({ branch, rollup }) => {
    const direct = Object.values(branch.leaves);
    if (direct.length > 0) {
      const incomplete = direct.filter(
        (l) => !reachedAtLeast(l.status, "submitted"),
      );
      if (incomplete.length > 0) {
        return fail(
          `${incomplete.length} leaf/leaves not submitted: ${incomplete.map((l) => l.id).join(", ")}`,
        );
      }
    }
    if (branch.subBranches.length > 0 && !rollup.allComplete) {
      return fail(
        `sub-branches not all complete (blocked: ${rollup.anyBlocked}, in-progress: ${rollup.inProgress.join(", ") || "none"})`,
      );
    }
    return pass();
  },
};

export const crossLeafConflictsResolved: IntegrationGate = {
  name: "crossLeafConflictsResolved",
  run: ({ branch }) =>
    branch.integrationStatus.crossLeafConflicts.length === 0
      ? pass()
      : fail(
          `${branch.integrationStatus.crossLeafConflicts.length} unresolved cross-leaf conflict(s): ${branch.integrationStatus.crossLeafConflicts.join(", ")}`,
        ),
};

export const integrationReviewExists: IntegrationGate = {
  name: "integrationReviewExists",
  run: ({ branch }) =>
    branch.integrationStatus.reviewFileExists
      ? pass()
      : fail("no integration-review file"),
};

export const integrationHealthCheckPassed: IntegrationGate = {
  name: "integrationHealthCheckPassed",
  run: ({ branch }) => {
    const v = branch.integrationStatus.healthCheckPassed;
    if (v === null || v === undefined) return skip();
    return v ? pass() : fail("integration health check failed");
  },
};

export const integrationGates: IntegrationGate[] = [
  allLeavesSubmitted,
  crossLeafConflictsResolved,
  integrationReviewExists,
  integrationHealthCheckPassed,
];

/**
 * Run the integration gate chain. First block short-circuits; warnings
 * accumulate but never block. Branch-level analogue of runGates.
 */
export function runIntegrationGates(ctx: IntegrationGateCtx): GateResult {
  const warnings: string[] = [];
  for (const g of integrationGates) {
    const r = g.run(ctx);
    if (!r.pass) {
      if ((r.severity ?? "block") === "block") {
        return { pass: false, reason: `${g.name}: ${r.reason ?? "failed"}` };
      }
      warnings.push(`${g.name}: ${r.reason ?? "warning"}`);
    }
  }
  return warnings.length > 0
    ? { pass: true, reason: warnings.join("; "), severity: "warn" }
    : { pass: true };
}
