/**
 * morphmap-tools.ts — transition-tool orchestration (impure, bun-testable).
 *
 * Wraps the pure mech handlers (submitLeaf/approveLeaf/integrationGate) with
 * state.json load→save. This is the layer agents go through to advance status.
 *
 * Deliberately NO typebox / NO pi imports here — only mech + morphmap-state —
 * so it bun-tests cleanly (typebox/pi-ai resolve only inside the pi runtime).
 * The TypeBox schemas + pi.registerTool wrappers live in morphmap-tools-pi.ts.
 *
 * Spec: docs/mech-mindmap.md §2.5.
 */
import { loadState, saveState } from "./morphmap-state";
import {
  approveLeaf,
  integrationGate,
  submitLeaf,
  type BranchState,
  type LeafEvidence,
} from "../mech";

// ── Plain input types (TypeBox schemas in morphmap-tools-pi.ts mirror these) ─
export interface SubmitLeafInput {
  leafId: string;
  evidence?: Partial<LeafEvidence>;
  allowedChanges?: string[];
}
export interface ApproveLeafInput {
  leafId: string;
  reviewFile?: string;
  evidence?: Partial<LeafEvidence>;
}
export interface IntegrationGateInput {
  reviewFile?: string;
}

export interface OrchestratedResult {
  ok: boolean;
  summary: string;
  failures: string[];
  changed: boolean;
}

function noState(): OrchestratedResult {
  return {
    ok: false,
    summary: "❌ no .morphmap/state.json — mech not seeded. Run /morphmap-init first.",
    failures: ["state.json missing"],
    changed: false,
  };
}

function corruptState(detail: string): OrchestratedResult {
  return {
    ok: false,
    summary: `❌ state.json corrupt — ${detail}. Restore from git or re-seed.`,
    failures: ["state.json corrupt"],
    changed: false,
  };
}

/** Load state; return a clean OrchestratedResult on missing/corrupt (never throws). */
async function loadOrReport(
  statePath: string,
): Promise<{ ok: true; state: BranchState } | { ok: false; result: OrchestratedResult }> {
  try {
    const state = loadState(statePath);
    if (!state) return { ok: false, result: noState() };
    return { ok: true, state };
  } catch (e) {
    return { ok: false, result: corruptState((e as Error).message) };
  }
}

function fmtLeaf(
  tool: string,
  leafId: string,
  r: {
    accepted: boolean;
    failures: string[];
    transitioned: boolean;
    warnings: string[];
    newState: { leaves: Record<string, { status: string }> };
  },
): OrchestratedResult {
  const status = r.newState.leaves[leafId]?.status;
  if (r.accepted) {
    const warn = r.warnings.length ? ` ⚠ ${r.warnings.join("; ")}` : "";
    return {
      ok: true,
      summary: `✅ ${tool}: leaf '${leafId}' → ${status}${warn}`,
      failures: [],
      changed: r.transitioned,
    };
  }
  return {
    ok: false,
    summary: `❌ ${tool}: leaf '${leafId}' rejected — ${r.failures.join("; ")}`,
    failures: r.failures,
    changed: false,
  };
}

// v0.1: dependency graph not yet stored in state.json → dep gates skip
// (dependenciesResolvable / runtimeDependenciesMet pass when graph absent).
// crossLeafNoConflict IS active — allLeaves comes from state.leaves.
const EMPTY_GRAPH = { nodes: [] as string[], edges: [] as never[] };

export async function applySubmitLeaf(
  statePath: string,
  input: SubmitLeafInput,
): Promise<OrchestratedResult> {
  const loaded = await loadOrReport(statePath);
  if (!loaded.ok) return loaded.result;
  const state = loaded.state;
  const r = submitLeaf(state, {
    leafId: input.leafId,
    evidence: input.evidence,
    allowedChanges: input.allowedChanges,
    allLeaves: state.leaves,
  });
  if (r.transitioned) saveState(statePath, r.newState);
  return fmtLeaf("submit_leaf", input.leafId, r);
}

export async function applyApproveLeaf(
  statePath: string,
  input: ApproveLeafInput,
): Promise<OrchestratedResult> {
  const loaded = await loadOrReport(statePath);
  if (!loaded.ok) return loaded.result;
  const state = loaded.state;
  const r = approveLeaf(state, {
    leafId: input.leafId,
    reviewFile: input.reviewFile,
    evidence: input.evidence,
    allLeaves: state.leaves,
  });
  if (r.transitioned) saveState(statePath, r.newState);
  return fmtLeaf("approve_leaf", input.leafId, r);
}

export async function applyIntegrationGate(
  statePath: string,
  input: IntegrationGateInput,
): Promise<OrchestratedResult> {
  const loaded = await loadOrReport(statePath);
  if (!loaded.ok) return loaded.result;
  const state = loaded.state;
  const r = integrationGate(state, {
    reviewFile: input.reviewFile,
    graph: EMPTY_GRAPH,
  });
  if (r.passed) saveState(statePath, r.newState);
  const warn = r.warnings.length ? ` ⚠ ${r.warnings.join("; ")}` : "";
  return r.passed
    ? {
        ok: true,
        summary: `✅ integration_gate: branch '${r.newState.branchId}' → done${warn}`,
        failures: [],
        changed: true,
      }
    : {
        ok: false,
        summary: `❌ integration_gate: branch rejected — ${r.failures.join("; ")}`,
        failures: r.failures,
        changed: false,
      };
}
