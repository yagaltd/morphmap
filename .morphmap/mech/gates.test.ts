/**
 * mech — Phase B gate tests.
 * Run: `bun test ./.morphmap/mech/`
 *
 * Proves the gates actually block bad submissions/approvals and pass good
 * ones — the "done = proof" enforcement. Each gate's pass/fail/skip edge,
 * the chains' short-circuit + warn-accumulate behaviour, QA-tier
 * conditionals, tool-absent skips, and the full submit_leaf/approve_leaf
 * flows wired through transitionLeaf (Phase A + B integration).
 */

import { test, expect, describe } from "bun:test";
import {
  agentSpecLifecycle,
  allGateNames,
  allLeavesComplete,
  ambiguitiesResolved,
  bombadilPassed,
  boundariesClean,
  crossLeafConflictsResolved,
  crossLeafNoConflict,
  dependenciesResolvable,
  emptyEvidence,
  filesMatchSpec,
  gatesForLeafTransition,
  GATE_CHAINS,
  healthCheckPassed,
  integrationHealthCheckPassed,
  integrationReviewExists,
  leafMachine,
  lonkeroPassed,
  modelAssigned,
  npmTestAndBuild,
  outcomesSatisfied,
  p0CountZero,
  p1CountZeroIfFull,
  preSpawnGates,
  qualityReviewExists,
  reviewGates,
  runIntegrationGates,
  specEstLOC,
  specFileCount,
  specFileExists,
  specScenarioCount,
  submitGates,
  tddGuardPassed,
  toolsAssigned,
  transitionLeaf,
  type BranchState,
  type DependencyGraph,
  type IntegrationGateCtx,
  type Leaf,
  type LeafStatus,
  type TransitionGateCtx,
} from "./index";

