import { test, expect, beforeEach, afterEach } from "bun:test";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { loadState, saveState, clearState } from "./morphmap-state";
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
  const statePath = `${TMP_DIR}/state.json`;
  const state = makeTestState({ status: "done" });
  saveState(statePath, state);
  const loaded = loadState(statePath);
  expect(loaded).toEqual(state);
});

test("round-trip: preserves nested evidence + transitions", () => {
  const statePath = `${TMP_DIR}/state.json`;
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

test("corrupt JSON throws clear error", () => {
  const statePath = `${TMP_DIR}/state.json`;
  const { writeFileSync } = require("node:fs");
  writeFileSync(statePath, "{ invalid json }", "utf8");
  expect(() => loadState(statePath)).toThrow(/corrupt/);
});

test("clearState removes file (idempotent)", () => {
  const statePath = `${TMP_DIR}/state.json`;
  saveState(statePath, makeTestState());
  expect(existsSync(statePath)).toBe(true);
  clearState(statePath);
  expect(existsSync(statePath)).toBe(false);
  // second call should not throw
  expect(() => clearState(statePath)).not.toThrow();
});
