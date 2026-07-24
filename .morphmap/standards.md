# Coding Standards for MorphMap Agents

type: standards
version: 0.1
timestamp: 2026-07-24
audience: branch-agent, leaf-worker, reviewer
purpose: Minimal guardrails for implementation quality. Not a style guide.

---

## 1. Highest impact first

Build the feature that delivers the most value with the least work.
If it works, add adjacent features. If it doesn't, pivot before sinking time.

```
HIGH impact + LOW effort → DO FIRST
HIGH impact + HIGH effort → SPLIT into smaller leaves
LOW impact + anything → DEFER (or drop)
```

This is the leaf-pulling order. The branch-agent already orders leaves by risk-priority.
Reinforce: stop adding features once the core works. Optimize later.

## 2. One feature → make it work → review → optimize

Three-pass loop per leaf:

1. **Make it work** — passing tests, correct behavior, no edge-case handling
2. **Review** — submit_leaf → reviewer verifies correctness
3. **Optimize** — only after review passes. Then: deduplicate, simplify, add edge cases

Never optimize before the reviewer sees it. Premature optimization is the #1 source of rework.

## 3. Modular architecture

One concern per file. One responsibility per function.

- If a file exceeds 200 lines, split it.
- If a function has more than 3 arguments, refactor to an options object.
- If two modules share logic, extract a shared utility — never copy-paste.

The reviewer enforces this mechanically (specEstLOC gate warns at >200 lines).

## 4. No premature abstraction

Do not extract a "generic framework" before at least 3 concrete use cases exist.
The first implementation is concrete. The second is concrete. The third reveals the pattern → then abstract.

Violation: "I'll make a generic plugin system so we can add any auth provider."
Correct: "Implement JWT auth. If we need OAuth later, extract the common interface then."

## 5. Self-verify before submit_leaf

Before calling submit_leaf, the leaf worker must:

- Run `bun test` (or project equivalent) — all tests pass
- Run type-check (`tsc --noEmit` or equivalent) — clean
- Re-read the .spec boundaries — no files changed outside Allowed Changes
- Re-read the .spec acceptance criteria — every scenario satisfied

The submit gates enforce this mechanically. Self-verifying avoids round-trips.

## 6. Prefer minimal, steal one idea, defer the rest

When adapting external patterns (ARIA, another framework, a research paper):

- Extract the ONE idea that solves your immediate problem
- Implement the minimum version of it
- Defer the full system until you have 2+ concrete use cases

Violation: "Let's implement ARIA's full 7-artifact content-addressed verification chain."
Correct: "ARIA's outcome→evidence mapping solves our weak submit_leaf evidence. Let's add just that."

This rule applies to the orchestrator too — when scouting external codebases for ideas.

---

## Domain-specific variants

For non-coding projects, replace this file with a domain-specific version.
The AGENTS.md link stays the same; only the content changes.

| Project type | Standards file |
|-------------|---------------|
| Software (default) | `.morphmap/standards.md` |
| Marketing | `.morphmap/standards-marketing.md` |
| Design | `.morphmap/standards-design.md` |
| Security audit | `.morphmap/standards-security.md` |

To switch: rename or symlink the appropriate file to `.morphmap/standards.md`.
AGENTS.md references `./.morphmap/standards.md` — no other file changes needed.
