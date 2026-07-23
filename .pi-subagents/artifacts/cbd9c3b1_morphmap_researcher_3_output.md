Done. Analysis written to `/tmp/mech-5why-section5.md`. Progress updated.

**Results summary:**

| Decision | Verdict | Key finding |
|----------|---------|-------------|
| 1. Init-time graph build | Sound with risk | Full parse expensive for large codebases; progressive discovery deferred |
| 2. Tree-sitter parsing | Sound | Right choice for polyglot; parse errors need warning-not-block handling |
| 3. Per-module graph split | Sound with gap | Cross-module caller visibility undefined — callee's agent can't see who calls in |
| 4. Incremental post-leaf updates | Sound with risk | Race condition on parallel commits via `[needs-contract:]` — no locking defined |
| 5. Audit advisory-only | **Gap** | No compulsory trigger for `[qa: strict]` — shipping with known vulnerabilities beats analysis paralysis assumption breaks for security code |

Two architectural decisions needed before Phase C: cross-module dependency visibility (Finding 3) and audit tiering by QA level (Finding 5).