/**
 * morphmap-db.ts — SQLite-backed state storage (replaces state.json).
 *
 * Uses bun:sqlite (built-in, synchronous, zero-dependency).
 * Same interface as the old JSON store: loadState / saveState / clearState.
 *
 * Schema: nodes, transitions, evidence, sessions — mirrors mech types.
 * WAL mode for concurrent read safety during parallel branch execution.
 */

import { Database } from "bun:sqlite";
import type { BranchState, Leaf, LeafStatus, BranchStatus } from "../mech/types";
import { emptyEvidence } from "../mech";

// ── Schema ────────────────────────────────────────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS branches (
  branch_id            TEXT PRIMARY KEY,
  status               TEXT NOT NULL DEFAULT 'pending',
  quality              TEXT NOT NULL DEFAULT 'fast',
  posture_json         TEXT,
  session_id           TEXT,
  all_leaves_complete  INTEGER NOT NULL DEFAULT 0,
  review_file_exists   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS leaves (
  leaf_id         TEXT NOT NULL,
  branch_id       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  bottleneck      TEXT NOT NULL DEFAULT 'standard',
  qa              TEXT NOT NULL DEFAULT 'review',
  test_strategies TEXT NOT NULL DEFAULT '[]',
  model_provider  TEXT,
  model_name      TEXT,
  model_thinking  TEXT,
  tools_json      TEXT NOT NULL DEFAULT '[]',
  review_rounds   INTEGER NOT NULL DEFAULT 0,
  trace           TEXT NOT NULL,
  est_loc         INTEGER,
  escalation_count INTEGER DEFAULT 0,
  PRIMARY KEY (leaf_id, branch_id),
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);

CREATE TABLE IF NOT EXISTS evidence (
  leaf_id              TEXT NOT NULL,
  branch_id            TEXT NOT NULL,
  spec_exists          INTEGER NOT NULL DEFAULT 0,
  spec_scenario_count  INTEGER NOT NULL DEFAULT 0,
  spec_file_count      INTEGER NOT NULL DEFAULT 0,
  agent_spec_passed    INTEGER NOT NULL DEFAULT 0,
  tdd_guard_passed     INTEGER,  -- NULL = skipped
  npm_test_passed      INTEGER NOT NULL DEFAULT 0,
  npm_build_passed     INTEGER NOT NULL DEFAULT 0,
  boundaries_clean     INTEGER NOT NULL DEFAULT 0,
  files_changed_json   TEXT NOT NULL DEFAULT '[]',
  tests_run_json       TEXT NOT NULL DEFAULT '[]',
  health_check_passed  INTEGER,
  bombadil_passed      INTEGER,
  lonkero_passed       INTEGER,
  quality_review_exists INTEGER NOT NULL DEFAULT 0,
  quality_review_p0    INTEGER NOT NULL DEFAULT 0,
  quality_review_p1    INTEGER NOT NULL DEFAULT 0,
  outcome_results_json TEXT,
  PRIMARY KEY (leaf_id, branch_id),
  FOREIGN KEY (leaf_id, branch_id) REFERENCES leaves(leaf_id, branch_id)
);

CREATE TABLE IF NOT EXISTS transitions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  leaf_id        TEXT NOT NULL,
  from_status    TEXT NOT NULL,
  to_status      TEXT NOT NULL,
  evidence_hash  TEXT,
  timestamp      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id    TEXT NOT NULL,
  session_uuid TEXT NOT NULL,
  agent_type   TEXT NOT NULL,
  model        TEXT,
  thinking     TEXT,
  tokens_in    INTEGER DEFAULT 0,
  tokens_out   INTEGER DEFAULT 0,
  cost         REAL DEFAULT 0.0,
  status       TEXT NOT NULL,
  started_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ended_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_leaves_branch ON leaves(branch_id);
