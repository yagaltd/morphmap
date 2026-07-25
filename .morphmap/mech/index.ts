/**
 * mech — barrel export for the pure module.
 * Import everything from here: `import { leafMachine, submitGates, ... } from "./mech"`.
 */
export * from "./types";
export * from "./state";
export * from "./config";
export * from "./tools";
export * from "./seed";
export * from "./gates/pre-spawn";
export * from "./gates/submit";
export * from "./gates/review";
export * from "./gates/integration";
export * from "./gates/mode";
export * from "./gates/common";
export * from "./lattice";
export * from "./recovery";
export * from "./sub-map";

// Re-export Node type helpers for one-map compatibility
export { isLeaf, isBranch, nodeToLeaf, nodeToBranchState } from "./types";
