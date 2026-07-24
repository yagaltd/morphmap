/**
 * morphmap-state.ts — state.db I/O (impure bridge, SQLite-backed).
 *
 * Pure module (mech/) stays zero-I/O. This layer funnels ALL persistence.
 * Replaces the old state.json with SQLite for concurrent write safety.
 *
 * Spec: docs/mech-mindmap.md §2.7 Step E.
 */
import type { BranchState } from "../mech";
import { loadState as dbLoad, saveState as dbSave, clearState as dbClear } from "./morphmap-db";

/** Load state from SQLite. Returns null if DB doesn't exist. */
export function loadState(dbPath: string): BranchState | null {
  return dbLoad(dbPath);
}

/** Save state to SQLite atomically (WAL mode handles concurrency). */
export function saveState(dbPath: string, state: BranchState): void {
  dbSave(dbPath, state);
}

/** Clear all state (idempotent). */
export function clearState(dbPath: string): void {
  dbClear(dbPath);
}
