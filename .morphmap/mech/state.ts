/**
 * mech — state.ts
 * Deterministic state machine core. Pure: no pi imports, no I/O.
 *
 *   StateMachine<S>          — generic transition-table validator
 *   LEAF_TRANSITIONS         — legal leaf lifecycle (§2.3, §4.2, §4.3)
 *   transitionLeaf()         — run gates, validate, log, idempotent
 *   canStartLeaf()           — dependency resolution (§3.6)
 *   rollupChildState()       — nested sub-map aggregation (§588)
 *
 * Idempotency (§8.1): replaying an already-recorded transition is a
 * no-op pass, not a duplicate log entry. Detected by an existing
 * transition entry (leaf, to, evidenceHash) whose target state matches
 * the leaf's current status.
 *
 * Spec: docs/mech-mindmap.md §2.3, §3.6, §8.1
 */

import type {
  BranchState,
  BranchStatus,
  DepResolution,
  DependencyGraph,
  Gate,
  GateResult,
  Leaf,
  LeafEvidence,
  LeafStatus,
  TransitionGateCtx,
  TransitionOutcome,
} from "./types";

// ── Generic transition validator ──────────────────────────────
export interface Transition<S extends string> {
  from: S | "*"; // "*" = legal from any state
  to: S;
}

export class StateMachine<S extends string> {
  private readonly legal: ReadonlyArray<Transition<S>>;
  private readonly fromIndex: Map<S, Set<S>>;
  private readonly wildcardTargets: Set<S>;

  constructor(legal: ReadonlyArray<Transition<S>>) {
    this.legal = legal;
    this.fromIndex = new Map();
    this.wildcardTargets = new Set();
    for (const t of legal) {
      if (t.from === "*") {
        this.wildcardTargets.add(t.to);
      } else {
        let set = this.fromIndex.get(t.from);
        if (!set) {
          set = new Set();
          this.fromIndex.set(t.from, set);
        }
        set.add(t.to);
      }
    }
  }

  canTransition(from: S, to: S): boolean {
    if (from === to) return true; // self-transition always legal (idempotent)
    if (this.fromIndex.get(from)?.has(to)) return true;
    return this.wildcardTargets.has(to);
  }

  nextStates(from: S): S[] {
    const out = new Set<S>(this.fromIndex.get(from) ?? []);
    for (const t of this.wildcardTargets) out.add(t);
    return [...out];
  }

  /** All defined states (derived from transitions). */
  states(): S[] {
    const out = new Set<S>();
    for (const t of this.legal) {
      if (t.from !== "*") out.add(t.from);
      out.add(t.to);
    }
    return [...out];
  }
}

// ── Leaf lifecycle ────────────────────────────────────────────
// pending → in_progress → submitted → in_review → done
// Revision loop: in_review → in_progress (CHANGES_REQUESTED)
// Escape hatch: done → pending (contract revision, §4.2)
// Block from anywhere: * → blocked; unblock: blocked → in_progress
export const LEAF_TRANSITIONS: ReadonlyArray<Transition<LeafStatus>> = [
  { from: "pending", to: "in_progress" },
  { from: "in_progress", to: "submitted" },
  { from: "submitted", to: "in_review" },
  { from: "in_review", to: "done" },
  { from: "in_review", to: "in_progress" }, // revision loop
  { from: "*", to: "blocked" }, // WORKER_BLOCKER from any state
  { from: "blocked", to: "in_progress" }, // unblocked
  { from: "done", to: "pending" }, // contract revision escape hatch
];

export const leafMachine = new StateMachine(LEAF_TRANSITIONS);

// ── Evidence hashing (stable, short, deterministic) ───────────
// Same evidence object → same hash. Key-order independent. No crypto.
export function evidenceHash(e: LeafEvidence): string {
  const json = JSON.stringify(sortKeys(e));
  let h = 5381; // djb2 — good enough for change detection
  for (let i = 0; i < json.length; i++) {
    h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj as object).sort()) {
      out[k] = sortKeys((obj as Record<string, unknown>)[k]);
    }
    return out;
  }
  return obj;
}

// ── Transition input ──────────────────────────────────────────
export interface TransitionInput {
  leafId: string;
  to: LeafStatus;
  evidence?: Partial<LeafEvidence>;
  gates?: Gate<TransitionGateCtx>[]; // gates required for THIS transition
  now?: () => string; // injectable clock for deterministic tests
}

/**
 * Attempt a leaf transition. Runs gates (first block short-circuits),
 * validates legality, checks idempotency, appends to the transitions
 * log on success. Pure: returns a new state, never mutates the input.
 */
