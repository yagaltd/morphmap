/**
 * mech — Phase C transition-tool tests.
 * Run: `bun test ./.morphmap/mech/`
 *
 * Proves the three tool handlers enforce gates end-to-end and return the
 * agent-facing { accepted/passed, failures } shape. Covers: good/bad
 * submissions, idempotent re-submit, wrong-state rejection, reviewFile →
 * qualityReviewExists, integration pass/fail + branch→done, rollup default.
 */

import { test, expect, describe } from "bun:test";
import {
  approveLeaf,
  emptyEvidence,
  integrationGate,
  submitLeaf,
  type BranchState,
  type Leaf,
  type LeafStatus,
} from "./index";

// ── fixtures ──────────────────────────────────────────────────
function ev(over: Partial<ReturnType<typeof emptyEvidence>> = {}) {
  return { ...emptyEvidence(), ...over };
}
function leaf(over: Partial<Leaf> = {}): Leaf {
  return {
    id: "a",
    status: "in_progress",
    bottleneck: "standard",
    qa: "full",
    test: ["unit"],
    model: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "off" },
    tools: ["agent-spec"],
    evidence: emptyEvidence(),
    reviewRounds: 0,
    trace: "b/a",
    ...over,
  };
}
function branch(leaves: Leaf[] = [], over: Partial<BranchState> = {}): BranchState {
  const lm: Record<string, Leaf> = {};
  for (const l of leaves) lm[l.id] = l;
  return {
    branchId: "b",
    status: "in_progress",
    quality: "fast",
    leaves: lm,
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
    ...over,
  };
}
const goodSubmit = ev({
  agentSpecPassed: true,
  tddGuardPassed: true,
  npmTestPassed: true,
  npmBuildPassed: true,
  boundariesClean: true,
  filesChanged: ["src/a.ts"],
});
const goodReview = ev({
  qualityReviewExists: true,
  qualityReviewP0Count: 0,
  qualityReviewP1Count: 0,
  healthCheckPassed: true,
  bombadilPassed: true,
  lonkeroPassed: true,
});

// ── submit_leaf ───────────────────────────────────────────────
describe("submit_leaf", () => {
  test("accepted with complete evidence → status submitted", () => {
    const out = submitLeaf(branch([leaf()]), {
      leafId: "a",
      evidence: goodSubmit,
      allowedChanges: ["src/a.ts"],
    });
    expect(out.accepted).toBe(true);
    expect(out.failures).toEqual([]);
    expect(out.transitioned).toBe(true);
    expect(out.newState.leaves["a"].status).toBe("submitted");
  });

  test("rejected when tests failed → failures populated, status unchanged", () => {
    const out = submitLeaf(branch([leaf()]), {
      leafId: "a",
      evidence: ev({ ...goodSubmit, npmTestPassed: false }),
      allowedChanges: ["src/a.ts"],
    });
    expect(out.accepted).toBe(false);
    expect(out.failures.length).toBeGreaterThan(0);
    expect(out.failures[0]).toContain("npmTestAndBuild");
    expect(out.newState.leaves["a"].status).toBe("in_progress");
  });

  test("idempotent re-submit is accepted (crash recovery)", () => {
    const b = branch([leaf({ status: "submitted" })], {
      transitions: [
        { leaf: "a", from: "in_progress", to: "submitted", timestamp: "t", evidenceHash: "x" },
      ],
    });
    // re-submit same evidence — but hash differs from recorded "x", so NOT idempotent;
    // build a state where the recorded hash matches goodSubmit
    // (simulated by submitting fresh, then re-submitting)
    let state = branch([leaf()]);
    const first = submitLeaf(state, { leafId: "a", evidence: goodSubmit, allowedChanges: ["src/a.ts"] });
    state = first.newState;
    const replay = submitLeaf(state, { leafId: "a", evidence: goodSubmit, allowedChanges: ["src/a.ts"] });
    expect(replay.idempotentSkip).toBe(true);
    expect(replay.accepted).toBe(true);
    expect(state.transitions.length).toBe(1); // no duplicate
    expect(replay.newState.transitions.length).toBe(1);
  });

  test("wrong-state leaf (done) rejected", () => {
    const out = submitLeaf(branch([leaf({ status: "done" })]), {
      leafId: "a",
      evidence: goodSubmit,
    });
    expect(out.accepted).toBe(false);
    expect(out.failures[0]).toMatch(/illegal/);
  });

  test("unknown leaf rejected", () => {
    const out = submitLeaf(branch(), { leafId: "ghost", evidence: goodSubmit });
    expect(out.accepted).toBe(false);
    expect(out.failures[0]).toMatch(/not found/);
  });
});

