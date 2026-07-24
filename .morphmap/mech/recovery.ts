/**
 * mech — recovery.ts
 * Tool failure classification + stuck leaf detection + recovery reports.
 *
 * Pure module: zero pi imports, zero I/O. Plain data in, plain data out.
 *
 * Spec: docs/mech-mindmap.md Phase E
 */

import type { BranchState, LeafStatus, TransitionEntry } from "./types";

// ── Failure Classification ─────────────────────────────────────

export type FailureCategory =
  | "transient"
  | "permanent"
  | "auth"
  | "timeout"
  | "rate-limit"
  | "tool-parse"
  | "model"
  | "unknown";

export interface FailureClassification {
  category: FailureCategory;
  isRetryable: boolean;
  message: string;
  suggestedAction: string;
}

const TRANSIENT_PATTERNS: RegExp[] = [
  /timeout/i,
  /timed ?out/i,
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /ECONNREFUSED/i,
  /socket hang up/i,
  /network error/i,
  /temporarily unavailable/i,
  /try again/i,
  /retry/i,
];

const RATE_LIMIT_PATTERNS: RegExp[] = [
  /rate limit/i,
  /too many requests/i,
  /429/i,
  /quota exceeded/i,
  /billing/i,
];

const AUTH_PATTERNS: RegExp[] = [
  /unauthorized/i,
  /401/i,
  /403/i,
  /forbidden/i,
  /invalid api key/i,
  /authentication/i,
  /not authenticated/i,
  /token expired/i,
];

const TIMEOUT_PATTERNS: RegExp[] = [
  /timeout/i,
  /timed ?out/i,
  /ETIMEDOUT/i,
  /aborted/i,
  /signal/i,
];

const TOOL_PARSE_PATTERNS: RegExp[] = [
  /JSON/i,
  /parse error/i,
  /unexpected token/i,
  /SyntaxError/i,
  /malformed/i,
  /invalid json/i,
];

const MODEL_PATTERNS: RegExp[] = [
  /model/i,
  /context length/i,
  /token limit/i,
  /max tokens/i,
  /truncat/i,
];

const PERMANENT_PATTERNS: RegExp[] = [
  /not found/i,
  /404/i,
  /cannot find/i,
  /no such file/i,
  /ENOENT/i,
  /does not exist/i,
  /invalid/i,
  /not supported/i,
  /deprecated/i,
  /reference ?error/i,
  /type ?error/i,
  /undefined is not/i,
  /cannot read propert/i,
  /is not a function/i,
];

export function classifyFailure(error: unknown): FailureClassification {
  if (error === null || error === undefined) {
    return {
      category: "unknown",
      isRetryable: false,
      message: "null or undefined error",
      suggestedAction: "investigate manually — no error details available",
    };
  }

  if (typeof error === "string") {
    return classifyByMessage(error);
  }

  if (error instanceof Error) {
    return classifyByMessage(error.message);
  }

  // For objects with a message field (e.g., API error responses)
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    return classifyByMessage((error as Record<string, unknown>).message as string);
  }

  return {
    category: "unknown",
    isRetryable: false,
    message: String(error),
    suggestedAction: "investigate manually — unrecognized error shape",
  };
}

function classifyByMessage(msg: string): FailureClassification {
  // Check in priority order: most specific → least specific

  for (const pat of AUTH_PATTERNS) {
    if (pat.test(msg)) {
      return {
        category: "auth",
        isRetryable: false,
        message: msg,
        suggestedAction: "renew API key or token, then retry",
      };
    }
  }

  for (const pat of RATE_LIMIT_PATTERNS) {
    if (pat.test(msg)) {
      return {
        category: "rate-limit",
        isRetryable: true,
        message: msg,
        suggestedAction: "wait for rate limit window to reset (~60s), then retry",
      };
    }
  }

  for (const pat of TIMEOUT_PATTERNS) {
    if (pat.test(msg)) {
      return {
        category: "timeout",
        isRetryable: true,
        message: msg,
        suggestedAction: "increase timeout or split work into smaller chunks, then retry",
      };
    }
  }

  for (const pat of TOOL_PARSE_PATTERNS) {
    if (pat.test(msg)) {
      return {
        category: "tool-parse",
        isRetryable: true,
        message: msg,
        suggestedAction: "retry — tool output was malformed; may succeed on retry with different output",
      };
    }
  }

  for (const pat of MODEL_PATTERNS) {
    if (pat.test(msg)) {
      return {
        category: "model",
        isRetryable: true,
        message: msg,
        suggestedAction: "reduce input size or switch to a larger-context model",
      };
    }
  }

  for (const pat of TRANSIENT_PATTERNS) {
    if (pat.test(msg)) {
      return {
        category: "transient",
        isRetryable: true,
        message: msg,
        suggestedAction: "retry — error appears transient",
      };
    }
  }

  for (const pat of PERMANENT_PATTERNS) {
    if (pat.test(msg)) {
      return {
        category: "permanent",
        isRetryable: false,
        message: msg,
        suggestedAction: "fix the root cause (code/spec error), then retry",
      };
    }
  }

  return {
    category: "unknown",
    isRetryable: true, // default to retryable for unknown errors
    message: msg,
    suggestedAction: "retry once; if it persists, investigate manually",
  };
}

