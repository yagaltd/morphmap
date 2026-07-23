/**
 * morphmap-tools-pi.ts — pi.registerTool wrappers + TypeBox schemas.
 *
 * Impure pi-wiring layer. NOT bun-testable from the project (typebox +
 * @earendil-works/* resolve only inside the pi runtime) — verified on `pi`
 * reload. Pattern: examples/extensions/todo.ts.
 *
 * The orchestration it calls (applyX in morphmap-tools.ts) IS bun-tested.
 *
 * Spec: docs/mech-mindmap.md §2.5.
 */
import { Type, type Static } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { applyApproveLeaf, applyIntegrationGate, applySubmitLeaf } from "./morphmap-tools";

const STATE_PATH = ".morphmap/state.json";

// ── TypeBox parameter schemas (mirror morphmap-tools input interfaces) ───────
const SubmitLeafParams = Type.Object({
  leafId: Type.String({ description: "leaf path, e.g. 'auth/jwt-refresh'" }),
  evidence: Type.Optional(
    Type.Object({
      agentSpecPassed: Type.Optional(Type.Boolean()),
      tddGuardPassed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      npmTestPassed: Type.Optional(Type.Boolean()),
      npmBuildPassed: Type.Optional(Type.Boolean()),
      boundariesClean: Type.Optional(Type.Boolean()),
      filesChanged: Type.Optional(Type.Array(Type.String())),
      testsRun: Type.Optional(Type.Array(Type.String())),
    }),
  ),
  allowedChanges: Type.Optional(Type.Array(Type.String())),
});

const ApproveLeafParams = Type.Object({
  leafId: Type.String(),
  reviewFile: Type.Optional(Type.String()),
  evidence: Type.Optional(
    Type.Object({
      qualityReviewExists: Type.Optional(Type.Boolean()),
      qualityReviewP0Count: Type.Optional(Type.Number()),
      qualityReviewP1Count: Type.Optional(Type.Number()),
      healthCheckPassed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      bombadilPassed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
      lonkeroPassed: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
    }),
  ),
});

const IntegrationGateParams = Type.Object({
  reviewFile: Type.Optional(Type.String()),
});

/**
 * Register the three transition tools (§2.5). Agents MUST call these to
 * advance leaf/branch status — the gate enforcement point.
 */
export function registerMechTools(pi: ExtensionAPI, statePath: string = STATE_PATH): void {
  pi.registerTool({
    name: "morphmap_submit_leaf",
    label: "MorphMap: submit leaf",
    description:
      "Submit a leaf for review (in_progress→submitted). Runs submitGates: agent-spec lifecycle, tdd-guard, npm test+build, boundaries, cross-leaf conflict, files-match-spec. No gate pass → no transition. Call when a leaf worker finishes.",
    parameters: SubmitLeafParams,
    promptSnippet: "morphmap_submit_leaf({ leafId, evidence, allowedChanges })",
    async execute(_toolCallId, params: Static<typeof SubmitLeafParams>) {
      const r = await applySubmitLeaf(statePath, params);
      return { content: [{ type: "text" as const, text: r.summary }], details: r };
    },
  });

  pi.registerTool({
    name: "morphmap_approve_leaf",
    label: "MorphMap: approve leaf",
    description:
      "Approve a reviewed leaf (in_review→done). Runs reviewGates: quality review exists, P0=0, P1=0 (qa:full+), health/bombadil/lonkero, runtime deps met. Marks leaf done only if all pass.",
    parameters: ApproveLeafParams,
    promptSnippet: "morphmap_approve_leaf({ leafId, reviewFile, evidence })",
    async execute(_toolCallId, params: Static<typeof ApproveLeafParams>) {
      const r = await applyApproveLeaf(statePath, params);
      return { content: [{ type: "text" as const, text: r.summary }], details: r };
    },
  });

  pi.registerTool({
    name: "morphmap_integration_gate",
    label: "MorphMap: integration gate",
    description:
      "Run integration gates for a branch (all leaves done/abandoned, cross-leaf conflicts resolved, integration review + health check). On pass, marks branch done.",
    parameters: IntegrationGateParams,
    promptSnippet: "morphmap_integration_gate({ reviewFile })",
    async execute(_toolCallId, params: Static<typeof IntegrationGateParams>) {
      const r = await applyIntegrationGate(statePath, params);
      return { content: [{ type: "text" as const, text: r.summary }], details: r };
    },
  });
}
