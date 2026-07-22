/**
 * mech — config.ts
 * Pure lookup tables. Zero agent judgment — read tags, return decisions.
 *
 *   assignModel(bottleneck, qa, test) → ModelAssignment
 *   assignTools(test, domain)          → tool list
 *   applyPosture(posture)              → gate-strictness overrides
 *
 * Tables mirror .morphmap/config leafProfiles + taskProfiles so the
 * deterministic layer and the human-maintained config stay in lockstep.
 *
 * Spec: docs/mech-mindmap.md §2.6
 */

import type {
  Bottleneck,
  ModelAssignment,
  Posture,
  QALevel,
  TestStrategy,
} from "./types";

// ── assignModel ───────────────────────────────────────────────
// Base by bottleneck (mirror config.leafProfiles). QA + test tags refine.
const BOTTLENECK_MODEL: Record<Bottleneck, ModelAssignment> = {
  blocking: { provider: "anthropic", model: "claude-sonnet-4", thinking: "max" },
  risky: { provider: "deepseek", model: "deepseek-v4-pro", thinking: "high" },
  standard: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "off" },
  time: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "high" },
  verify: { provider: "deepseek", model: "deepseek-v4-pro", thinking: "high" },
};

export function assignModel(
  bottleneck: Bottleneck,
  qa: QALevel,
  test: TestStrategy[] = [],
): ModelAssignment {
  // security/payment-critical → always strongest, regardless of bottleneck.
  if (qa === "strict") {
    return { provider: "anthropic", model: "claude-sonnet-4", thinking: "max" };
  }

  const base: ModelAssignment = { ...BOTTLENECK_MODEL[bottleneck] };

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
// Posture decides how strictly gates enforce. prototype relaxes
// integration review; production enforces everything.
export interface PostureOverrides {
  enforceGates: boolean; // false → every gate becomes a warning (§8.3 disable)
  requireIntegrationReview: boolean;
  maxReviewRounds: number; // cap CHANGES_REQUESTED → fix loops
}

export function applyPosture(posture: Posture): PostureOverrides {
  const { phase, quality } = posture;

  // [qa: none] on the branch → gates advisory only.
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

  // production
  return { enforceGates: true, requireIntegrationReview: true, maxReviewRounds: 5 };
}
