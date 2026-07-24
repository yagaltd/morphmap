/**
 * mech — config.ts
 * Pure lookup tables. Zero agent judgment — read tags, return decisions.
 *
 *   assignModel(bottleneck, qa, test, profiles) → ModelAssignment
 *   assignTools(test, domain)                   → tool list
 *   applyPosture(posture)                       → gate-strictness overrides
 *
 * Model data is passed in via `profiles` — no hardcoded tables.
 * Single source of truth: .morphmap/config.json (loaded by mech-pi/config-loader.ts).
 *
 * Spec: docs/mech-mindmap.md §2.6
 */

import type {
  Bottleneck,
  EscalationConfig,
  ModelAssignment,
  Posture,
  QALevel,
  TestStrategy,
} from "./types";

/** Profile entry as loaded from config.json. */
export interface LeafProfileEntry {
  provider: string;
  model: string;
  thinking: string;
}

// ── assignModel ───────────────────────────────────────────────
// Profiles are passed in — no hardcoded defaults. The impure loader
// (mech-pi/config-loader.ts) reads .morphmap/config.json and supplies them.

export function assignModel(
  bottleneck: Bottleneck,
  qa: QALevel,
  test: TestStrategy[] = [],
  profiles?: Record<Bottleneck, LeafProfileEntry>,
): ModelAssignment {
  // Resolve base profile — from config, or fallback for backward compat
  const entry = profiles?.[bottleneck];
  const base: ModelAssignment = entry
    ? {
        provider: entry.provider,
        model: entry.model,
        thinking: entry.thinking as ModelAssignment["thinking"],
      }
    : fallbackModel(bottleneck);

  // security/payment-critical → always strongest, regardless of bottleneck.
  if (qa === "strict") {
    return { provider: "anthropic", model: "claude-sonnet-4", thinking: "max" };
  }

  // [qa: full] on a normally-cheap leaf → bump to pro + high thinking.
  if (qa === "full" && (bottleneck === "standard" || bottleneck === "time")) {
    base.provider = "deepseek";
    base.model = "deepseek-v4-pro";
    base.thinking = "high";
  }

  // visual / e2e tests need a vision-capable model.
  if (test.includes("e2e")) {
    base.provider = "zai";
    base.model = "glm-5.2";
    if (base.thinking === "off") base.thinking = "high";
  }

  return base;
}

/** Legacy fallback — only used when no config.json profiles are supplied. */
function fallbackModel(bottleneck: Bottleneck): ModelAssignment {
  const FALLBACK: Record<Bottleneck, ModelAssignment> = {
    blocking: { provider: "anthropic", model: "claude-sonnet-4", thinking: "max" },
    risky: { provider: "deepseek", model: "deepseek-v4-pro", thinking: "high" },
    standard: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "off" },
    time: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "high" },
    verify: { provider: "deepseek", model: "deepseek-v4-pro", thinking: "high" },
  };
  return { ...FALLBACK[bottleneck] };
}

// ── Model Escalation ──────────────────────────────────────────

/**
 * Given the current model + failure count + escalation config, return the
 * next model to try. If no rung matches → null (escalate to human).
 */
export function escalateModel(
  current: ModelAssignment,
  escalationCount: number,
  escalationConfig?: EscalationConfig,
  bottleneck?: Bottleneck,
): ModelAssignment | null {
  if (!escalationConfig || !bottleneck) return null;
  const ladder = escalationConfig[bottleneck];
  if (!ladder || ladder.length === 0) return null;

  // Find the highest rung triggered by current failure count
  let next: ModelAssignment | null = null;
  for (const rung of ladder) {
    if (escalationCount >= rung.failures) {
      next = {
        provider: rung.provider ?? current.provider,
        model: rung.model ?? current.model,
        thinking: (rung.thinking ?? current.thinking) as ModelAssignment["thinking"],
      };
    }
  }
  return next;
}

// ── assignTools ───────────────────────────────────────────────
const TEST_TOOLS: Record<TestStrategy, string[]> = {
  unit: ["vitest", "jest"],
  integration: ["vitest", "jsdom"],
  e2e: ["playwriter", "agent-browser", "playwright"],
  "property-based": ["bombadil"],
  snapshot: ["vitest"],
};

const DOMAIN_TOOLS: Record<string, string[]> = {
  rust: ["cargo", "agent-spec"],
  web: ["agent-spec", "tdd-guard"],
  security: ["lonkero", "agent-spec", "tdd-guard"],
  design: ["agent-spec"],
};

export function assignTools(
  test: TestStrategy[] = [],
  domain: string[] = [],
): string[] {
  const tools = new Set<string>(["agent-spec"]);
  for (const t of test) {
    for (const tool of TEST_TOOLS[t] ?? []) tools.add(tool);
  }
  for (const d of domain) {
    for (const tool of DOMAIN_TOOLS[d] ?? []) tools.add(tool);
  }
  return [...tools];
}

// ── applyPosture ──────────────────────────────────────────────
export interface PostureOverrides {
  enforceGates: boolean;
  requireIntegrationReview: boolean;
  maxReviewRounds: number;
}

export function applyPosture(posture: Posture): PostureOverrides {
  const { phase, quality } = posture;

  if (quality === "none") {
    return { enforceGates: false, requireIntegrationReview: false, maxReviewRounds: 1 };
  }

  if (phase === "prototype") {
    return { enforceGates: true, requireIntegrationReview: false, maxReviewRounds: 2 };
  }

  if (phase === "mvp") {
    return {
      enforceGates: true,
      requireIntegrationReview: quality === "strict",
      maxReviewRounds: 3,
    };
  }

  return { enforceGates: true, requireIntegrationReview: true, maxReviewRounds: 5 };
}
