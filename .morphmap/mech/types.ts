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
  | "done"; //        ✅  approve_leaf passed, reviewGates passed

export type BranchStatus =
  | "pending" //  ⬜
  | "in_progress" // 🔄
  | "done" // ✅
  | "blocked"; // 🔴

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
  done: "✅",
};

export const BRANCH_STATUS_EMOJI: Record<BranchStatus, string> = {
  pending: "⬜",
  in_progress: "🔄",
  done: "✅",
  blocked: "🔴",
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
}

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

// Context handed to every gate at transition time.
export interface TransitionGateCtx {
  leaf: Leaf;
  evidence: LeafEvidence;
  to: LeafStatus;
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