// ── fixtures ──────────────────────────────────────────────────
function ev(over: Partial<ReturnType<typeof emptyEvidence>> = {}) {
  return { ...emptyEvidence(), ...over };
}
function leaf(over: Partial<Leaf> = {}): Leaf {
  return {
    id: "x",
    status: "pending",
    bottleneck: "standard",
    qa: "review",
    test: ["unit"],
    model: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "off" },
    tools: ["agent-spec"],
    evidence: emptyEvidence(),
    reviewRounds: 0,
    trace: "b/x",
    ...over,
  };
}
function ctx(over: Partial<TransitionGateCtx> = {}): TransitionGateCtx {
  return { leaf: leaf(), evidence: emptyEvidence(), to: "in_progress", ...over };
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
function intCtx(over: Partial<IntegrationGateCtx> = {}): IntegrationGateCtx {
  return {
    branch: branch(),
    graph: { nodes: [], edges: [] },
    rollup: { allComplete: false, anyBlocked: false, inProgress: [] },
    ...over,
  };
}

// ── pre-spawn gates ───────────────────────────────────────────
describe("pre-spawn gates", () => {
  test("specFileExists: missing→fail, present→pass", () => {
    expect(specFileExists.run(ctx({ evidence: ev({ specExists: false }) })).pass).toBe(false);
    expect(specFileExists.run(ctx({ evidence: ev({ specExists: true }) })).pass).toBe(true);
  });

  test("specScenarioCount: 5→pass, 6→fail", () => {
    expect(specScenarioCount.run(ctx({ evidence: ev({ specScenarioCount: 5 }) })).pass).toBe(true);
    const r = specScenarioCount.run(ctx({ evidence: ev({ specScenarioCount: 6 }) }));
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/6/);
  });

  test("specFileCount: 3→pass, 4→fail", () => {
    expect(specFileCount.run(ctx({ evidence: ev({ specFileCount: 3 }) })).pass).toBe(true);
    expect(specFileCount.run(ctx({ evidence: ev({ specFileCount: 4 }) })).pass).toBe(false);
  });

  test("specEstLOC is SOFT: 250 LOC warns, never blocks a chain", () => {
    const r = specEstLOC.run(ctx({ leaf: leaf({ estLoc: 250 }), evidence: ev() }));
    expect(r.pass).toBe(false);
    expect(r.severity).toBe("warn");
    // a warn-only gate must not block the full pre-spawn chain
    const chain = preSpawnGates.map((g) => g);
    const allReasons = chain
      .map((g) => g.run(ctx({ leaf: leaf({ estLoc: 250 }), evidence: ev({ specExists: true, specScenarioCount: 2, specFileCount: 1 }) })))
      .filter((x) => !x.pass && x.severity === "block");
    expect(allReasons).toHaveLength(0);
  });

  test("specEstLOC: [est-loc] override respected, default = scenarios × 30", () => {
    expect(specEstLOC.run(ctx({ leaf: leaf({ estLoc: 150 }) })).pass).toBe(true);
    // 7 scenarios × 30 = 210 → warn
    expect(specEstLOC.run(ctx({ evidence: ev({ specScenarioCount: 7 }) })).severity).toBe("warn");
  });

  test("modelAssigned: empty model→fail", () => {
    expect(modelAssigned.run(ctx({ leaf: leaf({ model: { provider: "", model: "", thinking: "off" } }) })).pass).toBe(false);
    expect(modelAssigned.run(ctx()).pass).toBe(true);
  });

  test("toolsAssigned: empty→fail", () => {
    expect(toolsAssigned.run(ctx({ leaf: leaf({ tools: [] }) })).pass).toBe(false);
    expect(toolsAssigned.run(ctx()).pass).toBe(true);
  });

  test("dependenciesResolvable: blocked→fail, resolved→pass, no graph→skip(pass)", () => {
    const graph: DependencyGraph = { nodes: ["x", "y"], edges: [{ from: "x", to: "y", kind: "needs" }] };
    expect(
      dependenciesResolvable.run(ctx({ leaf: leaf({ id: "x" }), graph, allLeaves: { x: leaf({ id: "x" }), y: leaf({ id: "y", status: "pending" }) } })).pass,
    ).toBe(false);
    expect(
      dependenciesResolvable.run(ctx({ leaf: leaf({ id: "x" }), graph, allLeaves: { x: leaf({ id: "x" }), y: leaf({ id: "y", status: "done" }) } })).pass,
    ).toBe(true);
    expect(dependenciesResolvable.run(ctx()).pass).toBe(true); // no graph → skip
  });

  test("ambiguitiesResolved: no questions→skip, resolved→pass, unresolved material→fail", () => {
    // No grill file → skip
    expect(ambiguitiesResolved.run(ctx()).pass).toBe(true);
    // All resolved
    const resolved = [
      { id: "q1", question: "?", severity: "material" as const, discoveredBy: "a", resolution: "done", resolvedBy: "h", resolvedAt: "now" },
    ];
    expect(ambiguitiesResolved.run(ctx({ grillQuestions: resolved })).pass).toBe(true);
    // Unresolved material
    const unresolved = [
      { id: "q1", question: "?", severity: "material" as const, discoveredBy: "a", resolution: null, resolvedBy: null, resolvedAt: null },
    ];
    const r = ambiguitiesResolved.run(ctx({ grillQuestions: unresolved }));
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("q1");
  });

  test("ambiguitiesResolved: minor unresolved→pass (only material blocks)", () => {
    const questions = [
      { id: "q1", question: "?", severity: "minor" as const, discoveredBy: "a", resolution: null, resolvedBy: null, resolvedAt: null },
      { id: "q2", question: "?", severity: "clarification" as const, discoveredBy: "a", resolution: null, resolvedBy: null, resolvedAt: null },
    ];
    expect(ambiguitiesResolved.run(ctx({ grillQuestions: questions })).pass).toBe(true);
  });

  test("preSpawnGates chain: bad leaf fails at first block", () => {
    // spec missing → first gate blocks
    const results = preSpawnGates.map((g) => g.run(ctx({ evidence: ev({ specExists: false }) })));
    expect(results[0].pass).toBe(false);
  });
});

