#!/usr/bin/env bun
/**
 * seed-runner.ts — CLI runner for seedFromMap.
 * Usage: bun run .morphmap/mech-pi/seed-runner.ts [mapPath] [morphmapDir]
 */
import { seedFromMap } from "./morphmap-seed";

const mapPath = process.argv[2] || ".morphmap/morphmap.mindmap.md";
const morphmapDir = process.argv[3] || ".morphmap";

const result = seedFromMap(mapPath, morphmapDir);
console.log(`Seeded ${result.branches} branches, ${result.leaves} leaves.`);
console.log(`State files: ${result.paths.join(", ")}`);
