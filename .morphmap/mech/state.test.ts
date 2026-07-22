/**
 * mech — Phase A core tests.
 * Run: `bun test .morphmap/mech/`
 *
 * Covers: transition legality, idempotency (crash-recovery), gate
 * short-circuit, immutable updates, dependency resolution
 * (needs vs needs-contract, build vs integrate), child-state rollup,
 * evidence-hash stability, config lookups, posture overrides.
 */

import { test, expect, describe } from "bun:test";
import {
  assignModel,
  assignTools,
  applyPosture,
  canStartLeaf,
  emptyEvidence,
  evidenceHash,
  leafMachine,
  LEAF_TRANSITIONS,
  rollupChildState,
  runGates,
  transitionLeaf,
  StateMachine,
  type BranchState,
  type DependencyGraph,
  type Gate,
  type Leaf,
  type LeafEvidence,
  type LeafStatus,
  type TransitionGateCtx,
} from "./index";

// ── fixtures ──────────────────────────────────────────────────
function makeLeaf(id: string, status: LeafStatus = "pending"): Leaf {
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
    trace: `branch/${id}`,
  };
}

function makeBranch(leaves: Leaf[] = []): BranchState {
  const leafMap: Record<string, Leaf> = {};
  for (const l of leaves) leafMap[l.id] = l;
  return {
    branchId: "test/branch",
    status: "in_progress",
    quality: "fast",
    leaves: leafMap,
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

// ── StateMachine legality ─────────────────────────────────────
describe("StateMachine legality", () => {
  test("legal forward path", () => {
    expect(leafMachine.canTransition("pending", "in_progress")).toBe(true);
    expect(leafMachine.canTransition("in_progress", "submitted")).toBe(true);
    expect(leafMachine.canTransition("submitted", "in_review")).toBe(true);
    expect(leafMachine.canTransition("in_review", "done")).toBe(true);
  });

  test("illegal skips blocked", () => {
    expect(leafMachine.canTransition("pending", "done")).toBe(false);
    expect(leafMachine.canTransition("pending", "in_review")).toBe(false);
    expect(leafMachine.canTransition("submitted", "done")).toBe(false);
  });

  test("wildcard → blocked from any state", () => {
    for (const s of leafMachine.states()) {
      expect(leafMachine.canTransition(s, "blocked")).toBe(true);
    }
  });

  test("revision loop in_review → in_progress", () => {
    expect(leafMachine.canTransition("in_review", "in_progress")).toBe(true);
  });

  test("contract revision escape hatch done → pending", () => {
    expect(leafMachine.canTransition("done", "pending")).toBe(true);
  });

  test("self-transition legal (idempotent)", () => {
    expect(leafMachine.canTransition("in_progress", "in_progress")).toBe(true);
  });

  test("blocked → in_progress only unblock", () => {
    expect(leafMachine.canTransition("blocked", "in_progress")).toBe(true);
    expect(leafMachine.canTransition("blocked", "done")).toBe(false);
  });

  test("done is terminal: done→done rejected (no silent mutation)", () => {
    expect(leafMachine.canTransition("done", "done")).toBe(false);
  });

  test("done escape hatch still legal (done→pending, done→blocked)", () => {
    expect(leafMachine.canTransition("done", "pending")).toBe(true);
    expect(leafMachine.canTransition("done", "blocked")).toBe(true);
  });

  test("states() enumerates all lifecycle states", () => {
    const states = leafMachine.states();
    expect(states).toContain("pending");
    expect(states).toContain("done");
    expect(states).toContain("blocked");
  });

  test("custom machine: empty table → only self-transitions", () => {
    const m = new StateMachine<string>([]);
    expect(m.canTransition("a", "a")).toBe(true);
    expect(m.canTransition("a", "b")).toBe(false);
  });
});

// ── transitionLeaf ────────────────────────────────────────────
describe("transitionLeaf", () => {
  test("applies legal transition + logs entry", () => {
    const branch = makeBranch([makeLeaf("a")]);
    const out = transitionLeaf(branch, {
      leafId: "a",
      to: "in_progress",
      now: () => "2026-01-01T00:00:00Z",
    });
    expect(out.transitioned).toBe(true);
    expect(out.result.pass).toBe(true);
    expect(out.state.leaves["a"].status).toBe("in_progress");
    expect(out.state.transitions).toHaveLength(1);
    expect(out.state.transitions[0]).toMatchObject({
      leaf: "a",
      from: "pending",
      to: "in_progress",
      timestamp: "2026-01-01T00:00:00Z",
    });
  });

  test("illegal transition rejected, no log", () => {
    const branch = makeBranch([makeLeaf("a")]);
    const out = transitionLeaf(branch, { leafId: "a", to: "done" });
    expect(out.transitioned).toBe(false);
    expect(out.result.pass).toBe(false);
    expect(out.result.reason).toMatch(/illegal/);
    expect(out.state.leaves["a"].status).toBe("pending");
    expect(out.state.transitions).toHaveLength(0);
  });

  test("unknown leaf rejected", () => {
    const out = transitionLeaf(makeBranch(), { leafId: "ghost", to: "in_progress" });
    expect(out.transitioned).toBe(false);
    expect(out.result.pass).toBe(false);
    expect(out.result.reason).toMatch(/not found/);
  });

  test("idempotent: replay same (to, evidence) with matching status → no-op pass", () => {
    let branch = makeBranch([makeLeaf("a")]);
    branch = transitionLeaf(branch, {
      leafId: "a",
      to: "in_progress",
      now: () => "2026-01-01T00:00:00Z",
    }).state;
    // replay: same target, same (empty) evidence hash, status already in_progress
    const out = transitionLeaf(branch, {
      leafId: "a",
      to: "in_progress",
      now: () => "2026-02-02T00:00:00Z",
    });
    expect(out.idempotentSkip).toBe(true);
    expect(out.transitioned).toBe(false);
    expect(out.result.pass).toBe(true);
    expect(out.state.transitions).toHaveLength(1); // no duplicate
  });

  test("NOT idempotent: new evidence → applies again", () => {
    let branch = makeBranch([makeLeaf("a")]);
    branch = transitionLeaf(branch, { leafId: "a", to: "in_progress" }).state;
    // different evidence → different hash → not a replay
    const out = transitionLeaf(branch, {
      leafId: "a",
      to: "in_progress",
      evidence: { agentSpecPassed: true },
    });
    expect(out.idempotentSkip).toBe(false);
    expect(out.transitioned).toBe(true);
  });

  test("gates: first block short-circuits", () => {
    const branch = makeBranch([makeLeaf("a")]);
    const blocking: Gate<TransitionGateCtx> = {
      name: "specExists",
      run: () => ({ pass: false, reason: "spec missing", severity: "block" }),
    };
    const out = transitionLeaf(branch, {
      leafId: "a",
      to: "in_progress",
      gates: [blocking],
    });
    expect(out.transitioned).toBe(false);
    expect(out.result.pass).toBe(false);
    expect(out.result.reason).toContain("specExists");
  });

  test("gates: warn severity does not block, surfaces in outcome", () => {
    const branch = makeBranch([makeLeaf("a")]);
    const warn: Gate<TransitionGateCtx> = {
      name: "estLOC",
      run: () => ({ pass: false, reason: "est 250 LOC", severity: "warn" }),
    };
    const out = transitionLeaf(branch, {
      leafId: "a",
      to: "in_progress",
      gates: [warn],
    });
    expect(out.transitioned).toBe(true);
    expect(out.result.pass).toBe(true);
    expect(out.result.severity).toBe("warn");
    expect(out.result.reason).toContain("estLOC");
  });

  test("evidence merged on transition", () => {
    const branch = makeBranch([makeLeaf("a", "in_progress")]);
    const out = transitionLeaf(branch, {
      leafId: "a",
      to: "submitted",
      evidence: { agentSpecPassed: true, npmTestPassed: true },
    });
    expect(out.transitioned).toBe(true);
    expect(out.state.leaves["a"].evidence.agentSpecPassed).toBe(true);
    expect(out.state.leaves["a"].evidence.npmTestPassed).toBe(true);
  });

  test("reviewRounds increments on revision loop only", () => {
    let branch = makeBranch([makeLeaf("a", "in_review")]);
    branch.leaves["a"].reviewRounds = 1;
    const out = transitionLeaf(branch, { leafId: "a", to: "in_progress" });
    expect(out.state.leaves["a"].reviewRounds).toBe(2);

    // pending → in_progress does NOT bump reviewRounds
    const branch2 = makeBranch([makeLeaf("b")]);
    const out2 = transitionLeaf(branch2, { leafId: "b", to: "in_progress" });
    expect(out2.state.leaves["b"].reviewRounds).toBe(0);
  });

  test("immutable: input state untouched", () => {
    const branch = makeBranch([makeLeaf("a")]);
    const snapshot = JSON.stringify(branch);
    transitionLeaf(branch, { leafId: "a", to: "in_progress" });
    expect(JSON.stringify(branch)).toBe(snapshot);
  });

  test("full lifecycle walks all 4 forward states", () => {
    let branch = makeBranch([makeLeaf("a")]);
    for (const to of ["in_progress", "submitted", "in_review", "done"] as LeafStatus[]) {
      branch = transitionLeaf(branch, { leafId: "a", to }).state;
      expect(branch.leaves["a"].status).toBe(to);
    }
    expect(branch.transitions).toHaveLength(4);
  });

  test("any state → blocked via transitionLeaf (WORKER_BLOCKER)", () => {
    const branch = makeBranch([makeLeaf("a", "in_progress")]);
    const out = transitionLeaf(branch, { leafId: "a", to: "blocked" });
    expect(out.transitioned).toBe(true);
    expect(out.state.leaves["a"].status).toBe("blocked");
  });

  test("blocked → in_progress via transitionLeaf (unblock)", () => {
    const branch = makeBranch([makeLeaf("a", "blocked")]);
    const out = transitionLeaf(branch, { leafId: "a", to: "in_progress" });
    expect(out.transitioned).toBe(true);
    expect(out.state.leaves["a"].status).toBe("in_progress");
  });

  test("done leaf rejects evidence mutation (done→done with new evidence)", () => {
    const branch = makeBranch([makeLeaf("a", "done")]);
    const out = transitionLeaf(branch, {
      leafId: "a",
      to: "done",
      evidence: { agentSpecPassed: true },
    });
    expect(out.transitioned).toBe(false);
    expect(out.result.pass).toBe(false);
    expect(out.state.leaves["a"].evidence.agentSpecPassed).toBe(false);
  });

  test("done leaf idempotent replay (same evidence) is safe no-op", () => {
    const base = makeBranch([makeLeaf("a", "done")]);
    const branch: BranchState = {
      ...base,
      transitions: [
        { leaf: "a", from: "in_review", to: "done", timestamp: "t", evidenceHash: evidenceHash(emptyEvidence()) },
      ],
    };
    const out = transitionLeaf(branch, { leafId: "a", to: "done" });
    expect(out.idempotentSkip).toBe(true);
    expect(out.result.pass).toBe(true);
  });
});

// ── evidenceHash ──────────────────────────────────────────────
describe("evidenceHash", () => {
  test("stable for same object", () => {
    expect(evidenceHash(emptyEvidence())).toBe(evidenceHash(emptyEvidence()));
  });

  test("key-order independent", () => {
    const a: LeafEvidence = { ...emptyEvidence(), agentSpecPassed: true, npmTestPassed: true };
    const b: LeafEvidence = { ...emptyEvidence(), npmTestPassed: true, agentSpecPassed: true };
    expect(evidenceHash(a)).toBe(evidenceHash(b));
  });

  test("changes when evidence changes", () => {
    const a = emptyEvidence();
    const b = { ...emptyEvidence(), agentSpecPassed: true };
    expect(evidenceHash(a)).not.toBe(evidenceHash(b));
  });

  test("array order matters (filesChanged)", () => {
    const a = { ...emptyEvidence(), filesChanged: ["x.ts", "y.ts"] };
    const b = { ...emptyEvidence(), filesChanged: ["y.ts", "x.ts"] };
    expect(evidenceHash(a)).not.toBe(evidenceHash(b));
  });
});

// ── runGates (chain helper) ───────────────────────────────────
describe("runGates", () => {
  const ctx = (leaf: Leaf): TransitionGateCtx => ({ leaf, evidence: leaf.evidence, to: "done" });

  test("all pass → pass", () => {
    const pass: Gate<TransitionGateCtx> = { name: "g", run: () => ({ pass: true }) };
    expect(runGates([pass], ctx(makeLeaf("a"))).pass).toBe(true);
  });

  test("block stops immediately", () => {
    const block: Gate<TransitionGateCtx> = { name: "b", run: () => ({ pass: false, reason: "x" }) };
    expect(runGates([block], ctx(makeLeaf("a")))).toMatchObject({ pass: false });
  });

  test("warnings collected, pass stays true", () => {
    const w: Gate<TransitionGateCtx> = {
      name: "w",
      run: () => ({ pass: false, reason: "soft", severity: "warn" }),
    };
    const r = runGates([w], ctx(makeLeaf("a")));
    expect(r.pass).toBe(true);
    expect(r.severity).toBe("warn");
    expect(r.reason).toContain("w");
  });
});

// ── canStartLeaf (dependency resolution) ──────────────────────
describe("canStartLeaf", () => {
  const graph: DependencyGraph = {
    nodes: ["a", "b", "c"],
    edges: [
      { from: "b", to: "a", kind: "needs" },
      { from: "c", to: "a", kind: "needs-contract" },
    ],
  };

  test("[needs:] blocks build+integrate until target done", () => {
    const leaves = { a: makeLeaf("a", "in_review"), b: makeLeaf("b"), c: makeLeaf("c") };
    let r = canStartLeaf("b", graph, leaves);
    expect(r.buildBlocked).toBe(true);
    expect(r.integrateBlocked).toBe(true);

    leaves["a"].status = "done";
    r = canStartLeaf("b", graph, leaves);
    expect(r.buildBlocked).toBe(false);
    expect(r.integrateBlocked).toBe(false);
  });

  test("[needs-contract:] build unblocks at in_review (not submitted), integrate at done", () => {
    const leaves: Record<string, Leaf> = { a: makeLeaf("a", "pending"), c: makeLeaf("c") };
    expect(canStartLeaf("c", graph, leaves).buildBlocked).toBe(true);

    // submitted is NOT enough — contract may be rejected in review
    leaves["a"].status = "submitted";
    expect(canStartLeaf("c", graph, leaves).buildBlocked).toBe(true);

    // in_review = contract reviewed & valid → build unblocks
    leaves["a"].status = "in_review";
    const r1 = canStartLeaf("c", graph, leaves);
    expect(r1.buildBlocked).toBe(false);
    expect(r1.integrateBlocked).toBe(true);

    leaves["a"].status = "done";
    const r2 = canStartLeaf("c", graph, leaves);
    expect(r2.buildBlocked).toBe(false);
    expect(r2.integrateBlocked).toBe(false);
  });

  test("leaf with no deps → fully unblocked", () => {
    const r = canStartLeaf("a", graph, { a: makeLeaf("a") });
    expect(r.buildBlocked).toBe(false);
    expect(r.integrateBlocked).toBe(false);
    expect(r.blockedBy).toHaveLength(0);
  });

  test("blocked target satisfies nothing", () => {
    const leaves = { a: makeLeaf("a", "blocked"), b: makeLeaf("b") };
    const r = canStartLeaf("b", graph, leaves);
    expect(r.buildBlocked).toBe(true);
    expect(r.blockedBy).toContain("a");
  });

  test("blockedBy lists contract vs runtime reasons", () => {
    const leaves = { a: makeLeaf("a", "pending"), c: makeLeaf("c") };
    const r = canStartLeaf("c", graph, leaves);
    expect(r.blockedBy.some((b) => b.includes("contract"))).toBe(true);
  });

  test("mixed [needs] + [needs-contract] edges", () => {
    const g: DependencyGraph = {
      nodes: ["x", "y", "z"],
      edges: [
        { from: "z", to: "x", kind: "needs" },
        { from: "z", to: "y", kind: "needs-contract" },
      ],
    };
    const leaves = { x: makeLeaf("x", "done"), y: makeLeaf("y", "in_review"), z: makeLeaf("z") };
    const r = canStartLeaf("z", g, leaves);
    expect(r.buildBlocked).toBe(false);
    expect(r.integrateBlocked).toBe(true); // y not done
  });

  test("ghost target defaults to pending → blocks", () => {
    const g: DependencyGraph = {
      nodes: ["b"],
      edges: [{ from: "b", to: "ghost", kind: "needs" }],
    };
    const r = canStartLeaf("b", g, { b: makeLeaf("b") });
    expect(r.buildBlocked).toBe(true);
    expect(r.blockedBy).toContain("ghost");
  });
});

// ── rollupChildState ──────────────────────────────────────────
describe("rollupChildState", () => {
  test("all complete", () => {
    const r = rollupChildState({ ui: "done", api: "done" });
    expect(r.allComplete).toBe(true);
    expect(r.anyBlocked).toBe(false);
    expect(r.inProgress).toHaveLength(0);
  });

  test("any blocked", () => {
    const r = rollupChildState({ ui: "done", api: "blocked" });
    expect(r.allComplete).toBe(false);
    expect(r.anyBlocked).toBe(true);
  });

  test("empty → not complete (no false success)", () => {
    expect(rollupChildState({}).allComplete).toBe(false);
  });

  test("in-progress children listed", () => {
    expect(rollupChildState({ ui: "in_progress" }).inProgress).toEqual(["ui"]);
  });
});

// ── config: assignModel ───────────────────────────────────────
describe("assignModel", () => {
  test("blocking bottleneck → strongest", () => {
    const m = assignModel("blocking", "full");
    expect(m.model).toBe("claude-sonnet-4");
    expect(m.thinking).toBe("max");
  });

  test("strict qa always strongest regardless of bottleneck", () => {
    const m = assignModel("standard", "strict");
    expect(m.model).toBe("claude-sonnet-4");
  });

  test("full qa bumps standard leaf to pro", () => {
    const m = assignModel("standard", "full");
    expect(m.model).toBe("deepseek-v4-pro");
    expect(m.thinking).toBe("high");
  });

  test("none qa + standard → cheapest flash", () => {
    const m = assignModel("standard", "none");
    expect(m.model).toBe("deepseek-v4-flash");
    expect(m.thinking).toBe("off");
  });

  test("e2e test → vision-capable model", () => {
    const m = assignModel("standard", "review", ["e2e"]);
    expect(m.provider).toBe("zai");
    expect(m.model).toBe("glm-5.2");
  });
});

// ── config: assignTools ───────────────────────────────────────
describe("assignTools", () => {
  test("always includes agent-spec", () => {
    expect(assignTools()).toContain("agent-spec");
  });

  test("unit test → test runner", () => {
    const t = assignTools(["unit"]);
    expect(t).toEqual(expect.arrayContaining(["vitest", "jest"]));
  });

  test("security domain → lonkero + tdd-guard", () => {
    const t = assignTools([], ["security"]);
    expect(t).toEqual(expect.arrayContaining(["lonkero", "tdd-guard"]));
  });

  test("dedupes across sources", () => {
    const t = assignTools(["unit", "snapshot"], ["web"]);
    expect(new Set(t).size).toBe(t.length);
    expect(t).toContain("tdd-guard");
  });
});

// ── config: applyPosture ──────────────────────────────────────
describe("applyPosture", () => {
  test("quality none → gates advisory only", () => {
    const o = applyPosture({
      phase: "production", compatibility: "compat", scope: "broad",
      quality: "none", budget: "balanced",
    });
    expect(o.enforceGates).toBe(false);
    expect(o.requireIntegrationReview).toBe(false);
  });

  test("prototype → no integration review required", () => {
    const o = applyPosture({
      phase: "prototype", compatibility: "break", scope: "broad",
      quality: "fast", budget: "balanced",
    });
    expect(o.enforceGates).toBe(true);
    expect(o.requireIntegrationReview).toBe(false);
    expect(o.maxReviewRounds).toBe(2);
  });

  test("production → full enforcement", () => {
    const o = applyPosture({
      phase: "production", compatibility: "compat", scope: "narrow",
      quality: "strict", budget: "generous",
    });
    expect(o.enforceGates).toBe(true);
    expect(o.requireIntegrationReview).toBe(true);
    expect(o.maxReviewRounds).toBe(5);
  });

  test("mvp + strict → integration review required", () => {
    const o = applyPosture({
      phase: "mvp", compatibility: "compat", scope: "broad",
      quality: "strict", budget: "balanced",
    });
    expect(o.requireIntegrationReview).toBe(true);
  });
});
