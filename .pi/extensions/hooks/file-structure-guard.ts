/**
 * hooks/file-structure-guard.ts — post-write hook: enforces project structure.
 *
 * Warns when a file is created outside known structure patterns.
 * The whitelist mirrors AGENTS.md Project Structure + established conventions.
 *
 * Does NOT block — it's a warning. New file types are sometimes intentional.
 * But the agent should update AGENTS.md Project Structure when adding one.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ── Known structure patterns (glob-style) ─────────────────────
// Ordered most-specific-first. New patterns added when project evolves.

const KNOWN_PATTERNS: { pattern: RegExp; description: string }[] = [
  // .morphmap/ core files
  { pattern: /^\.morphmap\/morphmap\.mindmap\.md$/, description: "mindmap kanban" },
  { pattern: /^\.morphmap\/morphmap\.mindmap\.html$/, description: "rendered mindmap" },
  { pattern: /^\.morphmap\/config\.json$/, description: "model config" },
  { pattern: /^\.morphmap\/config$/, description: "legacy config" },
  { pattern: /^\.morphmap\/standards\.md$/, description: "coding standards" },
  { pattern: /^\.morphmap\/CONTEXT\.md$/, description: "domain glossary" },
  { pattern: /^\.morphmap\/improv-map\.md$/, description: "improvement map" },
  { pattern: /^\.morphmap\/index\.md$/, description: "resource index" },
  { pattern: /^\.morphmap\/markmap-collapse\.js$/, description: "collapse script" },
  { pattern: /^\.morphmap\/state\.db$/, description: "SQLite state" },
  { pattern: /^\.morphmap\/state-index\.json$/, description: "state index" },
  { pattern: /^\.morphmap\/grill-questions\.json$/, description: "typed ambiguity records" },

  // .morphmap/ generated artifacts
  { pattern: /^\.morphmap\/specs\/.+/i, description: "spec file" },
  { pattern: /^\.morphmap\/mech\/.+/i, description: "pure mech module" },
  { pattern: /^\.morphmap\/mech-pi\/.+/i, description: "impure mech-pi module" },
  { pattern: /^\.morphmap\/scout-\d+-\d{8}-.+\.md$/, description: "scout handoff" },
  { pattern: /^\.morphmap\/researcher-\d+-\d{8}-.+\.md$/, description: "research brief" },
  { pattern: /^\.morphmap\/review-\d{8}-\d{6}\.md$/, description: "review handoff" },
  { pattern: /^\.morphmap\/quality-review-\d+-\d{8}-.+\.md$/, description: "quality review" },
  { pattern: /^\.morphmap\/hats-\w+-\d{8}-\d{6}\.md$/, description: "hats session (--file flag)" },

  // agents + hooks
  { pattern: /^\.pi\/agents\/.+/i, description: "agent definition" },
  { pattern: /^\.pi\/extensions\/.+/i, description: "extension/hook" },

  // project files
  { pattern: /^skills\/\w+\/SKILL\.md$/, description: "skill file" },
  { pattern: /^prompts\/morphmap-\w+\.md$/, description: "prompt template" },
  { pattern: /^docs\/.+/i, description: "documentation" },
  { pattern: /^examples\/.+/i, description: "examples" },
  { pattern: /^\.github\/workflows\/.+\.yml$/, description: "CI workflow" },
  { pattern: /^CHANGELOG\.md$/, description: "changelog" },
  { pattern: /^package\.json$/, description: "package manifest" },
  { pattern: /^tsconfig\.json$/, description: "TypeScript config" },
  { pattern: /^index\.ts$/, description: "extension entry" },
  { pattern: /^AGENTS\.md$/, description: "orchestrator instructions" },
  { pattern: /^README\.md$/, description: "project readme" },
  { pattern: /^\.gitignore$/, description: "git ignore" },

  // temp/test artifacts (warn at info level, not warning)
  { pattern: /^\.pi-subagents\/.+/i, description: "subagent artifact (temp)" },
  { pattern: /^\/tmp\/.+/, description: "temp file outside project" },
];

// Patterns that are definitely wrong (block-level warning)
const SUSPICIOUS_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /^\.morphmap\/(?!morphmap|config|standards|CONTEXT|improv|index|markmap|state|grill|specs|mech|scout|researcher|review|quality|hats)/i, reason: "unknown file in .morphmap/ — use specs/, mech/, or decisions log" },
  { pattern: /^skills\/.+(?<!\/SKILL)\.md$/, reason: "file in skills/ not a SKILL.md — skills must be in skills/<name>/SKILL.md" },
  { pattern: /^(?!\.morphmap\/|\.pi\/|skills\/|prompts\/|docs\/|examples\/|CHANGELOG|package|tsconfig|index|AGENTS|\.git|\.github|README).+/, reason: "top-level file not in project structure — use docs/, .morphmap/, or existing directories" },
];

// ── Hook ───────────────────────────────────────────────────────

export function registerFileStructureGuard(pi: ExtensionAPI) {
  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "write" && event.toolName !== "edit") return;
    if (event.isError) return;

    const path = event.input?.path as string | undefined;
    if (!path) return;

    // Normalize: strip leading /
    const normalized = path.replace(/^\/+/, "");

    // Check known patterns
    let known = false;
    for (const { pattern, description } of KNOWN_PATTERNS) {
      if (pattern.test(normalized)) {
        known = true;
        break;
      }
    }

    if (!known) {
      // Check suspicious patterns for a more specific warning
      for (const { pattern, reason } of SUSPICIOUS_PATTERNS) {
        if (pattern.test(normalized)) {
          pi.ui?.notify({
            title: "MorphMap: file structure violation",
            body: `${normalized}\n${reason}\nUpdate AGENTS.md Project Structure if this file type is intentional.`,
            style: "warning",
          });
          return;
        }
      }

      // Generic unknown file — info level (might be build artifact)
      pi.ui?.notify({
        title: "MorphMap: new file type detected",
        body: `${normalized}\nNot in known project structure. Consider:\n- Using ## decisions log instead\n- Adding to AGENTS.md Project Structure if intentional\n- Putting under docs/ if reference material`,
        style: "info",
      });
    }
  });
}