// ── submit gates ──────────────────────────────────────────────
describe("submit gates", () => {
  test("agentSpecLifecycle: false→fail, true→pass", () => {
    expect(agentSpecLifecycle.run(ctx({ evidence: ev({ agentSpecPassed: false }) })).pass).toBe(false);
    expect(agentSpecLifecycle.run(ctx({ evidence: ev({ agentSpecPassed: true }) })).pass).toBe(true);
  });

  test("tddGuardPassed: null→skip(pass), true→pass, false→fail", () => {
    expect(tddGuardPassed.run(ctx({ evidence: ev({ tddGuardPassed: null }) })).pass).toBe(true);
    expect(tddGuardPassed.run(ctx({ evidence: ev({ tddGuardPassed: true }) })).pass).toBe(true);
    expect(tddGuardPassed.run(ctx({ evidence: ev({ tddGuardPassed: false }) })).pass).toBe(false);
  });

  test("npmTestAndBuild: reports which failed", () => {
    expect(npmTestAndBuild.run(ctx({ evidence: ev({ npmTestPassed: true, npmBuildPassed: true }) })).pass).toBe(true);
    const r = npmTestAndBuild.run(ctx({ evidence: ev({ npmTestPassed: false, npmBuildPassed: true }) }));
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("npm test");
    expect(r.reason).not.toContain("npm build");
  });

  test("boundariesClean: false→fail", () => {
    expect(boundariesClean.run(ctx({ evidence: ev({ boundariesClean: false }) })).pass).toBe(false);
  });

  test("crossLeafNoConflict: overlap→fail, no siblings→pass, no data→skip", () => {
    const me = leaf({ id: "a" });
    const meEv = ev({ filesChanged: ["src/x.ts"] });
    const sib = leaf({ id: "b", evidence: ev({ filesChanged: ["src/x.ts"] }) });
    expect(crossLeafNoConflict.run(ctx({ leaf: me, evidence: meEv, allLeaves: { a: me, b: sib } })).pass).toBe(false);
    const sib2 = leaf({ id: "b", evidence: ev({ filesChanged: ["src/y.ts"] }) });
    expect(crossLeafNoConflict.run(ctx({ leaf: me, evidence: meEv, allLeaves: { a: me, b: sib2 } })).pass).toBe(true);
    expect(crossLeafNoConflict.run(ctx({ leaf: me, evidence: meEv })).pass).toBe(true); // no allLeaves
  });

  test("filesMatchSpec: stray→fail, bounded→pass, no spec→skip", () => {
    const e = ev({ filesChanged: ["src/a.ts", "src/b.ts"] });
    expect(filesMatchSpec.run(ctx({ evidence: e, allowedChanges: ["src/a.ts"] })).pass).toBe(false);
    expect(filesMatchSpec.run(ctx({ evidence: e, allowedChanges: ["src/a.ts", "src/b.ts"] })).pass).toBe(true);
    expect(filesMatchSpec.run(ctx({ evidence: e })).pass).toBe(true); // no allowedChanges
  });

  test("outcomesSatisfied: undefined→skip, all pass→pass, any fail→fail", () => {
    // No outcomes declared → skip
    expect(outcomesSatisfied.run(ctx()).pass).toBe(true);
    // All pass
    expect(outcomesSatisfied.run(ctx({ evidence: ev({ outcomeResults: { "tests.pass": { passed: true }, "build.pass": { passed: true } } }) })).pass).toBe(true);
    // One fails
    const r = outcomesSatisfied.run(ctx({ evidence: ev({ outcomeResults: { "tests.pass": { passed: false }, "build.pass": { passed: true } } }) }));
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("tests.pass");
    expect(r.reason).toContain("not satisfied");
  });

  test("outcomesSatisfied: empty object→skip", () => {
    expect(outcomesSatisfied.run(ctx({ evidence: ev({ outcomeResults: {} }) })).pass).toBe(true);
  });

  test("outcomesSatisfied: with digest still checks passed field", () => {
    const r = outcomesSatisfied.run(ctx({ evidence: ev({ outcomeResults: { "tests.pass": { passed: false, digest: "sha256:abc" } } }) }));
    expect(r.pass).toBe(false);
  });

  test("submitGates chain: complete-good evidence passes", () => {
    const good = ev({
      agentSpecPassed: true, tddGuardPassed: true,
      npmTestPassed: true, npmBuildPassed: true, boundariesClean: true,
      filesChanged: ["src/a.ts"],
    });
    const results = submitGates.map((g) => g.run(ctx({ evidence: good, allowedChanges: ["src/a.ts"] })));
    expect(results.every((r) => r.pass)).toBe(true);
  });
});

