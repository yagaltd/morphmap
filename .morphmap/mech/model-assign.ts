#!/usr/bin/env bun
/**
 * model-assign.ts — CLI wrapper for config.ts assignModel.
 * Usage: bun run .morphmap/mech/model-assign.ts <bottleneck> <qa> <test1,test2,...>
 * Output: JSON { provider, model, thinking }
 */
import { assignModel } from "./config";
import type { Bottleneck, QALevel, TestStrategy } from "./types";

const bottleneck = (process.argv[2] || "standard") as Bottleneck;
const qa = (process.argv[3] || "review") as QALevel;
const test = (process.argv[4] || "unit").split(",") as TestStrategy[];

const result = assignModel(bottleneck, qa, test);
console.log(JSON.stringify(result));
