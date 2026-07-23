Analysis complete. 189 lines, 19KB written.

---

## Findings Summary

All four design decisions converge on one root: **MorphShell trust failure → pure/impure split.** Flat state, file-level graph, path-based trace, and manual improvement are not independent — they're consequences of making every gate a `(leaf) => { pass, reason }` pure function testable in CI.

Key gap: **trace field (§6.3) and morphmap-improve (SKILL.md) don't connect.** Trace enables per-feature artifact queries, but the improvement loop uses git log, decisions log, and keyword search — never the trace field. Either integrate them or clarify trace is human-debugging-only.

---