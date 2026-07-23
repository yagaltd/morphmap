/**
 * morphmap-seed.ts — bootstrap state.json from mindmap (impure).
 *
 * Reads .morphmap/morphmap.mindmap.md, parses [module]/[feature] branches via
 * the pure seed parser, writes per-branch state.json + state-index.json.
 *
 * Spec: docs/mech-mindmap.md §2.2, §2.7 Step A.
 */
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseMapToBranches, buildBranchState, buildStateIndex } from "../mech/seed";
import { saveState } from "./morphmap-state";
import type { BranchState } from "../mech";

export interface SeedResult {
  branches: number;
  leaves: number;
  paths: string[];
}

/**
 * Bootstrap state.json from the mindmap.
 * Writes plans/<slug>/state.json per [module]/[feature] branch + .morphmap/state-index.json.
 */
export function seedFromMap(
  mapPath: string,
  morphmapDir: string,
): SeedResult {
  const mapContent = readFileSync(mapPath, "utf8");
  const parsedBranches = parseMapToBranches(mapContent);

  const paths: string[] = [];
  let totalLeaves = 0;

  for (const parsed of parsedBranches) {
    const state = buildBranchState(parsed);
    const branchDir = join(morphmapDir, "plans", parsed.branchId);
    mkdirSync(branchDir, { recursive: true });
    const statePath = join(branchDir, "state.json");
    saveState(statePath, state);
    paths.push(statePath);
    totalLeaves += Object.keys(state.leaves).length;
  }

  // Write root state.json (aggregates all branches)
  const rootState = buildRootState(parsedBranches);
  const rootPath = join(morphmapDir, "state.json");
  saveState(rootPath, rootState);
  paths.push(rootPath);

  // Write state index
  const states = parsedBranches.map((p) => buildBranchState(p));
  const index = buildStateIndex(states);
  const indexPath = join(morphmapDir, "state-index.json");
  saveState(indexPath, index as unknown as BranchState);
  paths.push(indexPath);

  return { branches: parsedBranches.length, leaves: totalLeaves, paths };
}

function buildRootState(parsedBranches: ReturnType<typeof parseMapToBranches>): BranchState {
  const allLeaves: Record<string, BranchState["leaves"][string]> = {};
  const childBranchStatus: Record<string, BranchState["status"]> = {};
  const subBranches: string[] = [];

  for (const parsed of parsedBranches) {
    const state = buildBranchState(parsed);
    for (const [id, leaf] of Object.entries(state.leaves)) {
      allLeaves[`${parsed.branchId}/${id}`] = leaf;
    }
    childBranchStatus[parsed.branchId] = parsed.status as BranchState["status"];
    subBranches.push(parsed.branchId);
  }

  return {
    branchId: "root",
    status: "in_progress",
    quality: "fast",
    leaves: allLeaves,
    subBranches,
    childBranchStatus,
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
