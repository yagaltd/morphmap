/**
 * hooks/helpers.ts — shared utilities for morphmap hooks.
 *
 * Extracted from morphmap-hooks.ts to keep each hook module focused.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ── Session state ─────────────────────────────────────────────

export interface SessionState {
  failureCounts: Map<string, number>;
  lastLeafCompletion: { turn: number; leaf: string } | null;
  pendingIntercomCheck: boolean;
  turnCount: number;
  notifiedPatterns: Set<string>;
  _preSpawnTokensIn?: number;
  _preSpawnTokensOut?: number;
  _preSpawnCost?: number;
  _preSpawnAgent?: string;
  _preSpawnTask?: string;
}

export function getState(ctx: any): SessionState {
  if (!ctx._morphmapState) {
    ctx._morphmapState = {
      failureCounts: new Map(),
      lastLeafCompletion: null,
      pendingIntercomCheck: false,
      turnCount: 0,
      notifiedPatterns: new Set(),
    };
  }
  return ctx._morphmapState;
}

// ── Extractors ────────────────────────────────────────────────

export function extractSpecPath(task: string): string | null {
  const match = task.match(/\.spec\s+(\S+\.spec)/);
  return match ? match[1] : null;
}

export function extractBottleneck(task: string): string | null {
  const match = task.match(/(🔴|🟡|🔵|🟠|⚪)/);
  return match ? match[1] : null;
}

export function extractLeafName(task: string): string | null {
  const match = task.match(/^Implement\s+(.+?)\s+against/i);
  return match ? match[1].trim() : null;
}

export function extractTaskLabel(task: string): string {
  const leafMatch = task.match(/^Implement\s+(.+?)\s+against/i);
  if (leafMatch) return leafMatch[1].trim();
  const reviewMatch = task.match(
    /(?:Mechanical review|Integration review|Review|Quality review)[^:]*:\s*(.+)/i
  );
  if (reviewMatch) return reviewMatch[1].trim();
  const branchMatch = task.match(/Own\s+(.+?)\s+subtree/i);
  if (branchMatch) return branchMatch[1].trim();
  const reconMatch = task.match(/(?:Recon|Research|Scout)\s+(.+)/i);
  if (reconMatch) return reconMatch[1].trim();
  return task.slice(0, 60).replace(/\n/g, " ");
}

export function extractError(event: any): string {
  const result = event.result;
  if (typeof result === "string") return result;
  if (result?.error) return String(result.error);
  if (result?.stderr) return String(result.stderr);
  if (result?.message) return String(result.message);
  if (result === undefined || result === null) return "unknown error (no result)";
  return JSON.stringify(result).slice(0, 500);
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function isMindmapFile(path: string): boolean {
  return path.includes("morphmap.mindmap.md") || path.includes(".mindmap.md");
}
