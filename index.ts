/**
 * MorphMap — pi extension entry point.
 *
 * Installed via: pi install github:yagaltd/morphmap
 * Hook file: .pi/extensions/morphmap-hooks.ts
 *
 * The hooks file handles:
 *   - Spec guard (pre-tool: block leaf-worker without .spec)
 *   - Model enforcement (pre-tool: block weak model on blocking leaves)
 *   - Auto-render + CHANGELOG + state.json sync (post-tool: on map edit)
 *   - Telemetry (post-tool: token/cost delta on morphmap agent completions)
 *   - Compiler hook (post-tool: extract evidence from leaf-worker JSONL)
 *   - Failure recovery + improve trigger (post-tool: pattern matching)
 *   - Intercom audit (pre-tool: ensure leaf completions are signaled)
 *   - ADR verification (post-tool: check referenced ADR files exist)
 */
export { default } from "./.pi/extensions/morphmap-hooks";
