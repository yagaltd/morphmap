/**
 * mech — sub-map.test.ts
 * Tests for child status sync and orphan detection.
 */

import { describe, test, expect } from "bun:test";
import { syncChildStatuses, detectSubmapOrphans } from "./sub-map";
import type { BranchState } from "./types";

// ── Helpers ───────────────────────────────────────────────────
function emptyBranch(overrides: Partial<BranchState> = {}): BranchState {
  return {
    branchId: "parent",
    status: "pending",
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
    ...overrides,
  };
}

function childState(
  branchId: string,
  status: BranchState["status"],
): BranchState {
  return {
    branchId,
    status,
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

// ── syncChildStatuses ─────────────────────────────────────────
describe("syncChildStatuses", () => {
  test("empty children → no change to status map", () => {
    const parent = emptyBranch();
    const result = syncChildStatuses(parent, []);
    expect(result.childBranchStatus).toEqual({});
    expect(result.status).toBe("pending");
  });

  test("syncs child statuses into parent", () => {
    const parent = emptyBranch({ subBranches: ["child-a", "child-b"] });
    const children = [
      childState("child-a", "in_progress"),
      childState("child-b", "done"),
    ];
    const result = syncChildStatuses(parent, children);
    expect(result.childBranchStatus).toEqual({
      "child-a": "in_progress",
      "child-b": "done",
    });
  });

  test("preserves existing child statuses not in current sync", () => {
    const parent = emptyBranch({
      subBranches: ["child-a", "child-b"],
      childBranchStatus: { "child-c": "done" },
    });
    // Only sync child-a and child-b; child-c should be preserved
    const children = [childState("child-a", "done")];
    const result = syncChildStatuses(parent, children);
    expect(result.childBranchStatus).toEqual({
      "child-a": "done",
      "child-c": "done",
    });
  });

  test("any child blocked → parent becomes blocked", () => {
    const parent = emptyBranch({ subBranches: ["child-a"] });
    const children = [childState("child-a", "blocked")];
    const result = syncChildStatuses(parent, children);
    expect(result.status).toBe("blocked");
  });

  test("all children done → parent stays in_progress (awaiting integration gate)", () => {
    const parent = emptyBranch({
      subBranches: ["child-a"],
      status: "in_progress",
      childBranchStatus: { "child-a": "in_progress" },
    });
    const children = [childState("child-a", "done")];
    const result = syncChildStatuses(parent, children);
    expect(result.status).toBe("in_progress");
  });

  test("all children done + parent was pending → becomes in_progress", () => {
    const parent = emptyBranch({
      subBranches: ["child-a"],
      status: "pending",
    });
    const children = [childState("child-a", "done")];
    const result = syncChildStatuses(parent, children);
    expect(result.status).toBe("in_progress");
  });

  test("immutable — original parent state unchanged", () => {
    const parent = emptyBranch({ subBranches: ["child-a"] });
    const originalStatus = parent.status;
    const children = [childState("child-a", "blocked")];
    const result = syncChildStatuses(parent, children);
    expect(result.status).toBe("blocked");
    expect(parent.status).toBe(originalStatus); // original untouched
    expect(parent.childBranchStatus).toEqual({});
  });

  test("mixed blocked + done → parent blocked (blocked takes priority)", () => {
    const parent = emptyBranch({ subBranches: ["a", "b"] });
    const children = [
      childState("a", "done"),
      childState("b", "blocked"),
    ];
    const result = syncChildStatuses(parent, children);
    expect(result.status).toBe("blocked");
  });
});

// ── detectSubmapOrphans ───────────────────────────────────────
describe("detectSubmapOrphans", () => {
  test("no sub-branches → empty", () => {
    const state = emptyBranch();
    expect(detectSubmapOrphans(state, [])).toEqual([]);
  });

  test("sub-branch in_progress with active session → not orphaned", () => {
    const state = emptyBranch({
      subBranches: ["child-a"],
      childBranchStatus: { "child-a": "in_progress" },
    });
    const active = ["child-a"];
    expect(detectSubmapOrphans(state, active)).toEqual([]);
  });

  test("sub-branch in_progress without active session → orphaned", () => {
    const state = emptyBranch({
      subBranches: ["child-a"],
      childBranchStatus: { "child-a": "in_progress" },
    });
    const active: string[] = [];
    expect(detectSubmapOrphans(state, active)).toEqual(["child-a"]);
  });

  test("done sub-branch not active → NOT orphaned (already finished)", () => {
    const state = emptyBranch({
      subBranches: ["child-a"],
      childBranchStatus: { "child-a": "done" },
    });
    expect(detectSubmapOrphans(state, [])).toEqual([]);
  });

  test("multiple children, one orphaned", () => {
    const state = emptyBranch({
      subBranches: ["child-a", "child-b", "child-c"],
      childBranchStatus: {
        "child-a": "in_progress",
        "child-b": "done",
        "child-c": "in_progress",
      },
    });
    const active = ["child-a"];
    expect(detectSubmapOrphans(state, active)).toEqual(["child-c"]);
  });

  test("all in_progress, none active → all orphaned", () => {
    const state = emptyBranch({
      subBranches: ["a", "b"],
      childBranchStatus: { "a": "in_progress", "b": "in_progress" },
    });
    expect(detectSubmapOrphans(state, [])).toEqual(["a", "b"]);
  });

  test("no childBranchStatus entries → empty", () => {
    const state = emptyBranch({ subBranches: ["orphan"] });
    expect(detectSubmapOrphans(state, [])).toEqual([]);
  });
});