// ── approve_leaf ──────────────────────────────────────────────
describe("approve_leaf", () => {
  test("accepted with clean review → status done", () => {
    const out = approveLeaf(branch([leaf({ status: "in_review" })]), {
      leafId: "a",
      evidence: goodReview,
    });
    expect(out.accepted).toBe(true);
    expect(out.newState.leaves["a"].status).toBe("done");
  });

  test("rejected on unresolved P0", () => {
    const out = approveLeaf(branch([leaf({ status: "in_review" })]), {
      leafId: "a",
      evidence: ev({ ...goodReview, qualityReviewP0Count: 1 }),
    });
    expect(out.accepted).toBe(false);
    expect(out.failures[0]).toContain("P0Count=0");
  });

  test("reviewFile sets qualityReviewExists → passes even without explicit flag", () => {
    const out = approveLeaf(branch([leaf({ status: "in_review" })]), {
      leafId: "a",
      reviewFile: ".morphmap/quality-review-001.md",
      evidence: ev({ ...goodReview, qualityReviewExists: false }),
    });
    expect(out.accepted).toBe(true); // reviewFile overrode the false flag
    expect(out.newState.leaves["a"].evidence.qualityReviewExists).toBe(true);
  });

  test("wrong-state (in_progress, not yet reviewed) rejected", () => {
    const out = approveLeaf(branch([leaf({ status: "in_progress" })]), {
      leafId: "a",
      evidence: goodReview,
    });
    expect(out.accepted).toBe(false);
    expect(out.failures[0]).toMatch(/illegal/);
  });

  test("approve blocked when runtime dep (needs-contract) not done", () => {
    // §3.6: integrateBlocked must be false to complete. dep at in_review →
    // contract ok (build unblocked) but runtime not done → approve must fail.
    const graph = { nodes: ["a", "dep"], edges: [{ from: "a", to: "dep", kind: "needs-contract" }] };
    const b = branch([
      leaf({ id: "a", status: "in_review" }),
      leaf({ id: "dep", status: "in_review" }),
    ]);
    const out = approveLeaf(b, { leafId: "a", evidence: goodReview, graph, allLeaves: b.leaves });
    expect(out.accepted).toBe(false);
    expect(out.failures[0]).toContain("runtimeDependenciesMet");
  });
});

