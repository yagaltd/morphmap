import { test, expect } from "bun:test";
import { compileEvidence } from "./morphmap-compiler";

const SAMPLE_JSONL = [
  JSON.stringify({
    type: "message",
    message: {
      role: "assistant",
      content: [
        { type: "text", text: "Running tests..." },
        {
          type: "tool_use",
          name: "bash",
          input: { command: "npm test" },
          tool_use_id: "call_1",
        },
      ],
    },
  }),
  JSON.stringify({
    type: "message",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "call_1",
          content: "✓ test valid token returns session\n✓ test invalid token rejected\n 2 passed",
        },
      ],
    },
  }),
  JSON.stringify({
    type: "message",
    message: {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          name: "bash",
          input: { command: "npm run build" },
          tool_use_id: "call_2",
        },
      ],
    },
  }),
  JSON.stringify({
    type: "message",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "call_2",
          content: "built dist/ in 1.2s",
        },
      ],
    },
  }),
  JSON.stringify({
    type: "message",
    message: {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          name: "bash",
          input: { command: "agent-spec lifecycle specs/auth/login.spec --code . --layers lint,boundary,test" },
          tool_use_id: "call_3",
        },
      ],
    },
  }),
  JSON.stringify({
    type: "message",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "call_3",
          content: "Quality: 100% (determinism: 100%, testability: 100%, coverage: 100%)\n 0 fail",
        },
      ],
    },
  }),
  JSON.stringify({
    type: "message",
    message: {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          name: "bash",
          input: { command: "git diff --name-only" },
          tool_use_id: "call_4",
        },
      ],
    },
  }),
  JSON.stringify({
    type: "message",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: "call_4",
          content: "src/auth/login.ts\nsrc/auth/types.ts",
        },
      ],
    },
  }),
].join("\n");

test("compileEvidence: extract test results", () => {
  const evidence = compileEvidence(SAMPLE_JSONL);
  expect(evidence.npmTestPassed).toBe(true);
  expect(evidence.testsRun).toContain("test valid token returns session");
  expect(evidence.testsRun).toContain("test invalid token rejected");
});

test("compileEvidence: extract build results", () => {
  const evidence = compileEvidence(SAMPLE_JSONL);
  expect(evidence.npmBuildPassed).toBe(true);
});

test("compileEvidence: extract agent-spec results", () => {
  const evidence = compileEvidence(SAMPLE_JSONL);
  expect(evidence.agentSpecPassed).toBe(true);
});

test("compileEvidence: extract files changed", () => {
  const evidence = compileEvidence(SAMPLE_JSONL);
  expect(evidence.filesChanged).toContain("src/auth/login.ts");
  expect(evidence.filesChanged).toContain("src/auth/types.ts");
});

test("compileEvidence: missing evidence defaults to false", () => {
  const evidence = compileEvidence(JSON.stringify({
    type: "message",
    message: { role: "assistant", content: [{ type: "text", text: "hello" }] },
  }));
  expect(evidence.npmTestPassed).toBe(false);
  expect(evidence.npmBuildPassed).toBe(false);
  expect(evidence.agentSpecPassed).toBe(false);
  expect(evidence.filesChanged).toEqual([]);
  expect(evidence.testsRun).toEqual([]);
});

test("compileEvidence: test failure detected", () => {
  const jsonl = JSON.stringify({
    type: "message",
    message: {
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: "call_x",
        content: "FAIL test expired token\n 1 failed",
      }],
    },
  }) + "\n" + JSON.stringify({
    type: "message",
    message: {
      role: "assistant",
      content: [{
        type: "tool_use",
        name: "bash",
        input: { command: "npm test" },
        tool_use_id: "call_x",
      }],
    },
  });
  const evidence = compileEvidence(jsonl);
  expect(evidence.npmTestPassed).toBe(false);
});

test("compileEvidence: empty JSONL returns defaults", () => {
  const evidence = compileEvidence("");
  expect(evidence.npmTestPassed).toBe(false);
  expect(evidence.npmBuildPassed).toBe(false);
  expect(evidence.filesChanged).toEqual([]);
});

test("compileEvidence: handles malformed JSON lines gracefully", () => {
  const jsonl = "not json\n" + SAMPLE_JSONL + "\n{broken";
  const evidence = compileEvidence(jsonl);
  expect(evidence.npmTestPassed).toBe(true);
  expect(evidence.npmBuildPassed).toBe(true);
});
