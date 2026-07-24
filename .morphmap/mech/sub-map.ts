/**
 * mech — sub-map.ts
 * Sub-map session lifecycle: child status sync, orphan detection.
 *
 * Pure module: zero pi imports, zero I/O. Plain data in, plain data out.
 *
 * Spec: docs/mech-mindmap.md Phase F
 */

import type { BranchState, BranchStatus } from "./types";

// ── Child Status Sync ──────────────────────────────────────────

/**
 * Sync child branch statuses into the parent state. Reads each child BranchState,
 * extracts its status, and updates parent.childBranchStatus.
 *
 * Returns a NEW BranchState (immutable update).
 */
export function syncChildStatuses(
  parentState: BranchState,
  childStates: BranchState[],
): BranchState {
  const updatedChildStatus: Record<string, BranchStatus> = {
    ...parentState.childBranchStatus,
  };

  for (const child of childStates) {
    updatedChildStatus[child.branchId] = child.status;
  }

  // Rollup: if any child is blocked → parent becomes blocked
  // If any child is in_progress → parent is in_progress
  // If all children done → parent stays current (caller handles)
  const childStatuses = Object.values(updatedChildStatus);

  let newParentStatus = parentState.status;

  if (childStatuses.some((s) => s === "blocked")) {
    newParentStatus = "blocked";
  } else if (childStates.length > 0 && childStatuses.every((s) => s === "done")) {
    // All known children done — but don't auto-transition parent;
    // integration gate still controls done transition.
    // We'll keep parent status but let caller handle rollup.
    // If there were previously in_progress children and all are now done,
    // stay at in_progress until integration gate fires.
    if (parentState.status === "pending") {
      newParentStatus = "in_progress"; // at least one child run
    }
  }

  return {
    ...parentState,
    childBranchStatus: updatedChildStatus,
    status: newParentStatus,
  };
}

// ── Orphan Detection ──────────────────────────────────────────

/**
 * Find sub-branches whose session IDs don't match any known active pi session.
 * An orphaned sub-branch has a sessionId that is not in activeSessions.
 *
 * Returns the branchIds of orphaned sub-branches.
 */
export function detectSubmapOrphans(
  state: BranchState,
  activeSessions: string[],
): string[] {
  const orphans: string[] = [];

  // Check each sub-branch. If it has a sessionId and it's not in activeSessions,
  // it's orphaned (the pi session crashed or was killed).
  for (const childId of state.subBranches) {
    // Sub-branches map to childBranchStatus keys; session IDs would be
    // stored in a separate map (accessible via the one-map session tree).
    // For now, we detect orphans by checking if childBranchStatus entries
    // are in_progress or submitted (indicating a running session) but
    // the child's sessionId isn't active.

    const childStatus = state.childBranchStatus[childId];
    if (
      childStatus === "in_progress" &&
      !activeSessions.includes(childId) // sessionId === branchId by convention
    ) {
      orphans.push(childId);
    }
  }

  return orphans;
}
