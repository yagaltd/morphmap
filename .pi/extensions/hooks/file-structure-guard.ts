/**
 * hooks/file-structure-guard.ts — post-write hook: enforces project structure.
 *
 * Reads .morphmap/structure.json (single source of truth) and warns
 * when a file is created outside known patterns.
 *
 * Does NOT block — it's a warning. New file types are sometimes intentional.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync, existsSync } from "node:fs";

interface StructureConfig {
  patterns: Record<string, Array<{ regex: string; note: string }>>;
  suspicious: Array<{ regex: string; reason: string }>;
  rules: string[];
}

let _config: StructureConfig | null = null;

function loadConfig(): StructureConfig | null {
  if (_config) return _config;
  const path = ".morphmap/structure.json";
  if (!existsSync(path)) return null;
  try {
    _config = JSON.parse(readFileSync(path, "utf8")) as StructureConfig;
    return _config;
  } catch {
    return null;
  }
}

// ── Hook ───────────────────────────────────────────────────────

export function registerFileStructureGuard(pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "write" && event.toolName !== "edit") return;
    if (event.isError) return;

    const path = event.input?.path as string | undefined;
    if (!path) return;

    const normalized = path.replace(/^\/+/, "");
    const cfg = loadConfig();
    if (!cfg) return; // structure.json not found — skip silently

    // Check known patterns
    let known = false;
    for (const group of Object.values(cfg.patterns)) {
      for (const { regex } of group) {
        if (new RegExp(regex).test(normalized)) {
          known = true;
          break;
        }
      }
      if (known) break;
    }

    if (!known) {
      // Check suspicious patterns for more specific warning
      for (const { regex, reason } of cfg.suspicious) {
        if (new RegExp(regex).test(normalized)) {
          pi.ui?.notify({
            title: "MorphMap: file structure violation",
            body: `${normalized}\n${reason}\nUpdate .morphmap/structure.json if this file type is intentional.`,
            style: "warning",
          });
          return;
        }
      }

      // Generic unknown
      pi.ui?.notify({
        title: "MorphMap: new file type detected",
        body: `${normalized}\nNot in .morphmap/structure.json. Consider:\n- Using ## decisions log instead\n- Adding to structure.json if intentional\n- Putting under docs/ if reference material`,
        style: "info",
      });
    }
  });
}
