/**
 * morphmap-state.ts — state.db I/O (impure bridge, SQLite-backed).
 *
 * Pure module (mech/) stays zero-I/O. This layer funnels ALL persistence.
 * Replaces the old state.json with SQLite for concurrent write safety.
 *
 * Spec: docs/mech-mindmap.md §2.7 Step E.
 */
import type { BranchState } from "../mech";
import { loadState as dbLoad, saveState as dbSave, clearState as dbClear, loadAllBranches as dbLoadAll, recordSession as dbRecordSession, updateSessionStatus as dbUpdateSession, findStuckLeavesSQL as dbFindStuck, getActiveSessions as dbActiveSessions } from "./morphmap-db";

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

/** Load ALL branches for orchestrator queries. */
export function loadAllBranches(dbPath: string): Record<string, BranchState> {
  return dbLoadAll(dbPath);
}

/** Record a subagent session. */
export function recordSession(dbPath: string, session: Parameters<typeof dbRecordSession>[1]): void {
  dbRecordSession(dbPath, session);
}

/** Update session status (e.g., completed, failed). */
export function updateSessionStatus(dbPath: string, sessionUuid: string, status: string, endedAt?: string): void {
  dbUpdateSession(dbPath, sessionUuid, status, endedAt);
}

/** Find stuck leaves via SQL query. */
export function findStuckLeaves(dbPath: string, idleThresholdMinutes?: number): string[] {
  return dbFindStuck(dbPath, idleThresholdMinutes);
}

/** Get active (not yet ended) sessions. */
export function getActiveSessions(dbPath: string) {
  return dbActiveSessions(dbPath);
}
