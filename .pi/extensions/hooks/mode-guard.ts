/**
 * hooks/mode-guard.ts — pre-tool: enforce agent mode (research/brainstorm/plan/implement/review).
 *
 * Reads mode from AGENTS.md frontmatter or session metadata.
 * Blocks tools that are not allowed for the current mode.
 * Uses MODE_TOOL_POLICY from mech types.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { MODE_TOOL_POLICY } from "../../.morphmap/mech/types";
import type { AgentMode } from "../../.morphmap/mech/types";

/** Known tool names the hook may encounter. */
const ALL_KNOWN_TOOLS = [
  "read", "write", "edit", "bash", "mcp", "vcc_recall",
  "ctx_execute", "ctx_execute_file", "ctx_search", "ctx_fetch_and_index",
  "ctx_batch_execute", "ctx_index", "ctx_stats", "ctx_doctor", "ctx_purge",
  "interview", "annotate", "subagent", "subagent_wait", "subagent_supervisor",
  "intercom", "workflow", "get_goal", "create_goal", "update_goal",
  "browser_list_tabs", "browser_get_current_tab", "browser_get_page_html",
  "browser_get_page_text", "browser_capture_screenshot", "browser_get_console_logs",
  "generate_image", "generate_icon", "generate_diagram",
];

let currentMode: AgentMode = "implement"; // default — full access

export function getCurrentMode(): AgentMode {
  return currentMode;
}

export function setCurrentMode(mode: AgentMode): void {
  currentMode = mode;
}

export function registerModeGuard(pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    const policy = MODE_TOOL_POLICY[currentMode];
    if (!policy) return; // unknown mode? allow

    // Wildcard — allow everything
    if (policy.length === 1 && policy[0] === "*") return;

    const tool = event.toolName;

    // Always allow context-mode tools (ctx_*) — they never mutate disk
    if (tool.startsWith("ctx_")) return;

    // Always allow read, vcc_recall, mcp
    if (tool === "read" || tool === "vcc_recall" || tool === "mcp") return;

    // Always allow interview, annotate — user-facing UI
    if (tool === "interview" || tool === "annotate") return;

    // Always allow goal tools
    if (tool === "get_goal" || tool === "create_goal" || tool === "update_goal") return;

    // Check policy
    if (!policy.includes(tool)) {
      const blocked = getBlockedReason(tool);
      pi.ui?.notify({
        title: `MorphMap: mode ${currentMode} — blocked ${tool}`,
        body: blocked,
        style: "warning",
      });
      return {
        block: true,
        reason: `mode ${currentMode}: ${blocked}`,
      };
    }
  });

  // On session start, try to read mode from AGENTS.md
  pi.on("session_start", async (ctx) => {
    try {
      const { readFileSync } = await import("node:fs");
      const content = readFileSync("AGENTS.md", "utf8");
      const match = content.match(/^mode:\s*(\w+)/m);
      if (match) {
        const fromDoc = match[1] as AgentMode;
        if (MODE_TOOL_POLICY[fromDoc]) {
          currentMode = fromDoc;
          pi.ui?.notify({
            title: `MorphMap: mode ${currentMode} (from AGENTS.md)`,
            body: getModeSummary(currentMode),
            style: "info",
          });
        }
      }
    } catch {
      // AGENTS.md not found — stay in default mode
    }
  });
}

function getBlockedReason(tool: string): string {
  const reasons: Record<string, string> = {
    write: "file creation blocked in this mode",
    edit: "file editing blocked in this mode",
    bash: "shell execution blocked in this mode",
    subagent: "delegation blocked in this mode",
    subagent_wait: "delegation blocked in this mode",
    workflow: "workflow orchestration blocked in this mode",
    intercom: "cross-session communication blocked in this mode",
    browser_list_tabs: "browser access blocked in this mode",
    browser_get_current_tab: "browser access blocked in this mode",
    browser_get_page_html: "browser access blocked in this mode",
    browser_get_page_text: "browser access blocked in this mode",
    browser_capture_screenshot: "browser access blocked in this mode",
    browser_get_console_logs: "browser access blocked in this mode",
    generate_image: "image generation blocked in this mode",
    generate_icon: "icon generation blocked in this mode",
    generate_diagram: "diagram generation blocked in this mode",
  };
  return reasons[tool] || `${tool} blocked in mode ${currentMode}`;
}

function getModeSummary(mode: AgentMode): string {
  const summaries: Record<AgentMode, string> = {
    research: "read/search/web only — no writes, no spawn",
    brainstorm: "same as research + write allowed for notes",
    plan: "write/edit specs allowed, no bash/commit/delegate",
    implement: "full access — write, bash, commit, delegate",
    review: "read/search/talk — subagent(read-only) allowed",
  };
  return summaries[mode];
}
