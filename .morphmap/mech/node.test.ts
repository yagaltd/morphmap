import { test, expect } from "bun:test";
import { isLeaf, isBranch, nodeToLeaf, nodeToBranchState, emptyEvidence } from "./types";
import type { Node, Leaf, BranchState } from "./types";

test("isLeaf: empty children = leaf", () => {
  const node: Node = {
    id: "auth/jwt-verify",
    status: "in_progress",
    children: [],
    metadata: {},
  };
  expect(isLeaf(node)).toBe(true);
  expect(isBranch(node)).toBe(false);
});

test("isBranch: non-empty children = branch", () => {
  const node: Node = {
    id: "auth",
    status: "in_progress",
    children: ["auth/jwt-verify", "auth/jwt-refresh"],
    metadata: {},
  };
  expect(isBranch(node)).toBe(true);
  expect(isLeaf(node)).toBe(false);
});

test("nodeToLeaf: extracts leaf fields from metadata", () => {
  const node: Node = {
    id: "auth/jwt-verify",
    status: "in_progress",
    children: [],
    metadata: {
      bottleneck: "blocking",
      qa: "full",
      test: ["unit", "integration"],
      model: { provider: "anthropic", model: "claude-sonnet-4", thinking: "max" },
      tools: ["agent-spec", "tdd-guard"],
      evidence: emptyEvidence(),
      reviewRounds: 0,
      trace: "auth/jwt-verify",
    },
  };
  const leaf = nodeToLeaf(node);
  expect(leaf.id).toBe("auth/jwt-verify");
  expect(leaf.status).toBe("in_progress");
  expect(leaf.bottleneck).toBe("blocking");
  expect(leaf.qa).toBe("full");
  expect(leaf.test).toEqual(["unit", "integration"]);
  expect(leaf.model.provider).toBe("anthropic");
  expect(leaf.model.model).toBe("claude-sonnet-4");
  expect(leaf.tools).toEqual(["agent-spec", "tdd-guard"]);
  expect(leaf.reviewRounds).toBe(0);
  expect(leaf.trace).toBe("auth/jwt-verify");
});

test("nodeToLeaf: defaults for missing metadata", () => {
  const node: Node = {
    id: "auth/jwt-verify",
    status: "pending",
    children: [],
    metadata: {},
  };
  const leaf = nodeToLeaf(node);
  expect(leaf.bottleneck).toBe("standard");
  expect(leaf.qa).toBe("review");
  expect(leaf.test).toEqual(["unit"]);
  expect(leaf.tools).toEqual(["agent-spec"]);
  expect(leaf.reviewRounds).toBe(0);
});

test("nodeToBranchState: extracts branch fields from metadata", () => {
  const node: Node = {
    id: "auth",
    status: "in_progress",
    children: ["auth/jwt-verify"],
    metadata: {
      quality: "fast",
      leaves: { "auth/jwt-verify": { id: "auth/jwt-verify", status: "pending", bottleneck: "standard", qa: "review", test: ["unit"], model: { provider: "deepseek", model: "deepseek-v4-flash", thinking: "off" }, tools: ["agent-spec"], evidence: emptyEvidence(), reviewRounds: 0, trace: "auth/auth/jwt-verify" } },
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
    },
  };
  const branch = nodeToBranchState(node);
  expect(branch.branchId).toBe("auth");
  expect(branch.status).toBe("in_progress");
  expect(branch.quality).toBe("fast");
  expect(Object.keys(branch.leaves).length).toBe(1);
  expect(branch.subBranches).toEqual([]);
  expect(branch.integrationStatus.allLeavesComplete).toBe(false);
});

test("nodeToBranchState: defaults for missing metadata", () => {
  const node: Node = {
    id: "auth",
    status: "pending",
    children: [],
    metadata: {},
  };
  const branch = nodeToBranchState(node);
  expect(branch.quality).toBe("fast");
  expect(branch.leaves).toEqual({});
  expect(branch.subBranches).toEqual([]);
  expect(branch.integrationStatus.allLeavesComplete).toBe(false);
});

test("Node status uses unified NodeStatus", () => {
  // NodeStatus should accept all LeafStatus values
  const statuses = ["pending", "in_progress", "submitted", "in_review", "blocked", "abandoned", "done"];
  for (const s of statuses) {
    const node: Node = {
      id: "test",
      status: s as any,
      children: [],
      metadata: {},
    };
    expect(node.status).toBe(s);
  }
});

test("Node with empty children is leaf, with children is branch", () => {
  const leaf: Node = { id: "a/b", status: "pending", children: [], metadata: {} };
  const branch: Node = { id: "a", status: "pending", children: ["a/b"], metadata: {} };
  expect(isLeaf(leaf)).toBe(true);
  expect(isBranch(branch)).toBe(true);
  expect(isLeaf(branch)).toBe(false);
  expect(isBranch(leaf)).toBe(false);
});