// ── review gates ──────────────────────────────────────────────
describe("review gates", () => {
  test("qualityReviewExists: false→fail", () => {
    expect(qualityReviewExists.run(ctx({ evidence: ev({ qualityReviewExists: false }) })).pass).toBe(false);
    expect(qualityReviewExists.run(ctx({ evidence: ev({ qualityReviewExists: true }) })).pass).toBe(true);
  });

  test("p0CountZero: 0→pass, >0→fail", () => {
    expect(p0CountZero.run(ctx({ evidence: ev({ qualityReviewP0Count: 0 }) })).pass).toBe(true);
    expect(p0CountZero.run(ctx({ evidence: ev({ qualityReviewP0Count: 2 }) })).pass).toBe(false);
  });

  test("p1CountZeroIfFull: enforced at full/strict, skipped at review/none", () => {
    const e = ev({ qualityReviewP1Count: 1 });
    expect(p1CountZeroIfFull.run(ctx({ leaf: leaf({ qa: "full" }), evidence: e })).pass).toBe(false);
    expect(p1CountZeroIfFull.run(ctx({ leaf: leaf({ qa: "strict" }), evidence: e })).pass).toBe(false);
    expect(p1CountZeroIfFull.run(ctx({ leaf: leaf({ qa: "review" }), evidence: e })).pass).toBe(true);
    expect(p1CountZeroIfFull.run(ctx({ leaf: leaf({ qa: "none" }), evidence: e })).pass).toBe(true);
  });

  test("optional-result gates skip on null, fail on false, pass on true", () => {
    for (const g of [healthCheckPassed, bombadilPassed, lonkeroPassed]) {
      expect(g.run(ctx({ evidence: ev({ [g.name]: null }) })).pass).toBe(true);
      expect(g.run(ctx({ evidence: ev({ [g.name]: false }) })).pass).toBe(false);
      expect(g.run(ctx({ evidence: ev({ [g.name]: true }) })).pass).toBe(true);
    }
  });

  test("reviewGates chain: clean full-qa leaf passes", () => {
    const good = ev({
      qualityReviewExists: true, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
      healthCheckPassed: true, bombadilPassed: true, lonkeroPassed: true,
    });
    const results = reviewGates.map((g) => g.run(ctx({ leaf: leaf({ qa: "full" }), evidence: good })));
    expect(results.every((r) => r.pass)).toBe(true);
  });
});

