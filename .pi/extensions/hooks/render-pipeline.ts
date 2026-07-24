/**
 * hooks/render-pipeline.ts — post-tool hooks: auto-render + changelog + state sync.
 *
 * Extracted from morphmap-hooks.ts. Triggers on map edit.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isMindmapFile, today } from "./helpers";

export function registerRenderPipeline(pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName === "write" || event.toolName === "edit") {
      const path = event.input?.path as string | undefined;
      if (path && isMindmapFile(path) && !event.isError) {
        try {
          const { execSync } = await import("node:child_process");
          const fs = await import("node:fs/promises");

          const mapContent = await fs.readFile(path, "utf8");

          // 1. Render HTML
          execSync(
            "npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open",
            { stdio: "pipe", timeout: 15000 }
          );

          // 2. Inject auto-collapse script
          try {
            if (await fs.stat(".morphmap/markmap-collapse.js")) {
              const script = await fs.readFile(
                ".morphmap/markmap-collapse.js",
                "utf8"
              );
              let html = await fs.readFile(
                ".morphmap/morphmap.mindmap.html",
                "utf8"
              );
              html = html.replace(
                "</body>",
                `<script>${script}</script></body>`
              );
              await fs.writeFile(
                ".morphmap/morphmap.mindmap.html",
                html,
                "utf8"
              );
            }
          } catch {
            // Collapse script optional
          }

          // 3. Generate CHANGELOG.md
          const changelog = generateChangelog(mapContent);
          await fs.writeFile("CHANGELOG.md", changelog, "utf8");

          // 4. ADR check
          const missingAdrs = checkAdrFiles(mapContent);
          if (missingAdrs.length > 0) {
            pi.ui?.notify({
              title: "MorphMap: missing ADR files",
              body: `ADRs referenced in map but not found: ${missingAdrs.join(", ")}`,
              style: "warning",
            });
          }

          // 5. md→json sync
          try {
            const {
              seedFromMap,
            } = await import(
              "../../../../.morphmap/mech-pi/morphmap-seed"
            );
            const seedResult = seedFromMap(path, ".morphmap");
            if (seedResult.branches > 0) {
              pi.ui?.notify({
                title: "MorphMap: state.db synced",
                body: `Seeded ${seedResult.branches} branches, ${seedResult.leaves} leaves from map.`,
                style: "success",
              });
            }
          } catch (syncErr) {
            pi.ui?.notify({
              title: "MorphMap: state.db sync failed",
              body: `Parse error: ${(syncErr as Error).message}. Commit blocked.`,
              style: "error",
            });
            throw syncErr;
          }

          // Stage + commit
          execSync(
            "jj commit -m 'map: auto-render + changelog + state.db after edit'",
            { stdio: "pipe" }
          );

          pi.ui?.notify({
            title: "MorphMap: map rendered",
            body: "HTML + CHANGELOG + state.db regenerated and committed.",
            style: "success",
          });
        } catch {
          // Silent — don't block agent
        }
      }
    }
  });
}

// ── CHANGELOG GENERATOR ─────────────────────────────────────────

interface ReleaseEntry {
  version: string;
  date: string;
}

interface DecisionEntry {
  tag: string;
  text: string;
  date: string;
}

function generateChangelog(mapContent: string): string {
  const releases = extractReleases(mapContent);
  const decisions = extractDecisions(mapContent);
  const lastReleaseDate = releases.length > 0 ? releases[0].date : "";
  const unreleased: DecisionEntry[] = [];
  const versioned: Map<string, DecisionEntry[]> = new Map();

  for (const d of decisions) {
    if (!lastReleaseDate || d.date > lastReleaseDate) {
      unreleased.push(d);
    } else {
      const release =
        releases.find((r) => r.date >= d.date) ??
        releases[releases.length - 1];
      if (release) {
        if (!versioned.has(release.version))
          versioned.set(release.version, []);
        versioned.get(release.version)!.push(d);
      }
    }
  }

  let md =
    "# Changelog\n\nAll notable changes to MorphMap. Auto-generated from .morphmap/morphmap.mindmap.md.\n";

  if (unreleased.length > 0) {
    md += "\n## [Unreleased]\n";
    md += formatSection(unreleased);
  }

  for (const r of releases) {
    const entries = versioned.get(r.version) || [];
    if (entries.length > 0) {
      md += `\n## [${r.version}] — ${r.date}\n`;
      md += formatSection(entries);
    }
  }

  return md;
}

function formatSection(entries: DecisionEntry[]): string {
  const added = entries.filter((e) => e.tag === "implemented");
  const changed = entries.filter((e) => e.tag === "spec");
  const fixed = entries.filter((e) => e.tag === "fix" || e.tag === "violation");
  let md = "";
  if (added.length > 0) {
    md += "\n### Added\n";
    for (const e of added) md += `- ${e.text}\n`;
  }
  if (changed.length > 0) {
    md += "\n### Changed\n";
    for (const e of changed) md += `- ${e.text}\n`;
  }
  if (fixed.length > 0) {
    md += "\n### Fixed\n";
    for (const e of fixed) md += `- ${e.text}\n`;
  }
  return md;
}

function extractReleases(mapContent: string): ReleaseEntry[] {
  const releases: ReleaseEntry[] = [];
  const lines = mapContent.split("\n");
  let inReleases = false;
  for (const line of lines) {
    if (line.startsWith("## releases")) {
      inReleases = true;
      continue;
    }
    if (inReleases && line.startsWith("## ") && !line.startsWith("## releases")) break;
    if (inReleases && line.startsWith("- ")) {
      const match = line.match(/-\s+([\d][\d.\-]+)\s*\(([^)]+)\)/);
      if (match) releases.push({ version: match[1], date: match[2] });
    }
  }
  return releases.sort((a, b) => b.date.localeCompare(a.date));
}

function extractDecisions(mapContent: string): DecisionEntry[] {
  const decisions: DecisionEntry[] = [];
  const lines = mapContent.split("\n");
  let inDecisions = false;
  let currentDate = "";
  for (const line of lines) {
    if (line.startsWith("## decisions")) {
      inDecisions = true;
      continue;
    }
    if (inDecisions && line.startsWith("## ") && !line.startsWith("## decisions")) break;
    if (inDecisions) {
      const dateMatch = line.match(/^###\s+(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        continue;
      }
      if (line.startsWith("- [") && currentDate) {
        const tagMatch = line.match(/^-\s*\[(\w+)\]\s+(.+)/);
        if (tagMatch) {
          decisions.push({ tag: tagMatch[1], text: tagMatch[2].trim(), date: currentDate });
        }
      } else if (line.startsWith("- ") && currentDate && !line.startsWith("- [")) {
        decisions.push({ tag: "spec", text: line.replace(/^-\s*/, "").trim(), date: currentDate });
      }
    }
  }
  return decisions;
}

// ── ADR VERIFICATION ──────────────────────────────────────────

function checkAdrFiles(mapContent: string): string[] {
  const adrRefs = new Set<string>();
  const lines = mapContent.split("\n");
  for (const line of lines) {
    const match = line.match(/ADR-(\d{3})/i);
    if (match) adrRefs.add(`ADR-${match[1]}`);
  }
  const missing: string[] = [];
  for (const adr of adrRefs) {
    try {
      const fs = require("node:fs");
      if (!fs.existsSync("docs/adr")) {
        missing.push(adr);
        continue;
      }
      const files = fs.readdirSync("docs/adr");
      const found = files.some((f: string) =>
        f.startsWith(adr.toLowerCase().replace("adr-", ""))
      );
      if (!found) missing.push(adr);
    } catch {
      missing.push(adr);
    }
  }
  return missing;
}
