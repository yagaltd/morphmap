/**
 * mech — recovery.test.ts
 * Tests for failure classification, stuck leaf detection, recovery reports.
 */

import { describe, test, expect } from "bun:test";
import { classifyFailure, findStuckLeaves, recoveryReport } from "./recovery";
import type { BranchState } from "./types";

// ── classifyFailure ───────────────────────────────────────────
describe("classifyFailure", () => {
  test("null error → unknown, not retryable", () => {
    const c = classifyFailure(null);
    expect(c.category).toBe("unknown");
    expect(c.isRetryable).toBe(false);
  });

  test("undefined error → unknown, not retryable", () => {
    const c = classifyFailure(undefined);
    expect(c.category).toBe("unknown");
    expect(c.isRetryable).toBe(false);
  });

  test("string error with timeout pattern → timeout", () => {
    const c = classifyFailure("ETIMEDOUT: connection timed out");
    expect(c.category).toBe("timeout");
    expect(c.isRetryable).toBe(true);
  });

  test("string error with rate limit → rate-limit", () => {
    const c = classifyFailure("429 Too Many Requests — rate limit exceeded");
    expect(c.category).toBe("rate-limit");
    expect(c.isRetryable).toBe(true);
  });

  test("string error with auth → auth", () => {
    const c = classifyFailure("401 Unauthorized — invalid API key");
    expect(c.category).toBe("auth");
    expect(c.isRetryable).toBe(false);
  });

  test("string error with JSON parse → tool-parse", () => {
    const c = classifyFailure("SyntaxError: Unexpected token in JSON at position 42");
    expect(c.category).toBe("tool-parse");
    expect(c.isRetryable).toBe(true);
  });

  test("string error with model context → model", () => {
    const c = classifyFailure("context length exceeded — token limit reached");
    expect(c.category).toBe("model");
    expect(c.isRetryable).toBe(true);
  });

  test("string error with permanent → permanent", () => {
    const c = classifyFailure("ENOENT: no such file or directory");
    expect(c.category).toBe("permanent");
    expect(c.isRetryable).toBe(false);
  });

  test("Error object → classify by message", () => {
    const c = classifyFailure(new Error("ECONNREFUSED — connection refused"));
    expect(c.category).toBe("transient");
    expect(c.isRetryable).toBe(true);
  });

  test("object with message field → classify by message", () => {
    const c = classifyFailure({ message: "socket hang up" });
    expect(c.category).toBe("transient");
    expect(c.isRetryable).toBe(true);
  });

  test("object without message → unknown", () => {
    const c = classifyFailure({ code: 500 });
    expect(c.category).toBe("unknown");
    expect(c.isRetryable).toBe(false);
  });

  test("unknown string → unknown but retryable", () => {
    const c = classifyFailure("something completely unexpected happened");
    expect(c.category).toBe("unknown");
    expect(c.isRetryable).toBe(true);
  });

  test("auth takes priority over transient", () => {
    const c = classifyFailure("401 unauthorized timeout");
    expect(c.category).toBe("auth");
  });

  test("rate-limit takes priority over timeout", () => {
    const c = classifyFailure("429 rate limit exceeded — request timed out");
    expect(c.category).toBe("rate-limit");
  });
});

