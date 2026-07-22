/**
 * mech — transition tool handlers (pure).
 * Spec §2.5. The decision logic behind the pi-registered tools:
 *
 *   morphmap_submit_leaf       → submitLeaf()
 *   morphmap_approve_leaf      → approveLeaf()
 *   morphmap_integration_gate  → integrationGate()
 *
 * Pure: take state, return result + new state. Phase D wraps these with
 * pi.registerTool (TypeBox schemas) + state.json I/O. Agents cannot advance
 * leaf/branch status except through these — the gate enforcement point.
 *
 * request_revision (§4.2 escape hatch) is deferred to Phase D (not in §2.5).
 */
import type {
  BranchState,
  DependencyGraph,
  Leaf,
  LeafEvidence,
} from "./types";
import { rollupChildState, transitionLeaf, type BranchRollup } from "./state";
import { runIntegrationGates } from "./gates/integration";
import { reviewGates } from "./gates/review";
import { submitGates } from "./gates/submit";

// ── shared leaf-tool input/result ─────────────────────────────
export interface LeafToolInput {
  leafId: string;
  evidence?: Partial<LeafEvidence>;
  allowedChanges?: string[]; // from .spec Boundaries (filesMatchSpec)
  graph?: DependencyGraph; // for dependenciesResolvable (pre-spawn only)
  allLeaves?: Record<string, Leaf>; // for crossLeafNoConflict
  now?: () => string; // injectable clock
}

export interface LeafToolResult {
  accepted: boolean;
  failures: string[];
  newState: BranchState;
  transitioned: boolean;
  idempotentSkip: boolean;
  warnings: string[];
}

/** Map a transitionLeaf outcome to the agent-facing tool result. */
function toLeafResult(
  o: ReturnType<typeof transitionLeaf>,
): LeafToolResult {
  const accepted = o.transitioned || o.idempotentSkip;
  const warnings =
    o.result.severity === "warn" && o.result.reason ? [o.result.reason] : [];
  return {
    accepted,
    failures: accepted ? [] : [o.result.reason ?? "rejected"],
    newState: o.state,
    transitioned: o.transitioned,
    idempotentSkip: o.idempotentSkip,
    warnings,
  };
}

// ── submit_leaf: in_progress → submitted (worker submits proof) ─
export function submitLeaf(
  state: BranchState,
  input: LeafToolInput,
): LeafToolResult {
  const out = transitionLeaf(state, {
    leafId: input.leafId,
    to: "submitted",
    evidence: input.evidence,
    gates: submitGates,
    allowedChanges: input.allowedChanges,
    graph: input.graph,
    allLeaves: input.allLeaves,
    now: input.now,
  });
  return toLeafResult(out);
}

// ── approve_leaf: in_review → done (reviewer approves) ────────
// reviewFile (if provided) implies the quality-review file exists → sets
// evidence.qualityReviewExists. The impure layer confirms the path first.
export interface ApproveLeafInput extends LeafToolInput {
  reviewFile?: string;
}

export function approveLeaf(
  state: BranchState,
  input: ApproveLeafInput,
): LeafToolResult {
  const evidence: Partial<LeafEvidence> = { ...input.evidence };
  if (input.reviewFile) evidence.qualityReviewExists = true;
  const out = transitionLeaf(state, {
    leafId: input.leafId,
    to: "done",
    evidence,
    gates: reviewGates,
    graph: input.graph,
    allLeaves: input.allLeaves,
    now: input.now,
  });
  return toLeafResult(out);
}

// ── integration_gate: all leaves → branch complete ────────────
// Branch-level. Does not touch leaf status; on pass, marks branch "done".
export interface IntegrationToolInput {
  reviewFile?: string; // integration-review file path
  graph: DependencyGraph;
  rollup?: BranchRollup; // defaults to rollupChildState(branch.childBranchStatus)
}

export interface IntegrationToolResult {
  passed: boolean;
  failures: string[];
  newState: BranchState;
  warnings: string[];
}

export function integrationGate(
  state: BranchState,
  input: IntegrationToolInput,
): IntegrationToolResult {
  const integrationStatus = input.reviewFile
    ? { ...state.integrationStatus, reviewFileExists: true }
    : state.integrationStatus;
  const branch: BranchState = { ...state, integrationStatus };
  const rollup =
    input.rollup ?? rollupChildState(branch.childBranchStatus);

  const r = runIntegrationGates({ branch, graph: input.graph, rollup });
  const warnings =
    r.severity === "warn" && r.reason ? [r.reason] : [];

  if (!r.pass) {
    return {
      passed: false,
      failures: [r.reason ?? "integration gate failed"],
      newState: state, // unchanged on failure
      warnings,
    };
  }

  // passed → mark branch done, leaves complete
  const newState: BranchState = {
    ...branch,
    status: "done",
    integrationStatus: { ...integrationStatus, allLeavesComplete: true },
  };
  return { passed: true, failures: [], newState, warnings };
}
