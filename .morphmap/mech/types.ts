/**
 * mech — types.ts
 * All interfaces & enums for the MorphMap deterministic state machine.
 *
 * Pure module: zero pi imports, zero I/O. Plain data in, plain data out.
 * Unit-testable without the pi runtime.
 *
 * Machine-native strings are authoritative (they live in state.json).
 * Emoji are display-only — see the *_EMOJI maps for the markdown render.
 *
 * Spec: docs/mech-mindmap.md §2.3 (entities), §6.1 (state.json schema)
 */

// ── Leaf lifecycle ────────────────────────────────────────────
export type LeafStatus =
  | "pending" //      ⬜  not started, or deps block
  | "in_progress" //  🔄  leaf worker spawned / running
  | "submitted" //    ⏳  worker called submit_leaf, submitGates passed
  | "in_review" //    ⏳  branch agent / reviewer owns it
  | "blocked" //      🔴  WORKER_BLOCKER or unresolved dependency
  | "abandoned" //    💤  consciously set aside — frozen, collapsed, or deferred (§8.5)
  | "done"; //        ✅  approve_leaf passed, reviewGates passed

export type BranchStatus =
  | "pending" //  ⬜
  | "in_progress" // 🔄
  | "done" // ✅
  | "blocked" // 🔴
  | "abandoned"; // 💤  set aside, collapsed to brainstorm, or deferred (§8.5)

// Why a branch/leaf was set aside (§8.5). State machine treats all three
// identically (frozen, gates skip). Difference is an agent/human signal:
//   discarded = negative (dead end, don't redo) · aside/cancelled = reopenable.
export type AbandonedReason = "discarded" | "cancelled" | "aside";

// Bottleneck tags (mirror .morphmap/config leafProfiles)
export type Bottleneck =
  | "blocking" // 🔴
  | "risky" //    🟡
  | "standard" // ⚪
  | "time" //     🔵
  | "verify"; //  🟠

// Quality tier (§4.1) — drives which gates fire
export type QALevel = "none" | "review" | "full" | "strict";

export type TestStrategy =
  | "unit"
  | "integration"
  | "e2e"
  | "property-based"
  | "snapshot";

export type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "max";

export interface ModelAssignment {
  provider: string; // "anthropic" | "deepseek" | "zai" …
  model: string; //  "claude-sonnet-4"
  thinking: ThinkingLevel;
}

export type BranchQuality = "fast" | "strict" | "none";

// ── Display maps: machine string ↔ emoji ──────────────────────
// Single source of truth for the markmap render. No agent re-derives these.
export const LEAF_STATUS_EMOJI: Record<LeafStatus, string> = {
  pending: "⬜",
  in_progress: "🔄",
  submitted: "⏳",
  in_review: "⏳",
  blocked: "🔴",
  abandoned: "💤",
  done: "✅",
};

export const BRANCH_STATUS_EMOJI: Record<BranchStatus, string> = {
  pending: "⬜",
  in_progress: "🔄",
  done: "✅",
  blocked: "🔴",
  abandoned: "💤",
};

export const BOTTLENECK_EMOJI: Record<Bottleneck, string> = {
  blocking: "🔴",
  risky: "🟡",
  standard: "⚪",
  time: "🔵",
  verify: "🟠",
};

// ── Evidence (accumulated proof, §6.1) ────────────────────────
// `null` = not-yet-checked or tool absent (e.g. tdd-guard skipped).
export interface LeafEvidence {
  // preSpawn
  specExists: boolean;
  specScenarioCount: number;
  specFileCount: number;
  // submit
  agentSpecPassed: boolean;
  tddGuardPassed: boolean | null; // null = tdd-guard absent, skipped gracefully
  npmTestPassed: boolean;
  npmBuildPassed: boolean;
  boundariesClean: boolean;
  filesChanged: string[];
  testsRun: string[];
  // review
  healthCheckPassed: boolean | null;
  bombadilPassed: boolean | null;
  lonkeroPassed: boolean | null;
  qualityReviewExists: boolean;
  qualityReviewP0Count: number;
  qualityReviewP1Count: number;
  // intent verification (ARIA-inspired): maps .spec outcome IDs → results
  outcomeResults?: Record<string, OutcomeResult>;
}