// ── findStuckLeaves ───────────────────────────────────────────
describe("findStuckLeaves", () => {
  function freshState(): BranchState {
    return {
      branchId: "test/branch",
      status: "in_progress",
      quality: "fast",
      leaves: {},
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

  test("no active leaves → empty", () => {
    const state = freshState();
    const now = new Date("2026-07-24T12:00:00Z");
    expect(findStuckLeaves(state, 30, now)).toEqual([]);
  });

  test("done leaves are not stuck", () => {
    const state = freshState();
    state.leaves["done-leaf"] = {
      id: "done-leaf",
      status: "done",
      bottleneck: "standard",
      qa: "review",
      test: ["unit"],
      model: { provider: "deepseek", model: "flash", thinking: "off" },
      tools: ["agent-spec"],
      evidence: {
        specExists: true, specScenarioCount: 1, specFileCount: 1,
        agentSpecPassed: true, tddGuardPassed: null, npmTestPassed: true,
        npmBuildPassed: true, boundariesClean: true, filesChanged: [], testsRun: [],
        healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
        qualityReviewExists: true, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
      },
      reviewRounds: 0,
      trace: "done-leaf",
    };
    const now = new Date("2026-07-24T12:00:00Z");
    expect(findStuckLeaves(state, 30, now)).toEqual([]);
  });

  test("in_progress leaf with no transitions → stuck", () => {
    const state = freshState();
    state.leaves["stuck-leaf"] = {
      id: "stuck-leaf",
      status: "in_progress",
      bottleneck: "standard",
      qa: "review",
      test: ["unit"],
      model: { provider: "deepseek", model: "flash", thinking: "off" },
      tools: ["agent-spec"],
      evidence: {
        specExists: true, specScenarioCount: 1, specFileCount: 1,
        agentSpecPassed: false, tddGuardPassed: null, npmTestPassed: false,
        npmBuildPassed: false, boundariesClean: false, filesChanged: [], testsRun: [],
        healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
        qualityReviewExists: false, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
      },
      reviewRounds: 0,
      trace: "stuck-leaf",
    };
    const now = new Date("2026-07-24T12:00:00Z");
    expect(findStuckLeaves(state, 30, now)).toEqual(["stuck-leaf"]);
  });

  test("in_progress leaf with recent transition → not stuck", () => {
    const state = freshState();
    state.leaves["active-leaf"] = {
      id: "active-leaf",
      status: "in_progress",
      bottleneck: "standard",
      qa: "review",
      test: ["unit"],
      model: { provider: "deepseek", model: "flash", thinking: "off" },
      tools: ["agent-spec"],
      evidence: {
        specExists: true, specScenarioCount: 1, specFileCount: 1,
        agentSpecPassed: false, tddGuardPassed: null, npmTestPassed: false,
        npmBuildPassed: false, boundariesClean: false, filesChanged: [], testsRun: [],
        healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
        qualityReviewExists: false, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
      },
      reviewRounds: 0,
      trace: "active-leaf",
    };
    state.transitions.push({
      leaf: "active-leaf",
      from: "pending",
      to: "in_progress",
      timestamp: "2026-07-24T11:50:00Z", // 10 min ago
      evidenceHash: "abc",
    });
    const now = new Date("2026-07-24T12:00:00Z");
    expect(findStuckLeaves(state, 30, now)).toEqual([]);
  });

  test("in_progress leaf with old transition → stuck", () => {
    const state = freshState();
    state.leaves["old-leaf"] = {
      id: "old-leaf",
      status: "in_progress",
      bottleneck: "standard",
      qa: "review",
      test: ["unit"],
      model: { provider: "deepseek", model: "flash", thinking: "off" },
      tools: ["agent-spec"],
      evidence: {
        specExists: true, specScenarioCount: 1, specFileCount: 1,
        agentSpecPassed: false, tddGuardPassed: null, npmTestPassed: false,
        npmBuildPassed: false, boundariesClean: false, filesChanged: [], testsRun: [],
        healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
        qualityReviewExists: false, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
      },
      reviewRounds: 0,
      trace: "old-leaf",
    };
    state.transitions.push({
      leaf: "old-leaf",
      from: "pending",
      to: "in_progress",
      timestamp: "2026-07-24T10:00:00Z", // 2 hours ago
      evidenceHash: "abc",
    });
    const now = new Date("2026-07-24T12:00:00Z");
    expect(findStuckLeaves(state, 30, now)).toEqual(["old-leaf"]);
  });

  test("submitted leaf considered active → stuck if idle", () => {
    const state = freshState();
    state.leaves["submitted-idle"] = {
      id: "submitted-idle",
      status: "submitted",
      bottleneck: "standard",
      qa: "review",
      test: ["unit"],
      model: { provider: "deepseek", model: "flash", thinking: "off" },
      tools: ["agent-spec"],
      evidence: {
        specExists: true, specScenarioCount: 1, specFileCount: 1,
        agentSpecPassed: true, tddGuardPassed: null, npmTestPassed: true,
        npmBuildPassed: true, boundariesClean: true, filesChanged: [], testsRun: [],
        healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
        qualityReviewExists: false, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
      },
      reviewRounds: 0,
      trace: "submitted-idle",
    };
    state.transitions.push({
      leaf: "submitted-idle",
      from: "in_progress",
      to: "submitted",
      timestamp: "2026-07-24T10:00:00Z",
      evidenceHash: "def",
    });
    const now = new Date("2026-07-24T12:00:00Z");
    expect(findStuckLeaves(state, 30, now)).toEqual(["submitted-idle"]);
  });

  test("custom threshold respected", () => {
    const state = freshState();
    state.leaves["recent"] = {
      id: "recent",
      status: "in_progress",
      bottleneck: "standard",
      qa: "review",
      test: ["unit"],
      model: { provider: "deepseek", model: "flash", thinking: "off" },
      tools: ["agent-spec"],
      evidence: {
        specExists: true, specScenarioCount: 1, specFileCount: 1,
        agentSpecPassed: false, tddGuardPassed: null, npmTestPassed: false,
        npmBuildPassed: false, boundariesClean: false, filesChanged: [], testsRun: [],
        healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
        qualityReviewExists: false, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
      },
      reviewRounds: 0,
      trace: "recent",
    };
    state.transitions.push({
      leaf: "recent",
      from: "pending",
      to: "in_progress",
      timestamp: "2026-07-24T11:54:00Z", // 6 min ago
      evidenceHash: "abc",
    });
    const now = new Date("2026-07-24T12:00:00Z");
    // Default 30 min → not stuck, but 4 min threshold → stuck (6 min idle > 4 min threshold)
    expect(findStuckLeaves(state, 4, now)).toEqual(["recent"]);
  });
});

// ── recoveryReport ────────────────────────────────────────────
describe("recoveryReport", () => {
  function stateWithLeaves(
    active: Array<{ id: string; status: "in_progress" | "submitted"; ts: string }>,
    done: string[],
  ): BranchState {
    const state: BranchState = {
      branchId: "test/branch",
      status: "in_progress",
      quality: "fast",
      leaves: {},
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

    for (const a of active) {
      state.leaves[a.id] = {
        id: a.id,
        status: a.status,
        bottleneck: "standard",
        qa: "review",
        test: ["unit"],
        model: { provider: "deepseek", model: "flash", thinking: "off" },
        tools: ["agent-spec"],
        evidence: {
          specExists: true, specScenarioCount: 1, specFileCount: 1,
          agentSpecPassed: false, tddGuardPassed: null, npmTestPassed: false,
          npmBuildPassed: false, boundariesClean: false, filesChanged: [], testsRun: [],
          healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
          qualityReviewExists: false, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
        },
        reviewRounds: 0,
        trace: a.id,
      };
      state.transitions.push({
        leaf: a.id,
        from: "pending",
        to: a.status,
        timestamp: a.ts,
        evidenceHash: "abc",
      });
    }

    for (const d of done) {
      state.leaves[d] = {
        id: d,
        status: "done",
        bottleneck: "standard",
        qa: "review",
        test: ["unit"],
        model: { provider: "deepseek", model: "flash", thinking: "off" },
        tools: ["agent-spec"],
        evidence: {
          specExists: true, specScenarioCount: 1, specFileCount: 1,
          agentSpecPassed: true, tddGuardPassed: null, npmTestPassed: true,
          npmBuildPassed: true, boundariesClean: true, filesChanged: [], testsRun: [],
          healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
          qualityReviewExists: true, qualityReviewP0Count: 0, qualityReviewP1Count: 0,
        },
        reviewRounds: 0,
        trace: d,
      };
    }

    return state;
  }

  test("no active leaves → healthy", () => {
    const state = stateWithLeaves([], ["done-a", "done-b"]);
    const report = recoveryReport(state);
    expect(report.branchHealth).toBe("healthy");
    expect(report.stuckCount).toBe(0);
    expect(report.totalActiveLeaves).toBe(0);
  });

  test("all active leaves progressing → healthy", () => {
    const state = stateWithLeaves(
      [{ id: "leaf-a", status: "in_progress", ts: "2026-07-24T11:55:00Z" }],
      [],
    );
    const report = recoveryReport(state, new Date("2026-07-24T12:00:00Z"), 30);
    expect(report.branchHealth).toBe("healthy");
    expect(report.stuckCount).toBe(0);
  });

  test("some stuck but less than half → degraded", () => {
    const state = stateWithLeaves(
      [
        { id: "leaf-a", status: "in_progress", ts: "2026-07-24T11:55:00Z" },
        { id: "leaf-b", status: "in_progress", ts: "2026-07-24T10:00:00Z" }, // stuck
        { id: "leaf-c", status: "in_progress", ts: "2026-07-24T11:50:00Z" },
      ],
      [],
    );
    const report = recoveryReport(state, new Date("2026-07-24T12:00:00Z"), 30);
    expect(report.branchHealth).toBe("degraded");
    expect(report.stuckCount).toBe(1);
    expect(report.stuckLeaves).toEqual(["leaf-b"]);
  });

  test("majority stuck → critical", () => {
    const state = stateWithLeaves(
      [
        { id: "leaf-a", status: "in_progress", ts: "2026-07-24T10:00:00Z" }, // stuck
        { id: "leaf-b", status: "in_progress", ts: "2026-07-24T10:00:00Z" }, // stuck
      ],
      [],
    );
    const report = recoveryReport(state, new Date("2026-07-24T12:00:00Z"), 30);
    expect(report.branchHealth).toBe("critical");
    expect(report.stuckCount).toBe(2);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  test("healthy when only done leaves", () => {
    const state = stateWithLeaves([], ["done-a"]);
    const report = recoveryReport(state);
    expect(report.branchHealth).toBe("healthy");
    expect(report.totalActiveLeaves).toBe(0);
    expect(report.recommendations).toContain("no active leaves — branch may be idle");
  });

  test("report has ISO timestamp", () => {
    const state = stateWithLeaves([], []);
    const report = recoveryReport(state, new Date("2026-07-24T12:00:00Z"));
    expect(report.timestamp).toBe("2026-07-24T12:00:00.000Z");
  });
});
