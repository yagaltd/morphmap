#!/usr/bin/env bun
/**
 * model-assign.ts — CLI wrapper for config.ts assignModel.
 *
 * Reads .morphmap/config.json (single source of truth) and calls the
 * pure assignModel with loaded profiles. No hardcoded models.
 *
 * Usage: bun run .morphmap/mech/model-assign.ts <bottleneck> <qa> <test1,test2,...>
 * Output: JSON { provider, model, thinking }
 */
import { assignModel } from "./config";
import { loadConfig, leafProfileToModel } from "../mech-pi/config-loader";
import type { Bottleneck, QALevel, TestStrategy } from "./types";

const bottleneck = (process.argv[2] || "standard") as Bottleneck;
const qa = (process.argv[3] || "review") as QALevel;
const test = (process.argv[4] || "unit").split(",") as TestStrategy[];

// Load profiles from the single source of truth
const cfg = loadConfig();
const profiles = Object.fromEntries(
  Object.entries(cfg.leafProfiles).map(([k, v]) => [
    k,
    { provider: v.provider, model: v.model, thinking: v.thinking },
  ])
) as Record<Bottleneck, { provider: string; model: string; thinking: string }>;

const result = assignModel(bottleneck, qa, test, profiles);
console.log(JSON.stringify(result));