export interface OutcomeResult {
  passed: boolean;
  digest?: string; // optional evidence hash (e.g., test report SHA)
}

// ── Grill / Ambiguity Records (ARIA-inspired) ──────────────────

export interface GrillQuestion {
  id: string; // kebab-case, e.g. "error-format"
  question: string;
  severity: "material" | "minor" | "clarification";
  discoveredBy: string; // "agent:branch-agent" | "agent:critic" | "human:operator"
  resolution: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null; // ISO-8601
}

// ── Model Escalation ──────────────────────────────────────────

/** One rung in the escalation ladder. After N failures, upgrade model. */
export interface EscalationRung {
  failures: number; // cumulative failures to trigger this rung
  provider?: string; // override provider (default: keep current)
  model?: string; // override model (default: keep current)
  thinking?: string; // override thinking level (default: keep current)
}

/** Per-bottleneck escalation chain. Empty = no escalation (go straight to human). */
export type EscalationConfig = Record<string, EscalationRung[]>;

export function emptyEvidence(): LeafEvidence {
  return {
    specExists: false,
    specScenarioCount: 0,
    specFileCount: 0,
    agentSpecPassed: false,
    tddGuardPassed: null,
    npmTestPassed: false,
    npmBuildPassed: false,
    boundariesClean: false,
    filesChanged: [],
    testsRun: [],
    healthCheckPassed: null,
    bombadilPassed: null,
    lonkeroPassed: null,
    qualityReviewExists: false,
    qualityReviewP0Count: 0,
    qualityReviewP1Count: 0,
    outcomeResults: undefined,
  };
}

// ── Entities ──────────────────────────────────────────────────
export interface Leaf {
  id: string; // leaf path, e.g. "auth/jwt-refresh"
  status: LeafStatus;
  bottleneck: Bottleneck;
  qa: QALevel;
  test: TestStrategy[];
  model: ModelAssignment;
  tools: string[];
  evidence: LeafEvidence;
  reviewRounds: number;
  trace: string; // branchId/leafId linkage (§6.3)
  estLoc?: number; // optional override for [est-loc: N] tag
  abandonedReason?: AbandonedReason; // set when status === "abandoned" (§8.5)
  escalationCount?: number; // how many times model has been escalated (0 = first attempt)
  jjChangeId?: string; // jj change ID tracking this leaf's work (for undo/rollback)
}

export interface IntegrationStatus {
  reviewFileExists: boolean;
  healthCheckPassed: boolean | null;
  bombadilPassed: boolean | null;
  lonkeroPassed: boolean | null;
  allLeavesComplete: boolean;
  crossLeafConflicts: string[]; // conflicting leaf-pair ids
}

export interface TransitionEntry {
  leaf: string;
  from: LeafStatus;
  to: LeafStatus;
  timestamp: string; // ISO-8601
  evidenceHash: string; // short hash of evidence at transition time
}

export interface BranchState {
  branchId: string;
  status: BranchStatus;
  quality: BranchQuality;
  posture?: Posture;
  leaves: Record<string, Leaf>;
  subBranches: string[];
  childBranchStatus: Record<string, BranchStatus>; // rollup source (§588)
  transitions: TransitionEntry[]; // idempotency log (§8.1)
  integrationStatus: IntegrationStatus;
  abandonedReason?: AbandonedReason; // set when status === "abandoned" (§8.5)
  sessionId?: string; // pi subagent session ID (one-map §2: map = session tree)
  jjChangeId?: string; // jj change ID for this branch (for undo/rollback)
}

export interface Posture {
  phase: "prototype" | "mvp" | "production";
  compatibility: "break" | "compat";
  scope: "narrow" | "broad";
  quality: BranchQuality;
  budget: "lean" | "balanced" | "generous";
}

// ── Dependencies (§3.6) ───────────────────────────────────────
export type DepKind = "needs" | "needs-contract";

export interface DepEdge {
  from: string; // dependent leaf
  to: string; // target leaf
  kind: DepKind;
}

export interface DependencyGraph {
  nodes: string[]; // all leaf ids
  edges: DepEdge[];
}

