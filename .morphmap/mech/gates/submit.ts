/**
 * mech gates — submit (leaf worker → branch agent, on submit_leaf).
 * Spec §2.4 submitGates. Proves the work was actually done.
 */
import type { Gate, LeafEvidence, TransitionGateCtx } from "../types";
import { fail, pass, skip } from "./common";

export const agentSpecLifecycle: Gate<TransitionGateCtx> = {
  name: "agentSpecLifecycle",
  run: ({ evidence }) =>
    evidence.agentSpecPassed ? pass() : fail("agent-spec lifecycle failed"),
};

// null = tdd-guard absent → skip gracefully (finding A resolution).
export const tddGuardPassed: Gate<TransitionGateCtx> = {
  name: "tddGuardPassed",
  run: ({ evidence }) => {
    if (evidence.tddGuardPassed === null) return skip();
    return evidence.tddGuardPassed ? pass() : fail("tdd-guard failed");
  },
};

export const npmTestAndBuild: Gate<TransitionGateCtx> = {
  name: "npmTestAndBuild",
  run: ({ evidence }) => {
    const failed: string[] = [];
    if (!evidence.npmTestPassed) failed.push("npm test");
    if (!evidence.npmBuildPassed) failed.push("npm build");
    return failed.length === 0 ? pass() : fail(`${failed.join(" + ")} failed`);
  },
};

export const boundariesClean: Gate<TransitionGateCtx> = {
  name: "boundariesClean",
  run: ({ evidence }) =>
    evidence.boundariesClean
      ? pass()
      : fail("boundary violation — leaf touched files outside Allowed Changes"),
};

// Cross-leaf: no sibling leaf writes the same file (merge-conflict prevention).
export const crossLeafNoConflict: Gate<TransitionGateCtx> = {
  name: "crossLeafNoConflict",
  run: ({ leaf, evidence, allLeaves }) => {
    if (!allLeaves) return skip(); // no sibling data → skip
    const myFiles = new Set(evidence.filesChanged); // incoming evidence (pre-commit)
    for (const [id, other] of Object.entries(allLeaves)) {
      if (id === leaf.id) continue;
      const overlap = other.evidence.filesChanged.filter((f) => myFiles.has(f));
      if (overlap.length > 0) {
        return fail(`file conflict with leaf '${id}': ${overlap.join(", ")}`);
      }
    }
    return pass();
  },
};

// filesChanged ⊆ allowedChanges (from .spec Boundaries).
export const filesMatchSpec: Gate<TransitionGateCtx> = {
  name: "filesMatchSpec",
  run: ({ evidence, allowedChanges }) => {
    if (!allowedChanges || allowedChanges.length === 0) return skip();
    const stray = evidence.filesChanged.filter(
      (f) => !allowedChanges.includes(f),
    );
    return stray.length === 0
      ? pass()
      : fail(`files changed outside Allowed Changes: ${stray.join(", ")}`);
  },
};

export const submitGates: Gate<TransitionGateCtx>[] = [
  agentSpecLifecycle,
  tddGuardPassed,
  npmTestAndBuild,
  boundariesClean,
  crossLeafNoConflict,
  filesMatchSpec,
];