// ── integration_gate ──────────────────────────────────────────
describe("integration_gate", () => {
  const graph = { nodes: [], edges: [] };

  test("passed when all leaves done + review file → branch done", () => {
    const b = branch([leaf({ status: "done" })], {
      integrationStatus: { ...branch().integrationStatus, reviewFileExists: true, healthCheckPassed: true },
    });
    const out = integrationGate(b, { graph, reviewFile: ".morphmap/integration-review-001.md" });
    expect(out.passed).toBe(true);
    expect(out.failures).toEqual([]);
    expect(out.newState.status).toBe("done");
    expect(out.newState.integrationStatus.allLeavesComplete).toBe(true);
  });

  test("failed when a leaf is not done", () => {
    const b = branch([leaf({ status: "in_progress" })], {
      integrationStatus: { ...branch().integrationStatus, reviewFileExists: true },
    });
    const out = integrationGate(b, { graph });
    expect(out.passed).toBe(false);
    expect(out.failures[0]).toContain("allLeavesComplete");
    expect(out.newState.status).toBe("in_progress"); // unchanged
  });

  test("failed when no integration review file", () => {
    const b = branch([leaf({ status: "done" })]);
    const out = integrationGate(b, { graph });
    expect(out.passed).toBe(false);
    expect(out.failures[0]).toContain("integrationReviewExists");
  });

  test("reviewFile flag satisfies integrationReviewExists", () => {
    const b = branch([leaf({ status: "done" })], {
      integrationStatus: { ...branch().integrationStatus, healthCheckPassed: true },
    });
    const out = integrationGate(b, { graph, reviewFile: ".morphmap/integration-review-001.md" });
    expect(out.passed).toBe(true);
  });

  test("sub-branches: rollup defaults from childBranchStatus", () => {
    const b = branch([], {
      subBranches: ["c"],
      childBranchStatus: { c: "done" },
      integrationStatus: { ...branch().integrationStatus, reviewFileExists: true, healthCheckPassed: true },
    });
    const out = integrationGate(b, { graph });
    expect(out.passed).toBe(true);
    expect(out.newState.status).toBe("done");
  });

  test("sub-branches incomplete → failed", () => {
    const b = branch([], {
      subBranches: ["c"],
      childBranchStatus: { c: "in_progress" },
      integrationStatus: { ...branch().integrationStatus, reviewFileExists: true },
    });
    const out = integrationGate(b, { graph });
    expect(out.passed).toBe(false);
    expect(out.failures[0]).toContain("allLeavesComplete");
  });

  test("cross-leaf conflict blocks integration", () => {
    const b = branch([leaf({ status: "done" })], {
      integrationStatus: { ...branch().integrationStatus, reviewFileExists: true, healthCheckPassed: true, crossLeafConflicts: ["a↔b"] },
    });
    const out = integrationGate(b, { graph });
    expect(out.passed).toBe(false);
    expect(out.failures[0]).toContain("crossLeafConflictsResolved");
  });
});

// ── end-to-end: submit → review → done → integrate ────────────
describe("end-to-end lifecycle via tools", () => {
  const graph = { nodes: [], edges: [] };

  test("full path: submit → approve → integrate branch", () => {
    let state = branch([leaf({ status: "in_progress" })]);

    // 1. submit
    const s = submitLeaf(state, { leafId: "a", evidence: goodSubmit, allowedChanges: ["src/a.ts"] });
    expect(s.accepted).toBe(true);
    state = s.newState;
    expect(state.leaves["a"].status).toBe("submitted");

    // 2. branch agent picks up for review (no gate)
    state = { ...state, leaves: { ...state.leaves, a: { ...state.leaves["a"], status: "in_review" as LeafStatus } } };

    // 3. approve
    const r = approveLeaf(state, { leafId: "a", evidence: goodReview });
    expect(r.accepted).toBe(true);
    state = r.newState;
    expect(state.leaves["a"].status).toBe("done");

    // 4. integrate
    state = { ...state, integrationStatus: { ...state.integrationStatus, reviewFileExists: true, healthCheckPassed: true } };
    const i = integrationGate(state, { graph });
    expect(i.passed).toBe(true);
    expect(i.newState.status).toBe("done");
  });

  test("cannot skip review: submit→approve(early) rejected", () => {
    let state = branch([leaf({ status: "in_progress" })]);
    const s = submitLeaf(state, { leafId: "a", evidence: goodSubmit, allowedChanges: ["src/a.ts"] });
    state = s.newState;
    // approve without moving to in_review → illegal (submitted→done not legal)
    const r = approveLeaf(state, { leafId: "a", evidence: goodReview });
    expect(r.accepted).toBe(false);
  });
});
