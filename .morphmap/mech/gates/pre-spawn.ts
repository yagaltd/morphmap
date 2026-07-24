/**
 * mech gates — pre-spawn (before leaf worker starts).
 * Spec §2.4 preSpawnGates. Pure: read evidence + leaf, no I/O.
 * The impure layer populates evidence.specExists etc. (Phase D).
 */
import type { Gate, TransitionGateCtx } from "../types";
import { canStartLeaf } from "../state";
import { fail, pass, warn } from "./common";

export const specFileExists: Gate<TransitionGateCtx> = {
  name: "specFileExists",
  run: ({ evidence }) =>
    evidence.specExists ? pass() : fail(".spec file missing for leaf"),
};

export const specScenarioCount: Gate<TransitionGateCtx> = {
  name: "specScenarioCount",
  run: ({ evidence }) =>
    evidence.specScenarioCount <= 5
      ? pass()
      : fail(
          `too many BDD scenarios (${evidence.specScenarioCount} > 5) — split leaf`,
        ),
};

export const specFileCount: Gate<TransitionGateCtx> = {
  name: "specFileCount",
  run: ({ evidence }) =>
    evidence.specFileCount <= 3
      ? pass()
      : fail(
          `too many files in Allowed Changes (${evidence.specFileCount} > 3) — split leaf`,
        ),
};

// SOFT gate — never blocks (finding E, doc L132). Override via [est-loc: N] tag.
export const specEstLOC: Gate<TransitionGateCtx> = {
  name: "specEstLOC",
  run: ({ leaf, evidence }) => {
    const est = leaf.estLoc ?? evidence.specScenarioCount * 30;
    return est <= 200
      ? pass()
      : warn(`estimated ${est} LOC > 200 ([est-loc: N] tag to override)`);
  },
};

export const modelAssigned: Gate<TransitionGateCtx> = {
  name: "modelAssigned",
  run: ({ leaf }) =>
    leaf.model && leaf.model.model
      ? pass()
      : fail("no model assigned (run config.assignModel)"),
};

export const toolsAssigned: Gate<TransitionGateCtx> = {
  name: "toolsAssigned",
  run: ({ leaf }) =>
    leaf.tools.length > 0
      ? pass()
      : fail("no tools assigned (run config.assignTools)"),
};

export const dependenciesResolvable: Gate<TransitionGateCtx> = {
  name: "dependenciesResolvable",
  run: ({ leaf, graph, allLeaves }) => {
    if (!graph || !allLeaves) return pass(); // no graph supplied → skip
    const r = canStartLeaf(leaf.id, graph, allLeaves);
    return r.buildBlocked
      ? fail(`dependencies not met: ${r.blockedBy.join(", ")}`)
      : pass();
  },
};

// Blocks spawn if material ambiguities remain unresolved (ARIA-inspired).
export const ambiguitiesResolved: Gate<TransitionGateCtx> = {
  name: "ambiguitiesResolved",
  run: ({ grillQuestions }) => {
    if (!grillQuestions || grillQuestions.length === 0) return pass(); // no grill file → skip
    const unresolved = grillQuestions.filter(
      (q) => q.severity === "material" && q.resolution === null,
    );
    return unresolved.length === 0
      ? pass()
      : fail(
          `unresolved material ambiguities: ${unresolved.map((q) => q.id).join(", ")}`,
        );
  },
};

export const preSpawnGates: Gate<TransitionGateCtx>[] = [
  specFileExists,
  specScenarioCount,
  specFileCount,
  specEstLOC,
  modelAssigned,
  toolsAssigned,
  dependenciesResolvable,
  ambiguitiesResolved,
];