// Result of dependency check for one leaf.
export interface DepResolution {
  buildBlocked: boolean; // may the leaf start building?
  integrateBlocked: boolean; // may the leaf complete (reach done)?
  blockedBy: string[]; // unsatisfied target ids (with reason)
}

// ── Gates (signature only; implementations land in Phase B) ───
export type GateSeverity = "block" | "warn";

export interface GateResult {
  pass: boolean;
  reason?: string;
  severity?: GateSeverity; // default "block"
}

export interface Gate<I> {
  name: string;
  run: (input: I) => GateResult;
}

// Context handed to every gate at transition time. Optional fields are
// populated by the lattice layer for cross-leaf / dependency gates.
export interface TransitionGateCtx {
  leaf: Leaf;
  evidence: LeafEvidence;
  to: LeafStatus;
  graph?: DependencyGraph; // for dependenciesResolvable
  allLeaves?: Record<string, Leaf>; // for crossLeafNoConflict
  allowedChanges?: string[]; // from .spec Boundaries, for filesMatchSpec
  grillQuestions?: GrillQuestion[]; // from .morphmap/grill-questions.json, for ambiguitiesResolved
}

// ── Over-engineering accumulator (§4.3, finding K) ────────────
export interface OverengineeringState {
  warnings: string[]; // per-project accumulation
  maxWarnings: number; // default 5 → human review (config.overengineering.maxWarnings)
}

// ── Outcome types returned by transition functions ────────────
export interface TransitionOutcome {
  state: BranchState; // new state (immutable update)
  result: GateResult; // pass + reason
  transitioned: boolean; // false if blocked or idempotent skip
  idempotentSkip: boolean; // true if replay of an already-recorded transition
}

// ── Unified Node type (one-map.md §1) ──────────────────────────
// One entity type for both leaves and branches.
// children: [] = leaf, children: [...] = branch.
// Same state machine, same gates, same tools.

export type NodeStatus = LeafStatus; // unified: same 7 states

export interface Node {
  id: string;
  status: NodeStatus;
  children: string[]; // empty = leaf, non-empty = branch
  metadata: Record<string, unknown>; // domain-specific fields
}

export function isLeaf(node: Node): boolean {
  return node.children.length === 0;
}

export function isBranch(node: Node): boolean {
  return node.children.length > 0;
}

// Convert Node → Leaf (for leaf nodes with leaf-specific metadata)
export function nodeToLeaf(node: Node): Leaf {
  return {
    id: node.id,
    status: node.status,
    bottleneck: (node.metadata.bottleneck as Bottleneck) ?? "standard",
    qa: (node.metadata.qa as QALevel) ?? "review",
    test: (node.metadata.test as TestStrategy[]) ?? ["unit"],
    model: node.metadata.model as ModelAssignment,
    tools: (node.metadata.tools as string[]) ?? ["agent-spec"],
    evidence: node.metadata.evidence as LeafEvidence ?? emptyEvidence(),
    reviewRounds: (node.metadata.reviewRounds as number) ?? 0,
    trace: (node.metadata.trace as string) ?? node.id,
    estLoc: node.metadata.estLoc as number | undefined,
    abandonedReason: node.metadata.abandonedReason as AbandonedReason | undefined,
  };
}

// Convert Node → BranchState (for branch nodes with branch-specific metadata)
export function nodeToBranchState(node: Node): BranchState {
  return {
    branchId: node.id,
    status: node.status as BranchStatus,
    quality: (node.metadata.quality as BranchQuality) ?? "fast",
    posture: node.metadata.posture as Posture | undefined,
    leaves: (node.metadata.leaves as Record<string, Leaf>) ?? {},
    subBranches: (node.metadata.subBranches as string[]) ?? [],
    childBranchStatus: (node.metadata.childBranchStatus as Record<string, BranchStatus>) ?? {},
    transitions: (node.metadata.transitions as TransitionEntry[]) ?? [],
    integrationStatus: node.metadata.integrationStatus as IntegrationStatus ?? {
      reviewFileExists: false,
      healthCheckPassed: null,
      bombadilPassed: null,
      lonkeroPassed: null,
      allLeavesComplete: false,
      crossLeafConflicts: [],
    },
    abandonedReason: node.metadata.abandonedReason as AbandonedReason | undefined,
  };
}