export function transitionLeaf(
  state: BranchState,
  input: TransitionInput,
): TransitionOutcome {
  const leaf = state.leaves[input.leafId];
  if (!leaf) {
    return {
      state,
      result: { pass: false, reason: `leaf not found: ${input.leafId}` },
      transitioned: false,
      idempotentSkip: false,
    };
  }

  // 1. legality
  if (!leafMachine.canTransition(leaf.status, input.to)) {
    return {
      state,
      result: {
        pass: false,
        reason: `illegal transition: ${leaf.status} → ${input.to}`,
      },
      transitioned: false,
      idempotentSkip: false,
    };
  }

  // 2. merge evidence
  const mergedEvidence: LeafEvidence = {
    ...leaf.evidence,
    ...(input.evidence ?? {}),
  };
  const hash = evidenceHash(mergedEvidence);

  // 3. idempotency: a matching transition already exists AND leaf is
  //    currently at the target → no-op pass (crash-recovery safe).
  const exists = state.transitions.some(
    (t) =>
      t.leaf === input.leafId &&
      t.to === input.to &&
      t.evidenceHash === hash,
  );
  if (exists && leaf.status === input.to) {
    return {
      state,
      result: { pass: true, reason: "idempotent: transition already recorded" },
      transitioned: false,
      idempotentSkip: true,
    };
  }

  // 4. gates: first block short-circuits; warns never block
  const ctx: TransitionGateCtx = { leaf, evidence: mergedEvidence, to: input.to };
  const failures: string[] = [];
  for (const g of input.gates ?? []) {
    const r = g.run(ctx);
    if (!r.pass && (r.severity ?? "block") === "block") {
      failures.push(`${g.name}: ${r.reason ?? "failed"}`);
      break;
    }
  }
  if (failures.length > 0) {
    return {
      state,
      result: { pass: false, reason: failures.join("; ") },
      transitioned: false,
      idempotentSkip: false,
    };
  }

  // 5. apply (immutable)
  const ts = input.now?.() ?? new Date().toISOString();
  const isRevisionLoop = input.to === "in_progress" && leaf.status === "in_review";
  const newLeaf: Leaf = {
    ...leaf,
    status: input.to,
    evidence: mergedEvidence,
    reviewRounds: isRevisionLoop ? leaf.reviewRounds + 1 : leaf.reviewRounds,
  };
  const newState: BranchState = {
    ...state,
    leaves: { ...state.leaves, [input.leafId]: newLeaf },
    transitions: [
      ...state.transitions,
      {
        leaf: input.leafId,
        from: leaf.status,
        to: input.to,
        timestamp: ts,
        evidenceHash: hash,
      },
    ],
  };
  return {
    state: newState,
    result: { pass: true },
    transitioned: true,
    idempotentSkip: false,
  };
}

// ── Dependency resolution (§3.6) ──────────────────────────────
//   [needs: target]         → target must be "done" (runtime call)
//   [needs-contract: target]→ build unblocks at "submitted" (contract real),
//                              integrate unblocks at "done"
export function canStartLeaf(
  leafId: string,
  graph: DependencyGraph,
  leaves: Record<string, Leaf>,
): DepResolution {
  const blockedBy: string[] = [];
  let buildBlocked = false;
  let integrateBlocked = false;

  for (const edge of graph.edges) {
    if (edge.from !== leafId) continue;
    const target = leaves[edge.to];
    const targetStatus: LeafStatus = target?.status ?? "pending";

    if (edge.kind === "needs") {
      if (targetStatus !== "done") {
        buildBlocked = true;
        integrateBlocked = true;
        blockedBy.push(edge.to);
      }
    } else {
      // needs-contract
      if (!reachedAtLeast(targetStatus, "submitted")) {
        buildBlocked = true;
        blockedBy.push(`${edge.to} (contract)`);
      }
      if (targetStatus !== "done") {
        integrateBlocked = true;
        blockedBy.push(`${edge.to} (runtime)`);
      }
    }
  }

  return { buildBlocked, integrateBlocked, blockedBy };
}

// Linear progression order. "blocked" excluded — a blocked target
// satisfies no dependency.
const STATUS_ORDER: LeafStatus[] = [
  "pending",
  "in_progress",
  "submitted",
  "in_review",
  "done",
];

function reachedAtLeast(status: LeafStatus, threshold: LeafStatus): boolean {
  if (status === "blocked") return false;
  return STATUS_ORDER.indexOf(status) >= STATUS_ORDER.indexOf(threshold);
}

// ── Branch completion rollup (finding D, doc L440/L588) ───────
// Aggregates childBranchStatus from sub-map state.json files so the
// parent integration gate reads a rollup, not a flat leaf list.
export interface BranchRollup {
  allComplete: boolean;
  anyBlocked: boolean;
  inProgress: string[];
}

export function rollupChildState(
  childBranchStatus: Record<string, BranchStatus>,
): BranchRollup {
  const values = Object.values(childBranchStatus);
  return {
    allComplete: values.length > 0 && values.every((s) => s === "done"),
    anyBlocked: values.some((s) => s === "blocked"),
    inProgress: Object.entries(childBranchStatus)
      .filter(([, s]) => s === "in_progress")
      .map(([id]) => id),
  };
}

// ── Convenience: compose a gate chain result (used by Phase B) ─
export function runGates(
  gates: Gate<TransitionGateCtx>[],
  ctx: TransitionGateCtx,
): GateResult {
  const warnings: string[] = [];
  for (const g of gates) {
    const r = g.run(ctx);
    if (!r.pass) {
      if ((r.severity ?? "block") === "block") {
        return { pass: false, reason: `${g.name}: ${r.reason ?? "failed"}` };
      }
      warnings.push(`${g.name}: ${r.reason ?? "warning"}`);
    }
  }
  if (warnings.length > 0) {
    return { pass: true, reason: warnings.join("; "), severity: "warn" };
  }
  return { pass: true };
}
