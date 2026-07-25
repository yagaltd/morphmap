/**
 * mech gates — mode.test.ts
 * Tests for mode transition gate.
 */

import { describe, test, expect } from "bun:test";
import { modeTransitionLegal, modeGates } from "./mode";

describe("modeTransitionLegal", () => {
  test("same → same always allowed", () => {
    expect(modeTransitionLegal.run({ from: "research", to: "research" }).pass).toBe(true);
    expect(modeTransitionLegal.run({ from: "implement", to: "implement" }).pass).toBe(true);
  });

  test("research → brainstorm allowed", () => {
    expect(modeTransitionLegal.run({ from: "research", to: "brainstorm" }).pass).toBe(true);
  });

  test("research → plan blocked", () => {
    const r = modeTransitionLegal.run({ from: "research", to: "plan" });
    expect(r.pass).toBe(false);
    expect(r.reason).toContain("not allowed");
  });

  test("research → implement blocked", () => {
    const r = modeTransitionLegal.run({ from: "research", to: "implement" });
    expect(r.pass).toBe(false);
  });

  test("brainstorm → plan allowed", () => {
    expect(modeTransitionLegal.run({ from: "brainstorm", to: "plan" }).pass).toBe(true);
  });

  test("brainstorm → implement blocked", () => {
    expect(modeTransitionLegal.run({ from: "brainstorm", to: "implement" }).pass).toBe(false);
  });

  test("plan → implement allowed", () => {
    expect(modeTransitionLegal.run({ from: "plan", to: "implement" }).pass).toBe(true);
  });

  test("plan → review allowed", () => {
    expect(modeTransitionLegal.run({ from: "plan", to: "review" }).pass).toBe(true);
  });

  test("implement → research allowed (downgrade)", () => {
    expect(modeTransitionLegal.run({ from: "implement", to: "research" }).pass).toBe(true);
  });

  test("implement → any allowed", () => {
    for (const to of ["research", "brainstorm", "plan", "implement", "review"] as const) {
      expect(modeTransitionLegal.run({ from: "implement", to }).pass).toBe(true);
    }
  });

  test("review → plan blocked", () => {
    const r = modeTransitionLegal.run({ from: "review", to: "plan" });
    expect(r.pass).toBe(false);
  });

  test("modeGates chain includes modeTransitionLegal", () => {
    expect(modeGates.length).toBeGreaterThanOrEqual(1);
    expect(modeGates[0].name).toBe("modeTransitionLegal");
  });
});
