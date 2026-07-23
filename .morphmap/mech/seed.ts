/**
 * mech — seed.ts
 * Pure parser: mindmap markdown → ParsedBranch[] (for state.json bootstrap).
 *
 * Pure: zero pi imports, zero I/O. String in, data out.
 * Spec: docs/mech-mindmap.md §2.2 (JSON source of truth), §7.1 Phase D.
 */
import type {
  BranchState,
  Leaf,
  LeafStatus,
  Bottleneck,
  QALevel,
  TestStrategy,
  ModelAssignment,
  LeafEvidence,
  Posture,
  BranchQuality,
  DepEdge,
} from "./types";
import { assignModel, assignTools } from "./config";
import { emptyEvidence } from "./types";

// ── Emoji → status (distinct display set, §8.5 abandoned) ──────
// Using \u{} escapes to avoid UTF-8 encoding corruption in test runners.
const EMOJI_STATUS: Record<string, LeafStatus> = {
  "\u2B1C": "pending",       // ⬜
  "\u{1F504}": "in_progress", // 🔄
  "\u23F3": "submitted",     // ⏳
  "\u{1F534}": "blocked",    // 🔴
  "\u{1F4A4}": "abandoned",  // 💤
  "\u2705": "done",          // ✅
};

const EMOJI_BOTTLENECK: Record<string, Bottleneck> = {
  "\u{1F534}": "blocking",   // 🔴
  "\u{1F7E1}": "risky",     // 🟡
  "\u26AA": "standard",      // ⚪
  "\u{1F535}": "time",       // 🔵
  "\u{1F7E6}": "verify",     // 🟠
};

const STATUS_EMOJIS = "\u2B1C\u{1F504}\u23F3\u{1F534}\u{1F4A4}\u2705";
const BRANCH_TAGS = ["module", "feature"];

// Code points for status emojis (robust against UTF-16 surrogate issues)
const STATUS_CODEPOINTS = new Set([0x2B1C, 0x1F504, 0x23F3, 0x1F534, 0x1F4A4, 0x2705]);

function isLeafLine(line: string): boolean {
  if (!line.startsWith("- ")) return false;
  const cp = line.codePointAt(2);
  return cp !== undefined && STATUS_CODEPOINTS.has(cp);
}

// ── Leaf line parser ──────────────────────────────────────────

export interface ParsedLeaf {
  id: string;
  status: LeafStatus;
  description: string;
  bottleneck: Bottleneck;
  qa: QALevel;
  test: TestStrategy[];
  needs: string[];
  needsContract: string[];
  estLoc?: number;
}

export function parseLeafLine(line: string): ParsedLeaf | null {
  const match = line.match(/^-\s*([\u2B1C\u{1F504}\u23F3\u{1F534}\u{1F4A4}\u2705])\s+(.+)$/u);
  if (!match) return null;

  const emoji = match[1];
  const rest = match[2]; // everything after emoji + space

  // Split on → (U+2192) to separate description from path + tags
  const arrowIdx = rest.indexOf("\u2192");
  let description: string;
  let pathAndTags: string;
  let tagsStr = "";

  if (arrowIdx >= 0) {
    description = rest.substring(0, arrowIdx).trim();
    pathAndTags = rest.substring(arrowIdx + 1).trim();
  } else {
    // No arrow: extract tags from the end, use remaining text as description
    const tagMatch = rest.match(/\s*(\[[^\]]+\]\s*)*$/);
    tagsStr = tagMatch ? tagMatch[0].trim() : "";
    description = tagMatch ? rest.substring(0, tagMatch.index).trim() : rest.trim();
    pathAndTags = "";
  }

  // Path is the first token in pathAndTags (if it looks like a path)
  const pathMatch = pathAndTags.match(/^(\S+)/);
  const path = pathMatch ? pathMatch[1] : description.toLowerCase().replace(/\s+/g, "-");
  if (!tagsStr) tagsStr = pathMatch ? pathAndTags.substring(pathMatch[1].length).trim() : "";

  const status = EMOJI_STATUS[emoji] ?? "pending";

  // Extract bottleneck from emoji in tags or description
  let bottleneck: Bottleneck = "standard";
  for (const e of Object.keys(EMOJI_BOTTLENECK)) {
    if (tagsStr.includes(e) || description.includes(e)) {
      bottleneck = EMOJI_BOTTLENECK[e];
      break;
    }
  }

  // Parse tags
  const qaMatch = tagsStr.match(/\[qa:\s*(\w+)\]/);
  const qa = (qaMatch ? qaMatch[1] : "review") as QALevel;

  const testMatches = tagsStr.match(/\[test:\s*([^\]]+)\]/);
  const test = testMatches
    ? testMatches[1].split(/\s*\+\s*/).map((t) => t.trim() as TestStrategy)
    : (["unit"] as TestStrategy[]);

  const needsMatches = tagsStr.match(/\[needs:\s*([^\]]+)\]/g) || [];
  const needs = needsMatches.map((m) => m.match(/\[needs:\s*([^\]]+)\]/)![1].trim());

  const needsContractMatches = tagsStr.match(/\[needs-contract:\s*([^\]]+)\]/g) || [];
  const needsContract = needsContractMatches.map((m) =>
    m.match(/\[needs-contract:\s*([^\]]+)\]/)![1].trim(),
  );

  const estLocMatch = tagsStr.match(/\[est-loc:\s*(\d+)\]/);
  const estLoc = estLocMatch ? parseInt(estLocMatch[1], 10) : undefined;

  return {
    id: path,
    status,
    description,
    bottleneck,
    qa,
    test,
    needs,
    needsContract,
    estLoc,
  };
}