CREATE INDEX IF NOT EXISTS idx_evidence_leaf ON evidence(leaf_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_transitions_leaf ON transitions(leaf_id);
CREATE INDEX IF NOT EXISTS idx_sessions_branch ON sessions(branch_id);

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
`;

// ── Public API ────────────────────────────────────────────────

export function loadState(dbPath: string): BranchState | null {
  const db = openDb(dbPath);

  const branchRow = db.query("SELECT * FROM branches LIMIT 1").get() as any;
  if (!branchRow) return null;

  const leaves: Record<string, Leaf> = {};
  const leafRows = db.query("SELECT * FROM leaves WHERE branch_id = ?").all(branchRow.branch_id) as any[];
  for (const lr of leafRows) {
    const ev = db.query("SELECT * FROM evidence WHERE leaf_id = ? AND branch_id = ?")
      .get(lr.leaf_id, lr.branch_id) as any;

    leaves[lr.leaf_id] = {
      id: lr.leaf_id,
      status: lr.status as LeafStatus,
      bottleneck: lr.bottleneck,
      qa: lr.qa,
      test: JSON.parse(lr.test_strategies),
      model: {
        provider: lr.model_provider || "deepseek",
        model: lr.model_name || "deepseek-v4-flash",
        thinking: lr.model_thinking || "off",
      },
      tools: JSON.parse(lr.tools_json),
      evidence: ev ? rowToEvidence(ev) : emptyEvidence(),
      reviewRounds: lr.review_rounds,
      trace: lr.trace,
      estLoc: lr.est_loc ?? undefined,
      escalationCount: lr.escalation_count ?? undefined,
    };
  }

  const transitions = db.query("SELECT * FROM transitions ORDER BY id")
    .all() as any[];

  const subBranches = db.query("SELECT branch_id FROM branches WHERE branch_id != ?")
    .all(branchRow.branch_id)
    .map((r: any) => r.branch_id);

  const childStatus: Record<string, BranchStatus> = {};
  for (const sb of subBranches) {
    const s = db.query("SELECT status FROM branches WHERE branch_id = ?").get(sb) as any;
    if (s) childStatus[sb] = s.status;
  }

  db.close();

  return {
    branchId: branchRow.branch_id,
    status: branchRow.status as BranchStatus,
    quality: branchRow.quality,
    posture: branchRow.posture_json ? JSON.parse(branchRow.posture_json) : undefined,
    sessionId: branchRow.session_id ?? undefined,
    leaves,
    subBranches,
    childBranchStatus: childStatus,
    transitions: transitions.map((t: any) => ({
      leaf: t.leaf_id,
      from: t.from_status,
      to: t.to_status,
      timestamp: t.timestamp,
      evidenceHash: t.evidence_hash || "",
    })),
    integrationStatus: {
      reviewFileExists: branchRow.review_file_exists === 1,
      healthCheckPassed: null,
      bombadilPassed: null,
      lonkeroPassed: null,
      allLeavesComplete: branchRow.all_leaves_complete === 1,
      crossLeafConflicts: [],
    },
  };
}

export function saveState(dbPath: string, state: BranchState): void {
  const db = openDb(dbPath);

  db.transaction(() => {
    // Upsert branch
    db.run(
      `INSERT INTO branches (branch_id, status, quality, posture_json, session_id, all_leaves_complete, review_file_exists)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(branch_id) DO UPDATE SET
         status=excluded.status, quality=excluded.quality,
         posture_json=excluded.posture_json, session_id=excluded.session_id,
         all_leaves_complete=excluded.all_leaves_complete,
         review_file_exists=excluded.review_file_exists`,
      [
        state.branchId,
        state.status,
        state.quality,
        state.posture ? JSON.stringify(state.posture) : null,
        state.sessionId ?? null,
        boolToInt(state.integrationStatus.allLeavesComplete),
        boolToInt(state.integrationStatus.reviewFileExists),
      ]
    );

    // Upsert leaves
    for (const [leafId, leaf] of Object.entries(state.leaves)) {
      db.run(
        `INSERT INTO leaves (leaf_id, branch_id, status, bottleneck, qa, test_strategies,
           model_provider, model_name, model_thinking, tools_json, review_rounds,
           trace, est_loc, escalation_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(leaf_id, branch_id) DO UPDATE SET
           status=excluded.status, bottleneck=excluded.bottleneck, qa=excluded.qa,
           test_strategies=excluded.test_strategies,
           model_provider=excluded.model_provider, model_name=excluded.model_name,
           model_thinking=excluded.model_thinking, tools_json=excluded.tools_json,
           review_rounds=excluded.review_rounds, trace=excluded.trace,
           est_loc=excluded.est_loc, escalation_count=excluded.escalation_count`,
        [
          leafId, state.branchId, leaf.status, leaf.bottleneck, leaf.qa,
          JSON.stringify(leaf.test),
          leaf.model.provider, leaf.model.model, leaf.model.thinking,
          JSON.stringify(leaf.tools), leaf.reviewRounds,
          leaf.trace, leaf.estLoc ?? null, leaf.escalationCount ?? null,
        ]
      );

      // Upsert evidence
      const ev = leaf.evidence;
      db.run(
        `INSERT INTO evidence (leaf_id, branch_id, spec_exists, spec_scenario_count,
           spec_file_count, agent_spec_passed, tdd_guard_passed, npm_test_passed,
           npm_build_passed, boundaries_clean, files_changed_json, tests_run_json,
           health_check_passed, bombadil_passed, lonkero_passed,
           quality_review_exists, quality_review_p0, quality_review_p1,
           outcome_results_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(leaf_id, branch_id) DO UPDATE SET
           spec_exists=excluded.spec_exists, spec_scenario_count=excluded.spec_scenario_count,
           spec_file_count=excluded.spec_file_count, agent_spec_passed=excluded.agent_spec_passed,
           tdd_guard_passed=excluded.tdd_guard_passed, npm_test_passed=excluded.npm_test_passed,
           npm_build_passed=excluded.npm_build_passed, boundaries_clean=excluded.boundaries_clean,
           files_changed_json=excluded.files_changed_json, tests_run_json=excluded.tests_run_json,
           health_check_passed=excluded.health_check_passed, bombadil_passed=excluded.bombadil_passed,
           lonkero_passed=excluded.lonkero_passed, quality_review_exists=excluded.quality_review_exists,
           quality_review_p0=excluded.quality_review_p0, quality_review_p1=excluded.quality_review_p1,
           outcome_results_json=excluded.outcome_results_json`,
        [
          leafId, state.branchId,
          boolToInt(ev.specExists), ev.specScenarioCount, ev.specFileCount,
          boolToInt(ev.agentSpecPassed), ev.tddGuardPassed === null ? null : boolToInt(ev.tddGuardPassed),
          boolToInt(ev.npmTestPassed), boolToInt(ev.npmBuildPassed), boolToInt(ev.boundariesClean),
          JSON.stringify(ev.filesChanged), JSON.stringify(ev.testsRun),
          ev.healthCheckPassed === null ? null : boolToInt(ev.healthCheckPassed),
          ev.bombadilPassed === null ? null : boolToInt(ev.bombadilPassed),
          ev.lonkeroPassed === null ? null : boolToInt(ev.lonkeroPassed),
          boolToInt(ev.qualityReviewExists), ev.qualityReviewP0Count, ev.qualityReviewP1Count,
          ev.outcomeResults ? JSON.stringify(ev.outcomeResults) : null,
        ]
      );
    }

    // Delete removed leaves
    const existingIds = Object.keys(state.leaves);
    if (existingIds.length > 0) {
      const placeholders = existingIds.map(() => "?").join(",");
      db.run(
        `DELETE FROM evidence WHERE branch_id = ? AND leaf_id NOT IN (${placeholders})`,
        [state.branchId, ...existingIds]
      );
      db.run(
        `DELETE FROM leaves WHERE branch_id = ? AND leaf_id NOT IN (${placeholders})`,
        [state.branchId, ...existingIds]
      );
    }

    // Append new transitions
    for (const t of state.transitions) {
      const exists = db.query(
        "SELECT id FROM transitions WHERE leaf_id=? AND to_status=? AND evidence_hash=? AND timestamp=?"
      ).get(t.leaf, t.to, t.evidenceHash, t.timestamp);
      if (!exists) {
        db.run(
          "INSERT INTO transitions (leaf_id, from_status, to_status, evidence_hash, timestamp) VALUES (?, ?, ?, ?, ?)",
          [t.leaf, t.from, t.to, t.evidenceHash, t.timestamp]
        );
      }
    }

    // Update sub-branch statuses
    for (const [childId, childStatus] of Object.entries(state.childBranchStatus)) {
      db.run(
        "UPDATE branches SET status = ? WHERE branch_id = ? AND branch_id != ?",
        [childStatus, childId, state.branchId]
      );
    }
  })();

  db.close();
}

export function clearState(dbPath: string): void {
  // Delete the database file entirely (simpler than row-level cleanup)
  try {
    const { unlinkSync } = require("node:fs");
    unlinkSync(dbPath);
  } catch {
    // File doesn't exist — idempotent
  }
}

// ── Multi-Branch Queries (orchestrator) ───────────────────────

/** Load ALL branches from the DB. Returns empty object if DB doesn't exist. */
export function loadAllBranches(dbPath: string): Record<string, BranchState> {
  const db = openDb(dbPath);
  const branchRows = db.query("SELECT branch_id FROM branches").all() as any[];
  const result: Record<string, BranchState> = {};

  for (const br of branchRows) {
    // Create a fake single-branch state and call loadState-like logic inline
    const branchId = br.branch_id;
    const branchRow = db.query("SELECT * FROM branches WHERE branch_id = ?").get(branchId) as any;
    if (!branchRow) continue;

    const leaves: Record<string, any> = {};
    const leafRows = db.query("SELECT * FROM leaves WHERE branch_id = ?").all(branchId) as any[];
    for (const lr of leafRows) {
      const ev = db.query("SELECT * FROM evidence WHERE leaf_id = ? AND branch_id = ?")
        .get(lr.leaf_id, lr.branch_id) as any;
      leaves[lr.leaf_id] = {
        id: lr.leaf_id, status: lr.status, bottleneck: lr.bottleneck, qa: lr.qa,
        test: JSON.parse(lr.test_strategies),
        model: { provider: lr.model_provider || "deepseek", model: lr.model_name || "deepseek-v4-flash", thinking: lr.model_thinking || "off" },
        tools: JSON.parse(lr.tools_json),
        evidence: ev ? rowToEvidence(ev) : emptyEvidence(),
        reviewRounds: lr.review_rounds, trace: lr.trace,
        estLoc: lr.est_loc ?? undefined,
        escalationCount: lr.escalation_count ?? undefined,
      };
    }

    const transitions = db.query("SELECT * FROM transitions WHERE leaf_id IN (SELECT leaf_id FROM leaves WHERE branch_id = ?)")
      .all(branchId) as any[];

    const subBranches = db.query("SELECT branch_id FROM branches WHERE branch_id != ?")
      .all(branchId).map((r: any) => r.branch_id);

    const childStatus: Record<string, any> = {};
    for (const sb of subBranches) {
      const s = db.query("SELECT status FROM branches WHERE branch_id = ?").get(sb) as any;
      if (s) childStatus[sb] = s.status;
    }

    result[branchId] = {
      branchId,
      status: branchRow.status,
      quality: branchRow.quality,
      posture: branchRow.posture_json ? JSON.parse(branchRow.posture_json) : undefined,
      sessionId: branchRow.session_id ?? undefined,
      leaves,
      subBranches,
      childBranchStatus: childStatus,
      transitions: transitions.map((t: any) => ({
        leaf: t.leaf_id, from: t.from_status, to: t.to_status,
        timestamp: t.timestamp, evidenceHash: t.evidence_hash || "",
      })),
      integrationStatus: {
        reviewFileExists: branchRow.review_file_exists === 1,
        healthCheckPassed: null, bombadilPassed: null, lonkeroPassed: null,
        allLeavesComplete: branchRow.all_leaves_complete === 1,
        crossLeafConflicts: [],
      },
    };
  }

  db.close();
  return result;
}

// ── Session Recording ─────────────────────────────────────────

export interface SessionRecord {
  branchId: string;
  sessionUuid: string;
  agentType: string;
  model?: string;
  thinking?: string;
  tokensIn?: number;
  tokensOut?: number;
  cost?: number;
  status: string;
}

export function recordSession(dbPath: string, session: SessionRecord): void {
  const db = openDb(dbPath);
  db.run(
    `INSERT INTO sessions (branch_id, session_uuid, agent_type, model, thinking, tokens_in, tokens_out, cost, status, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
    [
      session.branchId, session.sessionUuid, session.agentType,
      session.model ?? null, session.thinking ?? null,
      session.tokensIn ?? 0, session.tokensOut ?? 0,
      session.cost ?? 0, session.status,
    ]
  );
  db.close();
}

export function updateSessionStatus(dbPath: string, sessionUuid: string, status: string, endedAt?: string): void {
  const db = openDb(dbPath);
  db.run(
    `UPDATE sessions SET status = ?, ended_at = ? WHERE session_uuid = ?`,
    [status, endedAt ?? new Date().toISOString(), sessionUuid]
  );
  db.close();
}

// ── SQL-Based Stuck Leaf Detection ────────────────────────────

/** Find stuck leaves using SQL query (no file I/O). Returns leaf IDs idle longer than threshold. */
export function findStuckLeavesSQL(dbPath: string, idleThresholdMinutes: number = 30): string[] {
  const db = openDb(dbPath);
  const threshold = new Date(Date.now() - idleThresholdMinutes * 60 * 1000).toISOString();

  // Stuck = status is in_progress or submitted, AND no transition in threshold window
  const rows = db.query(`
    SELECT l.leaf_id FROM leaves l
    WHERE l.status IN ('in_progress', 'submitted')
    AND (
      SELECT MAX(t.timestamp) FROM transitions t WHERE t.leaf_id = l.leaf_id
    ) < ?
    OR (SELECT COUNT(*) FROM transitions t WHERE t.leaf_id = l.leaf_id) = 0
  `).all(threshold) as any[];

  db.close();
  return rows.map((r: any) => r.leaf_id);
}

/** Query sessions for active subagents (not yet ended). */
export function getActiveSessions(dbPath: string): SessionRecord[] {
  const db = openDb(dbPath);
  const rows = db.query(
    "SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at"
  ).all() as any[];
  db.close();
  return rows.map((r: any) => ({
    branchId: r.branch_id,
    sessionUuid: r.session_uuid,
    agentType: r.agent_type,
    model: r.model,
    thinking: r.thinking,
    tokensIn: r.tokens_in,
    tokensOut: r.tokens_out,
    cost: r.cost,
    status: r.status,
  }));
}

// ── Helpers ───────────────────────────────────────────────────

function openDb(dbPath: string): Database {
  const db = new Database(dbPath, { create: true });
  db.exec(SCHEMA);
  return db;
}

function boolToInt(b: boolean): number {
  return b ? 1 : 0;
}

function rowToEvidence(row: any) {
  return {
    specExists: row.spec_exists === 1,
    specScenarioCount: row.spec_scenario_count,
    specFileCount: row.spec_file_count,
    agentSpecPassed: row.agent_spec_passed === 1,
    tddGuardPassed: row.tdd_guard_passed === null ? null : row.tdd_guard_passed === 1,
    npmTestPassed: row.npm_test_passed === 1,
    npmBuildPassed: row.npm_build_passed === 1,
    boundariesClean: row.boundaries_clean === 1,
    filesChanged: JSON.parse(row.files_changed_json),
    testsRun: JSON.parse(row.tests_run_json),
    healthCheckPassed: row.health_check_passed === null ? null : row.health_check_passed === 1,
    bombadilPassed: row.bombadil_passed === null ? null : row.bombadil_passed === 1,
    lonkeroPassed: row.lonkero_passed === null ? null : row.lonkero_passed === 1,
    qualityReviewExists: row.quality_review_exists === 1,
    qualityReviewP0Count: row.quality_review_p0,
    qualityReviewP1Count: row.quality_review_p1,
    outcomeResults: row.outcome_results_json ? JSON.parse(row.outcome_results_json) : undefined,
  };
}
