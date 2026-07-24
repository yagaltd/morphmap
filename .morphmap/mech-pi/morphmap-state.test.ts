import { test, expect, beforeEach, afterEach } from "bun:test";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { loadState, saveState, clearState, loadAllBranches, recordSession, findStuckLeaves, getActiveSessions } from "./morphmap-state";
import { emptyEvidence } from "../mech";
import type { BranchState } from "../mech";

const TMP_DIR = `/tmp/morphmap-state-test-${randomBytes(4).toString("hex")}`;

function makeTestState(overrides: Partial<BranchState> = {}): BranchState {
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
    ...overrides,
  };
}

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

test("round-trip: save → load → identical", () => {
  const statePath = `${TMP_DIR}/state.db`;
  const state = makeTestState({ status: "done" });
  saveState(statePath, state);
  const loaded = loadState(statePath);
  expect(loaded).toEqual(state);
});

test("round-trip: preserves nested evidence + transitions", () => {
  const statePath = `${TMP_DIR}/state.db`;
  const state = makeTestState({
    leaves: {
      "jwt-verify": {
        id: "jwt-verify",
        status: "done",
        bottleneck: "blocking",
        qa: "full",
        test: ["unit", "integration"],
        model: { provider: "anthropic", model: "claude-sonnet-4", thinking: "max" },
        tools: ["agent-spec", "tdd-guard"],
        evidence: {
          specExists: true,
          specScenarioCount: 3,
          specFileCount: 2,
          agentSpecPassed: true,
          tddGuardPassed: true,
          npmTestPassed: true,
          npmBuildPassed: true,
          boundariesClean: true,
          filesChanged: ["src/auth/login.ts"],
          testsRun: ["valid token returns session"],
          healthCheckPassed: true,
          bombadilPassed: null,
          lonkeroPassed: null,
          qualityReviewExists: true,
          qualityReviewP0Count: 0,
          qualityReviewP1Count: 0,
        },
        reviewRounds: 1,
        trace: "test/jwt-verify",
      },
    },
    transitions: [
      { leaf: "jwt-verify", from: "in_progress", to: "submitted", timestamp: "2026-07-23T12:00:00Z", evidenceHash: "abc123" },
    ],
  });
  saveState(statePath, state);
  const loaded = loadState(statePath);
  expect(loaded).toEqual(state);
  expect(loaded!.leaves["jwt-verify"].evidence.agentSpecPassed).toBe(true);
  expect(loaded!.transitions[0].evidenceHash).toBe("abc123");
});

test("missing file returns null", () => {
  const statePath = `${TMP_DIR}/nonexistent.json`;
  const loaded = loadState(statePath);
  expect(loaded).toBeNull();
});

test("corrupt DB throws clear error", () => {
  const statePath = `${TMP_DIR}/state.db`;
  const { writeFileSync } = require("node:fs");
  writeFileSync(statePath, "not a database", "utf8");
  expect(() => loadState(statePath)).toThrow();
});

test("clearState removes file (idempotent)", () => {
  const statePath = `${TMP_DIR}/state.db`;
  saveState(statePath, makeTestState());
  expect(existsSync(statePath)).toBe(true);
  clearState(statePath);
  expect(existsSync(statePath)).toBe(false);
  // second call should not throw
  expect(() => clearState(statePath)).not.toThrow();
});

// ── Multi-branch ────────────────────────────────────────────
test("loadAllBranches: returns all branches", () => {
  const dbPath = `${TMP_DIR}/state-branches.db`;
  // Save two branches
  saveState(dbPath, makeTestState({ branchId: "branch-a", status: "done" }));
  saveState(dbPath, makeTestState({ branchId: "branch-b", status: "in_progress" }));
  const all = loadAllBranches(dbPath);
  expect(Object.keys(all).length).toBe(2);
  expect(all["branch-a"].status).toBe("done");
  expect(all["branch-b"].status).toBe("in_progress");
  clearState(dbPath);
});

// ── Sessions ────────────────────────────────────────────────
test("recordSession + getActiveSessions", () => {
  const dbPath = `${TMP_DIR}/state-sessions.db`;
  saveState(dbPath, makeTestState({ branchId: "root" }));
  recordSession(dbPath, { branchId: "root", sessionUuid: "uuid-1", agentType: "leaf-worker", model: "deepseek-v4-flash", status: "running" });
  recordSession(dbPath, { branchId: "root", sessionUuid: "uuid-2", agentType: "reviewer", model: "claude-sonnet-4", status: "completed" });
  const active = getActiveSessions(dbPath);
  expect(active.length).toBe(2);
  expect(active[0].sessionUuid).toBe("uuid-1");
  clearState(dbPath);
});

// ── Stuck leaves ────────────────────────────────────────────
test("findStuckLeaves: detects idle leaves", () => {
  const dbPath = `${TMP_DIR}/state-stuck.db`;
  const state = makeTestState({
    branchId: "root",
    leaves: {
      "active": {
        id: "active", status: "in_progress", bottleneck: "standard", qa: "review", test: [],
        model: { provider: "deepseek", model: "flash", thinking: "off" },
        tools: [], evidence: emptyEvidence(), reviewRounds: 0, trace: "active",
      },
      "stuck": {
        id: "stuck", status: "in_progress", bottleneck: "standard", qa: "review", test: [],
        model: { provider: "deepseek", model: "flash", thinking: "off" },
        tools: [], evidence: emptyEvidence(), reviewRounds: 0, trace: "stuck",
      },
    },
  });
  saveState(dbPath, state);

  // The DB query needs transitions to check timestamps — without transitions, ALL active leaves are "stuck"
  const stuck = findStuckLeaves(dbPath, 30);
  expect(stuck).toContain("active");
  expect(stuck).toContain("stuck");
  expect(stuck.length).toBe(2);
  clearState(dbPath);
});