// ── Branch parser ─────────────────────────────────────────────

export interface ParsedBranch {
  branchId: string;
  heading: string;
  level: number;
  status: LeafStatus;
  leaves: ParsedLeaf[];
  subBranches: string[];
  quality: BranchQuality;
}

interface ParsedBranchInternal extends ParsedBranch {
  _endLine: number;
}

export function parseMapToBranches(mapContent: string): ParsedBranch[] {
  const lines = mapContent.split("\n");
  const branches: ParsedBranchInternal[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{2,})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const isBranch = BRANCH_TAGS.some((tag) => headingText.includes(`[${tag}]`));
      if (isBranch && level >= 2) {
        const branch = parseBranch(lines, i, level, headingText);
        if (branch) {
          branches.push(branch);
          i = branch._endLine;
          continue;
        }
      }
    }
    i++;
  }

  return branches;
}

function parseBranch(
  lines: string[],
  startIdx: number,
  level: number,
  headingText: string,
): ParsedBranchInternal | null {
  const statusMatch = headingText.match(/[\u2B1C\u{1F504}\u23F3\u{1F534}\u{1F4A4}\u2705]/u);
  const status = statusMatch ? (EMOJI_STATUS[statusMatch[0]] ?? "pending") : "pending";

  const nameMatch = headingText.match(/^(.+?)\s*[\u2B1C\u{1F504}\u23F3\u{1F534}\u{1F4A4}\u2705]/u);
  const name = nameMatch ? nameMatch[1].trim() : headingText.replace(/\[.*?\]/g, "").trim();
  const branchId = name.toLowerCase().replace(/\s+/g, "-");

  const qualityMatch = headingText.match(/\[qa:\s*(integration|security|perf)\]/);
  const quality = (qualityMatch ? qualityMatch[1] : "fast") as BranchQuality;

  const leaves: ParsedLeaf[] = [];
  const subBranches: string[] = [];
  let endLine = startIdx + 1;

  for (let j = startIdx + 1; j < lines.length; j++) {
    const line = lines[j];
    const childHeading = line.match(/^(#{2,})\s+(.+)$/);

    if (childHeading) {
      const childLevel = childHeading[1].length;
      if (childLevel <= level) {
        endLine = j;
        break;
      }
      const childText = childHeading[2].trim();
      if (BRANCH_TAGS.some((tag) => childText.includes(`[${tag}]`))) {
        const childName = childText
          .replace(/[\u2B1C\u{1F504}\u23F3\u{1F534}\u{1F4A4}\u2705]/gu, "")
          .replace(/\[.*?\]/g, "")
          .trim();
        subBranches.push(childName.toLowerCase().replace(/\s+/g, "-"));
      }
      endLine = j + 1;
      continue;
    }

    if (isLeafLine(line)) {
      const parsed = parseLeafLine(line);
      if (parsed) leaves.push(parsed);
    }
    endLine = j + 1;
  }

  return {
    branchId,
    heading: headingText,
    level,
    status: status as LeafStatus,
    leaves,
    subBranches,
    quality,
    _endLine: endLine,
  };
}

// ── Build BranchState from ParsedBranch ───────────────────────

export function buildBranchState(
  parsed: ParsedBranch,
  posture?: Posture,
): BranchState {
  const leaves: Record<string, Leaf> = {};

  for (const pl of parsed.leaves) {
    const model = assignModel(pl.bottleneck, pl.qa, pl.test);
    const tools = assignTools(pl.test, []);

    leaves[pl.id] = {
      id: pl.id,
      status: pl.status,
      bottleneck: pl.bottleneck,
      qa: pl.qa,
      test: pl.test,
      model,
      tools,
      evidence: emptyEvidence(),
      reviewRounds: 0,
      trace: `${parsed.branchId}/${pl.id}`,
      estLoc: pl.estLoc,
    };
  }

  return {
    branchId: parsed.branchId,
    status: parsed.status as BranchState["status"],
    quality: parsed.quality,
    posture,
    leaves,
    subBranches: parsed.subBranches,
    childBranchStatus: {},
    transitions: [],
    integrationStatus: {
      reviewFileExists: false,
      healthCheckPassed: null,
      bombadilPassed: null,
      lonkeroPassed: null,
      allLeavesComplete: false,
      crossLeafConflicts: [],
    },
  };
}

// ── Build state index ─────────────────────────────────────────

export function buildStateIndex(branches: BranchState[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const branch of branches) {
    index[branch.branchId] = `plans/${branch.branchId}/state.json`;
  }
  return index;
}