// ── Stuck Leaf Detection ───────────────────────────────────────

/**
 * Find leaves that are in_progress or submitted but have no transition
 * recorded within `idleThresholdMinutes` (default 30).
 */
export function findStuckLeaves(
  state: BranchState,
  idleThresholdMinutes: number = 30,
  now: Date = new Date(),
): string[] {
  const stuck: string[] = [];
  const threshold = idleThresholdMinutes * 60 * 1000; // ms

  for (const [leafId, leaf] of Object.entries(state.leaves)) {
    if (leaf.status !== "in_progress" && leaf.status !== "submitted") {
      continue;
    }

    // Find the most recent transition for this leaf
    const leafTransitions = state.transitions
      .filter((t) => t.leaf === leafId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (leafTransitions.length === 0) {
      // No transitions at all — stuck since spawn
      stuck.push(leafId);
      continue;
    }

    const lastTransition = leafTransitions[0];
    const lastTime = new Date(lastTransition.timestamp).getTime();
    const idleMs = now.getTime() - lastTime;

    if (idleMs > threshold) {
      stuck.push(leafId);
    }
  }

  return stuck;
}

// ── Recovery Report ────────────────────────────────────────────

export interface RecoveryReport {
  stuckLeaves: string[];
  stuckCount: number;
  totalActiveLeaves: number;
  recommendations: string[];
  branchHealth: "healthy" | "degraded" | "critical";
  timestamp: string;
}

export function recoveryReport(
  state: BranchState,
  currentTime?: Date,
  idleThresholdMinutes: number = 30,
): RecoveryReport {
  const now = currentTime ?? new Date();
  const stuckLeaves = findStuckLeaves(state, idleThresholdMinutes, now);

  const activeStatuses: LeafStatus[] = ["in_progress", "submitted"];
  const totalActiveLeaves = Object.values(state.leaves).filter((l) =>
    activeStatuses.includes(l.status),
  ).length;

  const stuckCount = stuckLeaves.length;
  let branchHealth: RecoveryReport["branchHealth"] = "healthy";
  let recommendations: string[] = [];

  if (stuckCount === 0 && totalActiveLeaves > 0) {
    branchHealth = "healthy";
    recommendations = ["all active leaves progressing normally"];
  } else if (stuckCount === 0) {
    branchHealth = "healthy";
    recommendations = ["no active leaves — branch may be idle"];
  } else if (stuckCount < totalActiveLeaves / 2) {
    branchHealth = "degraded";
    recommendations = [
      `unblock stuck leaves: ${stuckLeaves.join(", ")}`,
      "consider unblocking or abandoning stuck leaves",
    ];
  } else if (totalActiveLeaves === 0) {
    branchHealth = "healthy";
    recommendations = ["no active leaves"];
  } else {
    branchHealth = "critical";
    recommendations = [
      `majority of active leaves stuck: ${stuckLeaves.join(", ")}`,
      "escalate to human — branch may need recovery intervention",
      "check WORKER_BLOCKER messages for each stuck leaf",
    ];
  }

  return {
    stuckLeaves,
    stuckCount,
    totalActiveLeaves,
    recommendations,
    branchHealth,
    timestamp: now.toISOString(),
  };
}
