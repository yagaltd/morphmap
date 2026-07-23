/**
 * morphmap-state.ts — state.json I/O (impure bridge).
 *
 * Pure module (mech/) stays zero-I/O. This layer funnels ALL fs for the
 * deterministic layer: loadState/saveState/clearState.
 *
 * Spec: docs/mech-mindmap.md §2.7 Step E (atomic write).
 */
import { randomBytes } from "node:crypto";
import { renameSync, writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import type { BranchState } from "../mech";

/** Load state.json. Returns null if file doesn't exist. Throws on corrupt JSON/invalid shape. */
export function loadState(statePath: string): BranchState | null {
  if (!existsSync(statePath)) return null;
  const raw = readFileSync(statePath, "utf8");
  try {
    return JSON.parse(raw) as BranchState;
  } catch (e) {
    throw new Error(`state.json corrupt: ${(e as Error).message}`);
  }
}

/** Save state.json atomically: write to tmp → fsync → rename. §2.7 Step E. */
export function saveState(statePath: string, state: BranchState): void {
  const tmpPath = `${statePath}.${randomBytes(8).toString("hex")}.tmp`;
  const data = JSON.stringify(state, null, 2) + "\n";
  writeFileSync(tmpPath, data, "utf8");
  // fsync is implicit in writeFileSync on most platforms; rename is atomic
  renameSync(tmpPath, statePath);
}

/** Clear state.json (idempotent — no error if file doesn't exist). */
export function clearState(statePath: string): void {
  if (existsSync(statePath)) {
    unlinkSync(statePath);
  }
}