// ── integration gates ─────────────────────────────────────────
describe("integration gates", () => {
  test("allLeavesComplete: all done→pass, one not-done→fail", () => {
    const b = branch([leaf({ id: "a", status: "done" }), leaf({ id: "b", status: "done" })]);
    expect(allLeavesComplete.run(intCtx({ branch: b })).pass).toBe(true);
    // submitted is no longer enough — branch-done requires leaf-done
    const b2 = branch([leaf({ id: "a", status: "done" }), leaf({ id: "b", status: "submitted" })]);
    expect(allLeavesComplete.run(intCtx({ branch: b2 })).pass).toBe(false);
    const b3 = branch([leaf({ id: "a", status: "done" }), leaf({ id: "b", status: "in_progress" })]);
    expect(allLeavesComplete.run(intCtx({ branch: b3 })).pass).toBe(false);
  });

  test("allLeavesComplete: sub-branches incomplete→fail, complete→pass", () => {
    const b = branch([], { subBranches: ["c"] });
    expect(allLeavesComplete.run(intCtx({ branch: b, rollup: { allComplete: false, anyBlocked: false, inProgress: ["c"] } })).pass).toBe(false);
    expect(allLeavesComplete.run(intCtx({ branch: b, rollup: { allComplete: true, anyBlocked: false, inProgress: [] } })).pass).toBe(true);
  });

  test("crossLeafConflictsResolved", () => {
    expect(crossLeafConflictsResolved.run(intCtx()).pass).toBe(true);
    const b = branch([], { integrationStatus: { ...branch().integrationStatus, crossLeafConflicts: ["a↔b"] } });
    expect(crossLeafConflictsResolved.run(intCtx({ branch: b })).pass).toBe(false);
  });

  test("integrationReviewExists", () => {
    expect(integrationReviewExists.run(intCtx()).pass).toBe(false);
    const b = branch([], { integrationStatus: { ...branch().integrationStatus, reviewFileExists: true } });
    expect(integrationReviewExists.run(intCtx({ branch: b })).pass).toBe(true);
  });

  test("integrationHealthCheckPassed: null→skip, false→fail", () => {
    expect(integrationHealthCheckPassed.run(intCtx()).pass).toBe(true);
    const b = branch([], { integrationStatus: { ...branch().integrationStatus, healthCheckPassed: false } });
    expect(integrationHealthCheckPassed.run(intCtx({ branch: b })).pass).toBe(false);
  });

  test("runIntegrationGates: all good→pass, first block short-circuits", () => {
    const good = branch([leaf({ id: "a", status: "done" })], {
      integrationStatus: { reviewFileExists: true, healthCheckPassed: true, bombadilPassed: null, lonkeroPassed: null, allLeavesComplete: true, crossLeafConflicts: [] },
    });
    expect(runIntegrationGates(intCtx({ branch: good, rollup: { allComplete: true, anyBlocked: false, inProgress: [] } })).pass).toBe(true);

    const bad = branch([leaf({ id: "a", status: "in_progress" })]);
    const r = runIntegrationGates(intCtx({ branch: bad }));
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("allLeavesComplete");
  });
});

// ── lattice ───────────────────────────────────────────────────
describe("lattice (transition → gate chain)", () => {
  test("pre-spawn chain on pending→in_progress", () => {
    expect(gatesForLeafTransition("pending", "in_progress")).toBe(GATE_CHAINS.preSpawn);
  });
  test("submit chain on in_progress→submitted", () => {
    expect(gatesForLeafTransition("in_progress", "submitted")).toBe(GATE_CHAINS.submit);
  });
  test("review chain on in_review→done", () => {
    expect(gatesForLeafTransition("in_review", "done")).toBe(GATE_CHAINS.review);
  });
  test("no gates on process transitions (block/unblock/revision/escape)", () => {
    expect(gatesForLeafTransition("in_progress", "blocked")).toHaveLength(0);
    expect(gatesForLeafTransition("blocked", "in_progress")).toHaveLength(0);
    expect(gatesForLeafTransition("in_review", "in_progress")).toHaveLength(0);
    expect(gatesForLeafTransition("done", "pending")).toHaveLength(0);
    expect(gatesForLeafTransition("submitted", "in_review")).toHaveLength(0);
  });
  test("allGateNames is non-empty + unique", () => {
    const names = allGateNames();
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("specFileExists");
    expect(names).toContain("agentSpecLifecycle");
    expect(names).toContain("P0Count=0");
  });
});

