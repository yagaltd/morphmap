---
type: skill
name: morphmap-grill
description: Typed ambiguity resolution — runs system grill-for-unknowns and outputs structured grill-questions.json
---

# Grill Session with Typed Ambiguity Records

Enhances the system `grill-for-unknowns` skill with ARIA-inspired typed ambiguity records.
After every grill session, write findings as structured JSON so they are auditable, re-discoverable,
and mechanically checkable (unresolved = block).

## Workflow

### Phase 1: Run system grill

Spawn the system `grill-for-unknowns` skill with the .spec file and implementation plan.
This produces the natural-language grill output identifying unknowns, assumptions, and risks.

### Phase 2: Extract typed records

From the grill output, extract every ambiguity into a typed record. Write to
`.morphmap/grill-questions.json`:

```json
{
  "schema": "morphmap.grill-questions/0.1",
  "sessionId": "<uuid or timestamp>",
  "specRef": "<path to .spec file>",
  "generatedAt": "<ISO-8601>",
  "questions": [
    {
      "id": "<kebab-case-id>",
      "question": "<the ambiguity, as a direct question>",
      "severity": "material | minor | clarification",
      "discoveredBy": "agent:branch-agent | agent:critic | human:operator",
      "resolution": null,
      "resolvedBy": null,
      "resolvedAt": null
    }
  ]
}
```

**Severity levels:**
- `material` — blocks implementation; must be resolved before leaf worker starts
- `minor` — does not block but should be tracked; resolution recommended
- `clarification` — non-blocking; nice-to-have clarity

### Phase 3: Human resolution

Present `grill-questions.json` to the human operator. For each unresolved question,
the human sets `resolution`, `resolvedBy`, `resolvedAt`.

After resolution, the orchestrator checks: all `material` questions resolved?
If any remain → **block leaf worker spawn** (pre-spawn gate: `ambiguitiesResolved`).

### Phase 4: Commit

Check `grill-questions.json` into the repository alongside the .spec file.
Git history provides the audit trail of when ambiguities were discovered and resolved.

## Integration with mech gates

The pre-spawn gate `ambiguitiesResolved` (in `gates/pre-spawn.ts`) reads
`.morphmap/grill-questions.json` and blocks leaf worker spawn if any
`material` severity question has `resolution: null`.

Gate rule:
```
if exists(.morphmap/grill-questions.json):
  unresolved = questions.filter(q => q.severity == "material" && q.resolution == null)
  if unresolved.length > 0 → BLOCK "unresolved material ambiguities: <ids>"
```

## Example

After grilling a "JWT refresh endpoint" spec:

```json
{
  "schema": "morphmap.grill-questions/0.1",
  "sessionId": "2026-07-24-grill-jwt-refresh",
  "specRef": ".morphmap/specs/auth/jwt-refresh.spec.md",
  "generatedAt": "2026-07-24T15:00:00Z",
  "questions": [
    {
      "id": "error-format",
      "question": "Should refresh errors follow RFC 7807 Problem Details or project convention?",
      "severity": "material",
      "discoveredBy": "agent:branch-agent",
      "resolution": null,
      "resolvedBy": null,
      "resolvedAt": null
    },
    {
      "id": "token-storage",
      "question": "Store refresh token in httpOnly cookie or Authorization header?",
      "severity": "material",
      "discoveredBy": "agent:critic",
      "resolution": null,
      "resolvedBy": null,
      "resolvedAt": null
    },
    {
      "id": "rate-limit-strategy",
      "question": "Should rate limiting be per-IP or per-user?",
      "severity": "minor",
      "discoveredBy": "agent:critic",
      "resolution": null,
      "resolvedBy": null,
      "resolvedAt": null
    }
  ]
}
```

After human resolution:
```json
    {
      "id": "error-format",
      "resolution": "RFC 7807 Problem Details",
      "resolvedBy": "human:operator",
      "resolvedAt": "2026-07-24T15:30:00Z"
    }
```
