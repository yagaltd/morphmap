/**
 * MorphMap Hooks — semi-mechanical process automation for pi.
 *
 * Three-layer enforcement for MorphMap conventions:
 *   Layer 1: Mechanical blocks (spec guard, path guard)
 *   Layer 2: Agent rules (execution loop, map write protocol)
 *   Layer 3: Improve loop (failure recovery, intercom audit, auto-improve trigger)
 *
 * Installed automatically with the MorphMap pi package via package.json.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerMechTools } from "../../.morphmap/mech-pi/morphmap-tools-pi";

// ── Session state (survives across hook invocations) ──────────

interface SessionState {
  failureCounts: Map<string, number>;        // toolName → fail count
  lastLeafCompletion: { turn: number; leaf: string } | null;
  pendingIntercomCheck: boolean;
  turnCount: number;
  notifiedPatterns: Set<string>;             // avoid duplicate improve notifications
}

function getState(ctx: any): SessionState {
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

// ── Known failure patterns and recovery suggestions ───────────

const FAILURE_PATTERNS: Record<string, { pattern: RegExp; suggestion: string; severity: "retry" | "alternative" | "fix" }> = {
  contextModeOverwrite: {
    pattern: /context.mode.*overwrite|ctx_execute.*blocked|FTS5.*locked/i,
    suggestion: "context-mode conflict. Retry with built-in tool (bash/read) or wait 2s for FTS5 lock release.",
    severity: "retry",
  },
  toolNotFound: {
    pattern: /command not found|not found|no such file/i,
    suggestion: "Tool not available. Update agent system prompt to remove or replace this tool reference.",
    severity: "fix",
  },
  permissionDenied: {
    pattern: /permission denied|EACCES|not allowed/i,
    suggestion: "Permission denied. Check file ownership or use a path inside the project.",
    severity: "alternative",
  },
  subagentTimeout: {
    pattern: /timeout|timed out|deadline exceeded/i,
    suggestion: "Subagent timeout. Increase timeoutMs or split the task into smaller leaves.",
    severity: "retry",
  },
  npmPackageMissing: {
    pattern: /npm.*not found|cannot find module|ENOENT.*node_modules/i,
    suggestion: "Missing npm package. Run 'npm install' or add to package.json dependencies.",
    severity: "fix",
  },
  gitConflict: {
    pattern: /merge conflict|CONFLICT|would be overwritten/i,
    suggestion: "Git conflict detected. Resolve manually or use worktree isolation for parallel branches.",
    severity: "alternative",
  },
};

// ── MAIN ──────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {

  // Register the three deterministic transition tools (§2.5). Agents MUST
  // call these to advance leaf/branch status — the gate enforcement point.
  registerMechTools(pi);

  // ============================================================
  // PRE-TOOL HOOKS
  // ============================================================

  pi.on("tool_call", async (event, ctx) => {
    const state = getState(ctx);
    state.turnCount++;

    // ── Intercom audit (check if previous leaf completion was signaled) ──

    if (state.pendingIntercomCheck) {
      if (event.toolName === "intercom" || event.toolName === "subagent_supervisor") {
        state.pendingIntercomCheck = false;
      } else if (state.turnCount - (state.lastLeafCompletion?.turn ?? 0) > 8) {
        // 8 turns since leaf completion, no intercom sent
        try {
          const { execSync } = await import("node:child_process");
          const mapPath = ".morphmap/morphmap.mindmap.md";
          const mapContent = execSync(`cat "${mapPath}"`, { encoding: "utf8", stdio: "pipe" });
          
          // Check if map was updated (leaf status changed)
          const leaf = state.lastLeafCompletion?.leaf ?? "unknown";
          if (!mapContent.includes(leaf) || mapContent.includes(`⬜ ${leaf}`)) {
            pi.ui?.notify({
              title: "MorphMap: intercom may be missing",
              body: `Leaf '${leaf}' completed but map not updated and no intercom sent. Check step 7b in execution loop.`,
              style: "warning",
            });
          }
        } catch {
          // Silent
        }
        state.pendingIntercomCheck = false;
        state.lastLeafCompletion = null;
      }
    }

    // ── 1. Block subagent spawn without .spec file ────────────

    if (event.toolName === "subagent") {
      const agent = event.input?.agent as string | undefined;
      const task = event.input?.task as string | undefined;

      if (agent === "morphmap/leaf-worker" && task) {
        // .spec guard — only for leaf workers
        const specPath = extractSpecPath(task);
        if (specPath) {
          try {
            const fs = await import("node:fs/promises");
            await fs.access(specPath);
          } catch {
            pi.ui?.notify({
              title: "MorphMap: blocked leaf-worker",
              body: `.spec file missing: ${specPath}`,
              style: "warning",
            });
            return {
              block: true,
              reason: `.spec file not found: ${specPath}. Write the .spec before spawning leaf worker.`,
            };
          }
        }

        // Model enforcement — only for leaf workers (bottleneck-tagged)
        const model = event.input?.model as string | undefined;
        if (model && task) {
          const bottleneck = extractBottleneck(task);
          const isFlash = model.includes("flash");
          const isPro = model.includes("pro");
          
          if (bottleneck === "🔴" && isFlash) {
            // BLOCKING leaf with cheap model → hard block
            return {
              block: true,
              reason: `🔴 BLOCKING leaf spawned with ${model}. Config requires claude-sonnet-4 or equivalent. Use agent-spec config leafProfiles.blocking model.`,
            };
          }
          
          if (bottleneck === "🟡" && isFlash) {
            pi.ui?.notify({
              title: "MorphMap: model may be too weak",
              body: `🟡 RISKY leaf spawned with ${model}. Config suggests deepseek-v4-pro with high thinking. Consider respawning.`,
              style: "warning",
            });
          }
        }

        // Save token baseline for ALL morphmap agent spawns (telemetry delta)
        if (agent && (agent as string).startsWith("morphmap/")) {
          state._preSpawnTokensIn = parseInt(process.env.PI_RUN_TOKENS_IN || "0", 10);
          state._preSpawnTokensOut = parseInt(process.env.PI_RUN_TOKENS_OUT || "0", 10);
          state._preSpawnCost = parseFloat(process.env.PI_RUN_ESTIMATED_COST || "0");
          state._preSpawnAgent = agent;
          state._preSpawnTask = task || "";
        }
      }
    }

    // ── 2. Warn on update_goal complete (gate reminder) ───────

    if (event.toolName === "update_goal") {
      const status = event.input?.status as string | undefined;
      if (status === "complete") {
        pi.ui?.notify({
          title: "MorphMap: goal completion",
          body: "Step 13: run goal completion gate before marking complete. Check: pending leaves, missing .specs, unresolved deps.",
          style: "info",
        });
      }
    }
  });

  // ============================================================
  // POST-TOOL HOOKS
  // ============================================================

  pi.on("tool_result", async (event, ctx) => {
    const state = getState(ctx);

    // ── 3. Auto-render + changelog + commit after map edit ──

    if (event.toolName === "write" || event.toolName === "edit") {
      const path = event.input?.path as string | undefined;
      if (path && isMindmapFile(path) && !event.isError) {
        try {
          const { execSync } = await import("node:child_process");
          const fs = await import("node:fs/promises");
          
          // Read map content for changelog generation
          const mapContent = await fs.readFile(path, "utf8");
          
          // Render HTML
          execSync(
            "npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open",
            { stdio: "pipe", timeout: 15000 }
          );

          // Inject auto-collapse script (collapse ✅ branches)
          if (fs.existsSync(".morphmap/markmap-collapse.js")) {
            const script = await fs.readFile(".morphmap/markmap-collapse.js", "utf8");
            let html = await fs.readFile(".morphmap/morphmap.mindmap.html", "utf8");
            html = html.replace("</body>", `<script>${script}</script></body>`);
            await fs.writeFile(".morphmap/morphmap.mindmap.html", html, "utf8");
          }

          // Generate CHANGELOG.md from map decisions
          const changelog = generateChangelog(mapContent);
          await fs.writeFile("CHANGELOG.md", changelog, "utf8");

          // ADR check: verify referenced ADR files exist
          const missingAdrs = checkAdrFiles(mapContent);
          if (missingAdrs.length > 0) {
            pi.ui?.notify({
              title: "MorphMap: missing ADR files",
              body: `ADRs referenced in map but not found: ${missingAdrs.join(", ")}. Create these files in docs/adr/.`,
              style: "warning",
            });
          }

          // ── md→json sync: parse mindmap → state.json ──
          // §2.7 Step A: on map write, parse markdown → validate → write state.json
          try {
            const { seedFromMap } = await import("../../.morphmap/mech-pi/morphmap-seed");
            const seedResult = seedFromMap(path, ".morphmap");
            if (seedResult.branches > 0) {
              pi.ui?.notify({
                title: "MorphMap: state.json synced",
                body: `Seeded ${seedResult.branches} branches, ${seedResult.leaves} leaves from map.`,
                style: "success",
              });
            }
          } catch (syncErr) {
            pi.ui?.notify({
              title: "MorphMap: state.json sync failed",
              body: `Parse error: ${(syncErr as Error).message}. Commit blocked.`,
              style: "error",
            });
            throw syncErr; // block the commit
          }

          // Stage all generated artifacts (map + html + changelog + state.json)
          execSync("git add .morphmap/morphmap.mindmap.md .morphmap/morphmap.mindmap.html .morphmap/state.json .morphmap/state-index.json CHANGELOG.md", {
            stdio: "pipe",
          });
          execSync(
            `git commit -m "map: auto-render + changelog + state.json after edit" --allow-empty`,
            { stdio: "pipe" }
          );

          pi.ui?.notify({
            title: "MorphMap: map rendered",
            body: "HTML + CHANGELOG + state.json regenerated and committed.",
            style: "success",
          });
        } catch {
          // Silent — don't block the agent on render failure
        }
      }
    }

    // ── 4. Telemetry: track ALL morphmap agent completions ─────

    if (event.toolName === "subagent" && !event.isError) {
      const result = event.result as any;
      const agent = event.input?.agent as string | undefined;
      const task = event.input?.task as string | undefined;
      const model = event.input?.model as string || "unknown";
      const thinking = event.input?.thinking as string || "off";

      // Intercom audit: track leaf completions specifically
      if (agent === "morphmap/leaf-worker" && result?.ok && task) {
        const leafName = extractLeafName(task);
        state.lastLeafCompletion = { turn: state.turnCount, leaf: leafName ?? "unknown" };
        state.pendingIntercomCheck = true;
      }

      // Telemetry: capture for ALL morphmap agents
      if (agent && agent.startsWith("morphmap/") && result?.ok) {
        const agentName = agent.replace("morphmap/", "");
        const taskLabel = extractTaskLabel(task || "");
        const postTokensIn = parseInt(process.env.PI_RUN_TOKENS_IN || "0", 10);
        const postTokensOut = parseInt(process.env.PI_RUN_TOKENS_OUT || "0", 10);
        const postCost = parseFloat(process.env.PI_RUN_ESTIMATED_COST || "0");
        const deltaIn = postTokensIn - (state._preSpawnTokensIn || 0);
        const deltaOut = postTokensOut - (state._preSpawnTokensOut || 0);
        const deltaCost = (postCost - (state._preSpawnCost || 0)).toFixed(4);
        
        try {
          const { execSync } = await import("node:child_process");
          const entry = `- ${today()}: [telemetry] agent-result: agent=morphmap/${agentName} task=${taskLabel} model=${model} thinking=${thinking} tokens-in=${deltaIn} tokens-out=${deltaOut} cost=\$${deltaCost} result=✅`;
          execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, { stdio: "pipe" });
        } catch {
          // Silent
        }
      }
    }

    // ── 5. Failure recovery: detect known patterns ─────────────

    if (event.isError) {
      const errorMsg = extractError(event);
      const toolName = event.toolName;

      // Increment failure count
      const count = (state.failureCounts.get(toolName) || 0) + 1;
      state.failureCounts.set(toolName, count);

      // Match against known patterns
      let matchedPattern: string | null = null;
      for (const [key, pattern] of Object.entries(FAILURE_PATTERNS)) {
        if (pattern.pattern.test(errorMsg)) {
          matchedPattern = key;
          
          const notifyStyle = pattern.severity === "fix" ? "error" :
                              pattern.severity === "alternative" ? "warning" : "info";
          
          pi.ui?.notify({
            title: `MorphMap: ${pattern.severity.toUpperCase()} — ${toolName} failure`,
            body: pattern.suggestion,
            style: notifyStyle,
          });

          break; // Report first match only
        }
      }

      // ── 6. Auto-trigger improve on repeated failures ─────────

      const patternKey = `${toolName}:${matchedPattern ?? "unknown"}`;
      if (count >= 3 && !state.notifiedPatterns.has(patternKey)) {
        state.notifiedPatterns.add(patternKey);
        
        pi.ui?.notify({
          title: "MorphMap: repeated failure — improve loop recommended",
          body: `${toolName} failed ${count}x (pattern: ${matchedPattern ?? "unclassified"}).\nRun /morphmap-improve to find root cause and fix.\nConsider: edit agent system prompt, replace tool, or restructure task.`,
          style: "error",
        });

        // Log improve trigger to decisions
        try {
          const { execSync } = await import("node:child_process");
          const entry = `- ${today()}: [telemetry] improve-trigger: tool=${toolName} failures=${count} pattern=${matchedPattern ?? "unknown"}`;
          execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, { stdio: "pipe" });
        } catch {
          // Silent
        }
      }

      // ── 7. Rich telemetry logging ────────────────────────────

      try {
        const { execSync } = await import("node:child_process");
        const shortError = errorMsg.replace(/\n/g, " ").slice(0, 150);
        const entry = `- ${today()}: [telemetry] tool-failure: tool=${toolName} attempt=${count} pattern=${matchedPattern ?? "unclassified"} error="${shortError}"`;
        execSync(`echo "${entry}" >> .morphmap/morphmap.mindmap.md`, { stdio: "pipe" });
      } catch {
        // Silent
      }
    } else {
      // Reset failure count on success
      if (state.failureCounts.has(event.toolName)) {
        state.failureCounts.delete(event.toolName);
      }
    }
  });
}

// ── HELPERS ───────────────────────────────────────────────────

function isMindmapFile(path: string): boolean {
  return path.includes("morphmap.mindmap.md") || path.includes(".mindmap.md");
}

function extractSpecPath(task: string): string | null {
  const match = task.match(/\.spec\s+(\S+\.spec)/);
  return match ? match[1] : null;
}

function extractBottleneck(task: string): string | null {
  // Look for bottleneck emoji in task description
  const match = task.match(/(🔴|🟡|🔵|🟠|⚪)/);
  return match ? match[1] : null;
}

function extractLeafName(task: string): string | null {
  // Task format: "Implement <leaf-name> against .spec <path>."
  const match = task.match(/^Implement\s+(.+?)\s+against/i);
  return match ? match[1].trim() : null;
}

function extractTaskLabel(task: string): string {
  // Extract a short label from any agent task string
  // leaf-worker: "Implement <leaf> against .spec <path>"
  const leafMatch = task.match(/^Implement\s+(.+?)\s+against/i);
  if (leafMatch) return leafMatch[1].trim();
  // reviewer: "Mechanical review:" or "Integration review of <name>"
  const reviewMatch = task.match(/(?:Mechanical review|Integration review|Review|Quality review)[^:]*:\s*(.+)/i);
  if (reviewMatch) return reviewMatch[1].trim();
  // branch-agent: "Own <heading> subtree"
  const branchMatch = task.match(/Own\s+(.+?)\s+subtree/i);
  if (branchMatch) return branchMatch[1].trim();
  // scout/researcher: "Recon <area>" or "Research <topic>"
  const reconMatch = task.match(/(?:Recon|Research|Scout)\s+(.+)/i);
  if (reconMatch) return reconMatch[1].trim();
  // Fallback: first 60 chars
  return task.slice(0, 60).replace(/\n/g, " ");
}

function extractError(event: any): string {
  // Try multiple places where errors might be stored
  const result = event.result;
  if (typeof result === "string") return result;
  if (result?.error) return String(result.error);
  if (result?.stderr) return String(result.stderr);
  if (result?.message) return String(result.message);
  if (result === undefined || result === null) return "unknown error (no result)";
  return JSON.stringify(result).slice(0, 500);
}

function today(): string {
  return new Date().toISOString().split("T")[0];
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
  // Extract releases section
  const releases = extractReleases(mapContent);
  
  // Extract all decisions with dates
  const decisions = extractDecisions(mapContent);
  
  // Find last release date (decisions after this go to Unreleased)
  const lastReleaseDate = releases.length > 0 ? releases[0].date : "";
  
  // Group decisions by version
  const unreleased: DecisionEntry[] = [];
  const versioned: Map<string, DecisionEntry[]> = new Map();
  
  for (const d of decisions) {
    if (!lastReleaseDate || d.date > lastReleaseDate) {
      unreleased.push(d);
    } else {
      // Assign to most recent release that is >= this decision's date
      const release = releases.find(r => r.date >= d.date) ?? releases[releases.length - 1];
      if (release) {
        const key = release.version;
        if (!versioned.has(key)) versioned.set(key, []);
        versioned.get(key)!.push(d);
      }
    }
  }
  
  // Build changelog
  let md = "# Changelog\n\nAll notable changes to MorphMap. Auto-generated from .morphmap/morphmap.mindmap.md.\n";
  
  // Unreleased first
  if (unreleased.length > 0) {
    md += "\n## [Unreleased]\n";
    md += formatSection(unreleased);
  }
  
  // Versioned releases (newest first)
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
  const added = entries.filter(e => e.tag === "implemented");
  const changed = entries.filter(e => e.tag === "spec") ;
  const fixed = entries.filter(e => e.tag === "fix" || e.tag === "violation");
  
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
    if (inReleases && line.startsWith("## ") && !line.startsWith("## releases")) {
      break;
    }
    if (inReleases && line.startsWith("- ")) {
      // Format: "- 0.2.0 (2026-07-20): ..." or "- 2026-07-19 (2026-07-19): ..."
      const match = line.match(/-\s+([\d][\d.\-]+)\s*\(([^)]+)\)/);
      if (match) {
        releases.push({ version: match[1], date: match[2] });
      }
    }
  }
  
  return releases.sort((a, b) => b.date.localeCompare(a.date)); // newest first
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
    if (inDecisions && line.startsWith("## ") && !line.startsWith("## decisions")) {
      break;
    }
    if (inDecisions) {
      // Extract date from ### heading
      const dateMatch = line.match(/^###\s+(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        currentDate = dateMatch[1];
        continue;
      }
      // Extract tagged entries (skip sub-branch headings like ####)
      if (line.startsWith("- [") && currentDate) {
        const tagMatch = line.match(/^-\s*\[(\w+)\]\s+(.+)/);
        if (tagMatch) {
          decisions.push({
            tag: tagMatch[1],
            text: tagMatch[2].trim(),
            date: currentDate,
          });
        }
      } else if (line.startsWith("- ") && currentDate && !line.startsWith("- [")) {
        // Untagged entries → treated as "changed"
        decisions.push({
          tag: "spec",
          text: line.replace(/^-\s*/, "").trim(),
          date: currentDate,
        });
      }
    }
  }
  
  return decisions;
}

// ── ADR VERIFICATION ──────────────────────────────────────────────

function checkAdrFiles(mapContent: string): string[] {
  // Extract ADR references from decisions log and architecture-decisions branch
  const adrRefs = new Set<string>();
  const lines = mapContent.split("\n");
  
  for (const line of lines) {
    // Match: ADR-001, adr/001, docs/adr/001-title.md
    const match = line.match(/ADR-(\d{3})/i);
    if (match) {
      adrRefs.add(`ADR-${match[1]}`);
    }
  }
  
  // Check if each ADR file exists
  const missing: string[] = [];
  for (const adr of adrRefs) {
    try {
      // Find matching ADR file in docs/adr/
      const fs = require("node:fs");
      if (!fs.existsSync("docs/adr")) {
        // All ADRs missing — directory doesn't exist
        missing.push(adr);
        continue;
      }
      const files = fs.readdirSync("docs/adr");
      const found = files.some((f: string) => f.startsWith(adr.toLowerCase().replace("adr-", "")));
      if (!found) missing.push(adr);
    } catch {
      missing.push(adr);
    }
  }
  
  return missing;
}