// ── Phase A + B integration: full submit_leaf / approve_leaf ──
describe("full lifecycle via transitionLeaf + gates", () => {
  test("submit_leaf blocked when tests not run", () => {
    let b = branch([leaf({ id: "a", status: "in_progress" })]);
    const out = transitionLeaf(b, {
      leafId: "a",
      to: "submitted",
      gates: submitGates,
      evidence: ev({ agentSpecPassed: true, npmTestPassed: false, npmBuildPassed: true, boundariesClean: true }),
    });
    expect(out.transitioned).toBe(false);
    expect(out.result.pass).toBe(false);
    expect(out.result.reason).toContain("npmTestAndBuild");
    expect(b.leaves["a"].status).toBe("in_progress"); // unchanged
  });

  test("submit_leaf accepted with complete evidence", () => {
    const b = branch([leaf({ id: "a", status: "in_progress" })]);
    const out = transitionLeaf(b, {
      leafId: "a",
      to: "submitted",
      gates: submitGates,
      evidence: ev({
        agentSpecPassed: true, tddGuardPassed: true,
        npmTestPassed: true, npmBuildPassed: true, boundariesClean: true,
        filesChanged: ["src/a.ts"],
      }),
      allowedChanges: ["src/a.ts"],
    });
    expect(out.transitioned).toBe(true);
    expect(out.state.leaves["a"].status).toBe("submitted");
  });

  test("submit_leaf blocked on cross-leaf file conflict", () => {
    const b = branch([
      leaf({ id: "a", status: "in_progress", evidence: ev() }),
      leaf({ id: "b", status: "done", evidence: ev({ filesChanged: ["src/shared.ts"] }) }),
    ]);
    const out = transitionLeaf(b, {
      leafId: "a",
      to: "submitted",
      gates: submitGates,
      evidence: ev({
        agentSpecPassed: true, tddGuardPassed: true,
        npmTestPassed: true, npmBuildPassed: true, boundariesClean: true,
        filesChanged: ["src/shared.ts"],
      }),
      allLeaves: b.leaves,
    });
    expect(out.transitioned).toBe(false);
    expect(out.result.reason).toContain("crossLeafNoConflict");
  });

  test("approve_leaf (in_review→done) with reviewGates", () => {
    const b = branch([leaf({ id: "a", status: "in_review", qa: "full" })]);
    const out = transitionLeaf(b, {
      leafId: "a",
      to: "done",
      gates: reviewGates,
      evidence: ev({
        qualityReviewExists: true, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
        healthCheckPassed: true, bombadilPassed: true, lonkeroPassed: true,
      }),
    });
    expect(out.transitioned).toBe(true);
    expect(out.state.leaves["a"].status).toBe("done");
  });

  test("approve_leaf blocked on P1 at qa:full", () => {
    const b = branch([leaf({ id: "a", status: "in_review", qa: "full" })]);
    const out = transitionLeaf(b, {
      leafId: "a",
      to: "done",
      gates: reviewGates,
      evidence: ev({ qualityReviewExists: true, qualityReviewP0Count: 0, qualityReviewP1Count: 2 }),
    });
    expect(out.transitioned).toBe(false);
    expect(out.result.reason).toContain("P1Count=0");
  });

  test("approve_leaf passes P1 at qa:review (tier-conditional skip)", () => {
    const b = branch([leaf({ id: "a", status: "in_review", qa: "review" })]);
    const out = transitionLeaf(b, {
      leafId: "a",
      to: "done",
      gates: reviewGates,
      evidence: ev({ qualityReviewExists: true, qualityReviewP0Count: 0, qualityReviewP1Count: 5 }),
    });
    expect(out.transitioned).toBe(true);
  });

  test("spawn (pending→in_progress) blocked when spec missing (pre-spawn via transitionLeaf)", () => {
    const b = branch([leaf({ id: "a", status: "pending" })]);
    const out = transitionLeaf(b, {
      leafId: "a",
      to: "in_progress",
      gates: gatesForLeafTransition("pending", "in_progress"),
      evidence: ev({ specExists: false }),
    });
    expect(out.transitioned).toBe(false);
    expect(out.result.reason).toContain("specFileExists");
  });
});
