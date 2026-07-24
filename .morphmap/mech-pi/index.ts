/**
 * mech-pi — barrel export for the impure pi-wiring module.
 *
 * Import everything from here: `import { loadState, seedFromMap, registerMechTools } from "./mech-pi"`.
 *
 * mech-pi wraps the pure mech/ core with I/O (fs, pi runtime):
 *   morphmap-state.ts      — state.json load/save (impure: fs)
 *   morphmap-tools.ts      — orchestration: load→apply→save (impure: fs, bun-testable)
 *   morphmap-tools-pi.ts   — pi.registerTool wrappers + TypeBox schemas (impure: pi runtime)
 *   morphmap-seed.ts       — seedFromMap: mindmap → state.json (impure: fs)
 *   morphmap-compiler.ts   — JSONL session log → evidence extraction (impure: fs, bun-testable)
 *   seed-runner.ts         — CLI entry: bun run .morphmap/mech-pi/seed-runner.ts
 */
export { loadState, saveState, clearState } from "./morphmap-state";
export {
  applySubmitLeaf,
  applyApproveLeaf,
  applyIntegrationGate,
  type SubmitLeafInput,
  type ApproveLeafInput,
  type IntegrationGateInput,
  type OrchestratedResult,
} from "./morphmap-tools";
export { registerMechTools } from "./morphmap-tools-pi";
export { seedFromMap, type SeedResult } from "./morphmap-seed";
export { loadConfig, leafProfileToModel, taskProfileToModel } from "./config-loader";
export type { MorphmapConfig, OrchestratorProfile, ProfileEntry } from "./config-loader";
export { loadState as dbLoad, saveState as dbSave, clearState as dbClear } from "./morphmap-db";
