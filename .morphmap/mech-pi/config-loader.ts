/**
 * config-loader.ts — loads .morphmap/config.json at runtime.
 *
 * Single source of truth for model assignments, task profiles, and posture overrides.
 * mech/config.ts consumes this data — no more hardcoded tables scattered across files.
 *
 * Spec: docs/mech-mindmap.md §2.6
 */
import { readFileSync, existsSync } from "node:fs";
import type { Bottleneck, ModelAssignment } from "../mech/types";

// ── Config shape (mirrors .morphmap/config.json) ──────────────

export interface OrchestratorProfile {
  model: string;
  thinking: string;
}

export interface ProfileEntry {
  provider: string;
  model: string;
  thinking: string;
}

export interface MorphmapConfig {
  orchestratorProfile: OrchestratorProfile;
  leafProfiles: Record<string, ProfileEntry>;
  taskProfiles: Record<string, ProfileEntry>;
  testProfiles?: Record<string, ProfileEntry>;
  escalation?: Record<string, Array<{ failures: number; provider?: string; model?: string; thinking?: string }>>;
}

// ── Load & validate ───────────────────────────────────────────

export function loadConfig(path = ".morphmap/config.json"): MorphmapConfig {
  if (!existsSync(path)) {
    throw new Error(
      `config.json not found at ${path}. Run /morphmap-init to scaffold it.`
    );
  }

  const raw = readFileSync(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`config.json is not valid JSON: ${(e as Error).message}`);
  }

  const cfg = parsed as MorphmapConfig;

  // Validate required keys
  if (!cfg.leafProfiles) {
    throw new Error("config.json missing required key: leafProfiles");
  }
  if (!cfg.taskProfiles) {
    throw new Error("config.json missing required key: taskProfiles");
  }

  return cfg;
}

// ── Map config to mech types ───────────────────────────────────

export function leafProfileToModel(
  profiles: Record<string, ProfileEntry>,
  bottleneck: Bottleneck
): ModelAssignment {
  const entry = profiles[bottleneck];
  if (!entry) {
    // Fallback — should never happen if config.json is well-formed
    return { provider: "deepseek", model: "deepseek-v4-flash", thinking: "off" };
  }
  return {
    provider: entry.provider,
    model: entry.model,
    thinking: entry.thinking as ModelAssignment["thinking"],
  };
}

export function taskProfileToModel(
  profiles: Record<string, ProfileEntry>,
  taskName: string
): ModelAssignment | null {
  const entry = profiles[taskName];
  if (!entry) return null;
  return {
    provider: entry.provider,
    model: entry.model,
    thinking: entry.thinking as ModelAssignment["thinking"],
  };
}
