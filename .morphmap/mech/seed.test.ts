import { test, expect } from "bun:test";
import { parseLeafLine, parseMapToBranches, buildBranchState, buildStateIndex } from "./seed";

// Using \u{} escapes for SMP emojis to avoid UTF-8 encoding corruption in test runners.
const WC = "\u2B1C";       // ⬜
const SYNC = "\u{1F504}";  // 🔄
const HOUR = "\u23F3";     // ⏳
const RED = "\u{1F534}";   // 🔴
const SLEEP = "\u{1F4A4}"; // 💤
const CHECK = "\u2705";    // ✅
const ARROW = "\u2192";    // →

const TEST_MAP = `---
type: mindmap
project: Test
---
# Test Project

## frontend ${SYNC} [module] — scope: UI components
- ${WC} login page ${ARROW} specs/auth/login.spec [qa: full] [test: unit + integration]
- ${SYNC} jwt-verify ${ARROW} specs/auth/jwt-verify.spec [qa: full] [needs: auth/jwt-refresh]
- ${CHECK} logout button ${ARROW} specs/auth/logout.spec [qa: none]

## backend ${WC} [module] — scope: API server
- ${WC} user endpoint ${ARROW} specs/api/user.spec [qa: review]

## decisions ${WC} [log]
- 2026-07-20: decided on JWT

## releases ${WC} [log]
- 0.1.0 (2026-07-19)
`;

test("parseLeafLine: pending status", () => {
  const result = parseLeafLine(`- ${WC} login page ${ARROW} specs/auth/login.spec [qa: full]`);
  expect(result).not.toBeNull();
  expect(result!.status).toBe("pending");
  expect(result!.id).toBe("specs/auth/login.spec");
  expect(result!.qa).toBe("full");
});

test("parseLeafLine: in_progress status", () => {
  const result = parseLeafLine(`- ${SYNC} jwt-verify ${ARROW} specs/auth/jwt-verify.spec [qa: full]`);
  expect(result).not.toBeNull();
  expect(result!.status).toBe("in_progress");
});

test("parseLeafLine: done status", () => {
  const result = parseLeafLine(`- ${CHECK} logout button ${ARROW} specs/auth/logout.spec [qa: none]`);
  expect(result).not.toBeNull();
  expect(result!.status).toBe("done");
});

test("parseLeafLine: blocked status with needs", () => {
  const result = parseLeafLine(`- ${RED} jwt-verify ${ARROW} specs/auth/jwt-verify.spec [qa: full] [needs: auth/jwt-refresh]`);
  expect(result).not.toBeNull();
  expect(result!.status).toBe("blocked");
  expect(result!.needs).toContain("auth/jwt-refresh");
});

test("parseLeafLine: test strategy parsing", () => {
  const result = parseLeafLine(`- ${WC} login page ${ARROW} specs/auth/login.spec [qa: full] [test: unit + integration]`);
  expect(result).not.toBeNull();
  expect(result!.test).toEqual(["unit", "integration"]);
});

test("parseLeafLine: no path uses description as id", () => {
  const result = parseLeafLine(`- ${WC} login page [qa: review]`);
  expect(result).not.toBeNull();
  expect(result!.id).toBe("login-page");
});

test("parseLeafLine: non-leaf line returns null", () => {
  expect(parseLeafLine(`## frontend ${SYNC} [module]`)).toBeNull();
  expect(parseLeafLine("Some random text")).toBeNull();
  expect(parseLeafLine("")).toBeNull();
});

test("parseMapToBranches: extracts [module] branches only", () => {
  const branches = parseMapToBranches(TEST_MAP);
  expect(branches.length).toBe(2);
  expect(branches[0].branchId).toBe("frontend");
  expect(branches[1].branchId).toBe("backend");
});

test("parseMapToBranches: skips [log] branches", () => {
  const branches = parseMapToBranches(TEST_MAP);
  const ids = branches.map((b) => b.branchId);
  expect(ids).not.toContain("decisions");
  expect(ids).not.toContain("releases");
});

test("parseMapToBranches: parses leaf statuses", () => {
  const branches = parseMapToBranches(TEST_MAP);
  const frontend = branches.find((b) => b.branchId === "frontend")!;
  expect(frontend.leaves.length).toBe(3);
  expect(frontend.leaves[0].status).toBe("pending");
  expect(frontend.leaves[1].status).toBe("in_progress");
  expect(frontend.leaves[2].status).toBe("done");
});

test("buildBranchState: creates valid BranchState", () => {
  const branches = parseMapToBranches(TEST_MAP);
  const state = buildBranchState(branches[0]);
  expect(state.branchId).toBe("frontend");
  expect(state.status).toBe("in_progress");
  expect(Object.keys(state.leaves).length).toBe(3);
  expect(state.integrationStatus.allLeavesComplete).toBe(false);
});

test("buildBranchState: assigns models from config", () => {
  const branches = parseMapToBranches(TEST_MAP);
  const state = buildBranchState(branches[0]);
  // jwt-verify is ${SYNC} in_progress + qa:full → pro model
  const leaf = state.leaves["specs/auth/jwt-verify.spec"];
  expect(leaf.model.provider).toBe("deepseek");
  expect(leaf.model.model).toBe("deepseek-v4-pro");
  expect(leaf.model.thinking).toBe("high");
});

test("buildStateIndex: maps branchId to path", () => {
  const branches = parseMapToBranches(TEST_MAP);
  const states = branches.map((b) => buildBranchState(b));
  const index = buildStateIndex(states);
  expect(index["frontend"]).toBe("plans/frontend/state.json");
  expect(index["backend"]).toBe("plans/backend/state.json");
});
