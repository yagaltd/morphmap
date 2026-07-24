import { test, expect, beforeEach, afterEach } from "bun:test";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { applySubmitLeaf, applyApproveLeaf, applyIntegrationGate } from "./morphmap-tools";
import { saveState, loadState } from "./morphmap-state";
import { emptyEvidence } from "../mech";
import type { BranchState, Leaf } from "../mech";

const TMP_DIR = `/tmp/morphmap-tools-test-${randomBytes(4).toString("hex")}`;
const STATE_PATH = `${TMP_DIR}/state.db`;

function makeLeaf(id: string, status: Leaf["status"] = "in_progress"): Leaf {
  return {
    id,
    status,
    bottleneck: "standard",
    qa: "review",
    test: ["unit"],
    model: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "off" },
    tools: ["agent-spec"],
    evidence: emptyEvidence(),
    reviewRounds: 0,
    trace: `test/${id}`,
  };
}

function makeState(leaves: Record<string, Leaf> = {}): BranchState {
  return {
    branchId: "test/branch",
    status: "in_progress",
    quality: "fast",
    leaves,
    subBranches: [],
    childBranchStatus: {},
    transitions: [],
    integrationStatus: {
      reviewFileExists: false,
      healthCheckPassed: null,
      bombadilPassed: null,
      lonkeroPassed: null,
      allLeavesComplete: false,
      crossLeafConflicts: [],
    },
  };
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

// ── applySubmitLeaf ──────────────────────────────────────────

test("submit_leaf: accepted with complete evidence → status submitted", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "in_progress"),
  }));
  const r = await applySubmitLeaf(STATE_PATH, {
    leafId: "jwt-verify",
    evidence: {
      agentSpecPassed: true,
      tddGuardPassed: true,
      npmTestPassed: true,
      npmBuildPassed: true,
      boundariesClean: true,
      filesChanged: ["src/auth/login.ts"],
      testsRun: ["valid token returns session"],
    },
    allowedChanges: ["src/auth/login.ts"],
  });
  expect(r.ok).toBe(true);
  expect(r.summary).toContain("submitted");
  const state = loadState(STATE_PATH)!;
  expect(state.leaves["jwt-verify"].status).toBe("submitted");
});

test("submit_leaf: rejected when tests failed → status unchanged", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "in_progress"),
  }));
  const r = await applySubmitLeaf(STATE_PATH, {
    leafId: "jwt-verify",
    evidence: {
      agentSpecPassed: true,
      tddGuardPassed: null,
      npmTestPassed: false,
      npmBuildPassed: true,
      boundariesClean: true,
      filesChanged: [],
      testsRun: [],
    },
  });
  expect(r.ok).toBe(false);
  expect(r.summary).toContain("rejected");
  const state = loadState(STATE_PATH)!;
  expect(state.leaves["jwt-verify"].status).toBe("in_progress");
});

test("submit_leaf: idempotent re-submit is accepted (crash recovery)", async () => {
  const state = makeState({
    "jwt-verify": makeLeaf("jwt-verify", "submitted"),
  });
  // Simulate a prior transition already logged
  state.transitions = [{
    leaf: "jwt-verify", from: "in_progress", to: "submitted",
    timestamp: "2026-07-23T12:00:00Z", evidenceHash: "abc123",
  }];
  saveState(STATE_PATH, state);
  const r = await applySubmitLeaf(STATE_PATH, {
    leafId: "jwt-verify",
    evidence: {
      agentSpecPassed: true,
      tddGuardPassed: true,
      npmTestPassed: true,
      npmBuildPassed: true,
      boundariesClean: true,
      filesChanged: ["src/auth/login.ts"],
      testsRun: ["valid token"],
    },
    allowedChanges: ["src/auth/login.ts"],
  });
  expect(r.ok).toBe(true);
  expect(r.summary).toContain("submitted");
});

test("submit_leaf: no state.db → ok=false", async () => {
  const r = await applySubmitLeaf(STATE_PATH, {
    leafId: "jwt-verify",
    evidence: { agentSpecPassed: true, npmTestPassed: true, npmBuildPassed: true, boundariesClean: true, filesChanged: [], testsRun: [] },
  });
  expect(r.ok).toBe(false);
  expect(r.summary).toContain("no .morphmap/state.db");
});

// ── applyApproveLeaf ─────────────────────────────────────────

test("approve_leaf: accepted with clean review → status done", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "in_review"),
  }));
  const r = await applyApproveLeaf(STATE_PATH, {
    leafId: "jwt-verify",
    reviewFile: ".morphmap/quality-review-001-test.md",
    evidence: {
      qualityReviewExists: true,
      qualityReviewP0Count: 0,
      qualityReviewP1Count: 0,
      healthCheckPassed: true,
      bombadilPassed: null,
      lonkeroPassed: null,
    },
  });
  expect(r.ok).toBe(true);
  expect(r.summary).toContain("done");
  const state = loadState(STATE_PATH)!;
  expect(state.leaves["jwt-verify"].status).toBe("done");
});

test("approve_leaf: rejected on unresolved P0", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "in_review"),
  }));
  const r = await applyApproveLeaf(STATE_PATH, {
    leafId: "jwt-verify",
    reviewFile: ".morphmap/quality-review-001-test.md",
    evidence: {
      qualityReviewExists: true,
      qualityReviewP0Count: 1,
      qualityReviewP1Count: 0,
      healthCheckPassed: true,
    },
  });
  expect(r.ok).toBe(false);
  expect(r.summary).toContain("rejected");
});

test("approve_leaf: wrong state (in_progress, not yet reviewed) rejected", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "in_progress"),
  }));
  const r = await applyApproveLeaf(STATE_PATH, {
    leafId: "jwt-verify",
    evidence: { qualityReviewExists: true, qualityReviewP0Count: 0, qualityReviewP1Count: 0 },
  });
  expect(r.ok).toBe(false);
});

// ── applyIntegrationGate ─────────────────────────────────────

test("integration_gate: passed when all leaves done + review file", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "done"),
    "jwt-refresh": makeLeaf("jwt-refresh", "done"),
  }));
  const r = await applyIntegrationGate(STATE_PATH, {
    reviewFile: ".morphmap/integration-review-001-test.md",
  });
  expect(r.ok).toBe(true);
  expect(r.summary).toContain("done");
  const state = loadState(STATE_PATH)!;
  expect(state.status).toBe("done");
});

test("integration_gate: failed when a leaf is not done", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "done"),
    "jwt-refresh": makeLeaf("jwt-refresh", "in_progress"),
  }));
  const r = await applyIntegrationGate(STATE_PATH, {
    reviewFile: ".morphmap/integration-review-001-test.md",
  });
  expect(r.ok).toBe(false);
  expect(r.summary).toContain("rejected");
});

test("integration_gate: failed when no review file", async () => {
  saveState(STATE_PATH, makeState({
    "jwt-verify": makeLeaf("jwt-verify", "done"),
  }));
  const r = await applyIntegrationGate(STATE_PATH, {});
  expect(r.ok).toBe(false);
  expect(r.summary).toContain("rejected");
});
