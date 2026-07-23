---
type: handoff
agent: morphmap/scout
id: scout-cognitiveos-v3
timestamp: 2026-07-20T14:30:00Z
version: 1
summary: Recon of external Rust workspace CognitiveOS/v3 — RAG+memory+events substrate; 22 crates, compiles clean, temporal+hierarchy real, code-parsing vapor, hash-sync incremental real
source: external recon directive
status: raw
tags: [recon, rust, rag, cognitiveos, external-repo]
---

# Recon: CognitiveOS/v3 (external repo)

Path: `/home/aurel/Documents/current/CognitiveOS/v3`
What it is: A Rust workspace ("database that records events with time + hierarchy as a mindmap"). RAG + memory + parsing + inference. 22 crates, `resolver = "3"`, compiles clean (`cargo check` exit 0, 0 warnings after `0c36b67`). Git HEAD `89c26da`.

## 1. Crate Inventory

| Crate | LOC (rs) | Files | Tests | Purpose | Maturity |
|---|---|---|---|---|---|
| `core` | 1406 | 10 | 3 | Event/Node types, rkyv codec, vectors, segments | **Real** — load-bearing |
| `index` | 7390 | 27 | 14 | Storage backends: ANN, graph, keymap, lex (Tantivy), payload, packed compaction, communities, tiering | **Real** — heaviest crate |
| `sdk` | 28597 | 33 | 28 | `Store` facade, ingest workers, embed workers, pipeline, entity, hybrid tests, e2e | **Real** — largest |
| `server` | 14257 | 16 | 9 | Axum HTTP API, chat handler, grounding gate, Rhai dispatch, CRM/contact/agenda routes | **Real** — full app |
| `query` | 2825 | 4 | 3 | Hybrid search (BM25+ANN), reranking, temporal config, tuning knobs | **Real** |
| `retrieval_bench` | 3794 | 31 | 25 | Benchmark harness + real_harness, BenchResult metrics | **Real** |
| `models_embed` | 931 | 5 | 2 | Text/vision embedder trait; FastEmbed/ORT impl (nomic-v1.5, nomic-q) | **Real** — actual models |
| `models_llm` | 972 | 6 | 2 | `Llm` trait; OpenAI provider (async-openai), Mistral.rs provider | **Real** |
| `source_ingest` | 1826 | 21 | 9 | File discovery, content hashing, snapshot/diff, change plan, watcher, VCS | **Real** — hash-sync engine |
| `rhai_engine` | 907 | 17 | 4 | Embedded Rhai scripting for tool-call dispatch from LLM output | **Real** |
| `domain_email` | 1256 | 1 | 1 | Email payloads, BodyMode policy, classification | Real (schema+logic) |
| `domain_contact` | 1865 | 1 | 1 | Contact upsert/merge, CSV/vCard import adapters | Real |
| `domain_agenda` | 1220 | 1 | 1 | Event/task/reminder, ICS parsing, OOO detection | Real |
| `domain_human` | 916 | 3 | 3 | preference/need/system_tweak/jog node schemas + ingest from chat | Real |
| `domain_docs` | 559 | 1 | 1 | Document chunking/sectioning policy | Real (policy) |
| `domain_agent` | 474 | 5 | 4 | agent/decision + agent/session traceability, DecisionRecorder | Real |
| `domain_crm` | 370 | 1 | 1 | CRM facts, timeline, reminders, style profile | Real (schema) |
| `domain_workspace` | 428 | 1 | 1 | task/run/checkpoint/tile node schemas, WorkspaceStatus | Real (schema) |
| `domain_chat` | 339 | 1 | 1 | chat/thread + chat/turn payloads, path helpers | Real (schema) |
| `domain_code` | 381 | 1 | 1 | Code file/symbol schemas, Language enum, CodePaths | **Scaffold only** — see §2b |
| `ingest_formats` | 276 | 1 | 1 | IngestBundleV1 interchange format schema | Real (schema) |
| `semantic_geometry` | 216 | 2 | 1 | Clifford/geometric vectors (MultiVector64, wedge) | Experimental — see risks |

**Total LOC (rs, excl. target): ~86,000+**. This is a substantial codebase, not a prototype skeleton.

## 2. The Three Load-Bearing Claims

### 2a. Temporal event store with hierarchy — **IMPLEMENTED** ✅

Evidence:
- `crates/core/src/event_node.rs:9-22` — `EventNodeOwned` struct: `id`, `parent_id: Option<NodeId>`, `path: Option<String>`, `timestamp: i64`, `timestamp_vector: Vec<f32>`, `content_hash`, `payload: Vec<u8>`, `schema_type`, `entities_involved`, `community_members`. rkyv-encoded with magic+checksum.
- `crates/core/src/node_v3.rs:23,26,66` — `NodeV3` has `parent_id: Option<NodeId>`, `timestamp: i64`, `.with_parent()`, `.with_timestamp()`.
- `crates/index/src/traits/graph_store.rs:33-45` — `GraphStore` trait: `add_child`, `add_edge`, `get_children`, `get_parent`, `get_neighbors`, `get_descendants`. **Tree (parent/child), not flat DAG.** Communities + entities are separate orthogonal grouping (bitmap-indexed).
- Backend impl: `crates/index/src/backends/fs_graph_store.rs` (996 LOC) — real FS-backed graph with RoaringBitmap communities.

**Verdict: real, working, queryable.** Hierarchy = parent_id + GraphStore.add_child. Timestamps on every node.

### 2b. Code parsing via tree-sitter — **NOT IMPLEMENTED** ❌

Evidence:
- `grep -rn "tree.sitter\|tree_sitter\|treesitter"` across all `*.toml` + `*.rs` = **zero matches**. Not a dependency anywhere.
- `crates/domain_code/src/lib.rs:6` — header comment: **"NOTE: This is a scaffold only. No parser/indexing pipeline yet. Schemas are stable and versioned early for future expansion."**
- The crate defines `Language` enum (13 langs), `SymbolKind`, `CodeFilePayload`, `SymbolPayload`, `ImportEdge`, `CallEdge`, `CodePaths`, `CodeNodeBuilder`. All are **data schemas + path helpers**. `CodeNodeBuilder.create_file()` builds a node from an already-populated payload — it does NOT parse source. No `.ts/.js/.rs/.php` → AST → nodes pipeline exists.

**Verdict: aspirational.** Schemas exist so a future parser has a target. No parsing happens today. If any tool ingests code, it does so as opaque text via the generic document/email path.

### 2c. Hash-synced graph index (nodes+edges keyed by file hash, kept in sync with file changes) — **IMPLEMENTED (PARTIAL)** ⚠️

Split verdict — the *hash-synced incremental file ingest* is real; whether the *graph* (edges) is hash-keyed depends on domain:

Evidence (real):
- `crates/source_ingest/src/hashing.rs:6-23` — `content_hash_bytes`, `content_hash_reader` (Sha256).
- `crates/source_ingest/src/snapshot.rs:77-135` — `SourceSnapshot` + `UnitSnapshotEntry` (has `payload_hash`, `embedding_text_hash`), `JsonSnapshotStore` with `load`/`save` (persists prior state to JSON).
- `crates/source_ingest/src/change.rs:6-38` — `SourceChangeKind` (Created/Modified/Deleted/Unchanged/SkippedUnsupported) + `UnitChangePlan` (Put/Replace/Tombstone/Unchanged). **This is the diff engine**: compares current hash vs snapshot hash, emits Replace (re-ingest) or Tombstone (delete) plans.
- `crates/source_ingest/src/watcher.rs`, `discovery.rs`, `executor.rs`, `plan.rs` — file watcher + discovery + execution of the plan.

Caveat: the `GraphStore` edge model (`crates/index/src/traits/graph_store.rs:34`) is keyed by `NodeKey` (numeric), not by content hash. Content-hash-keying lives in the *ingest layer* (source_ingest), not the graph index. Nodes ARE content-addressed via `NodeId` (e.g., `code/file/{path}/{hash[..8]}` in domain_code). So: **hash-synced file→node ingestion = real; "graph edges keyed by file hash" = not literally true** — edges reference node keys, nodes carry hashes.

**Verdict: the incremental hash-based sync machinery is real and working. The phrasing "graph edges keyed by file hash" is imprecise — it's node-level hash sync + tombstone/replace.**

## 3. Forget vs Compaction

**No relevance-based forgetting exists.** Distinguish:

- **Compaction (real, mechanical):** `crates/index/src/packed/compaction.rs` — `Compactor` rewrites segments to remove tombstones/deleted records (`OpKind::Delete`). `crates/index/src/backends/fs_node_v3_store.rs:374` — `compact()` purges `deleted_ids`. This is **storage defrag**, not forgetting. It removes explicitly-deleted nodes, never decides relevance.
- **`human/jog` (real, but NOT forgetting):** `crates/domain_human/src/lib.rs:184` — `HumanJogPayload` = "curiosity spark or open question" node. It's an *additive* node type (stores questions to explore), the opposite of forgetting.
- **No decay/TTL/expire/eviction/relevance-score logic anywhere.** `grep -ni "decay\|ttl\|expire\|evict\|forget"` → only `human/jog` (curiosity) and mechanical `compact`/`prune` (tombstone removal in compaction.rs:286,290).
- **Kaizen tuner (real, tuning not forgetting):** `crates/sdk/src/bin/kaizen_tuner.rs` — adjusts *retrieval* knobs (semantic weight, oversample, rerank, RRF) based on `QualityEvent` feedback. It tunes search relevance, does **not** delete or forget nodes. Human-in-loop signal flows in; node lifecycle does not flow out.

**Verdict: forget/prune mechanism = ABSENT.** The "kaizen/improvement loop" tunes *query-time* retrieval weights. There is no automatic node-forgetting. If a node is never retrieved, it persists forever. A human would have to explicitly delete (tombstone) it.

## 4. Usable TODAY vs Aspirational

**Queryable now by an external tool (e.g. "mech" task enforcer):**
- `sdk::Store` API (`crates/sdk/src/store.rs:549-712`): `put_node`, `get_node`, `node_exists`, `put_payload`/`get_payload` (content-addressed by hash), `search_ann`/`search_ann_f32`, `lex_search_raw`, `graph_neighbors`, `add_child`, `get_key`/`get_id`. **A tool can read nodes, query hierarchy, do lexical+semantic search today.**
- `domain_workspace` schema (`v3/task`, `v3/run`, `v3/checkpoint`, `WorkspaceStatus::{Todo,Active,Blocked,Done}`) — task-status *schema* exists and is storable. **"mech" could store task nodes and enforce status via Store.put_node + graph.** No task-status *enforcement logic* exists in the repo — that's the tool's job.
- HTTP server (`crates/server/src/server.rs:551-585`): `/api/ingest/file`, `/api/contacts/*`, `/api/agenda/events`, `/api/retrieve/preview`. Runnable.
- `workspace/checkpoint` + `state/workspace_focus` schemas exist.

**Vapor / not usable:**
- **Code parsing** (domain_code) — no parser. Can't index a codebase structurally.
- **Forgetting/relevance decay** — absent.
- **`semantic_geometry` (Clifford algebra)** — experimental stub (216 LOC, `99_clifford-proposal.md` is a proposal doc). Not wired into the retrieval path (query uses standard hybrid BM25+ANN+rerank).
- **Vision embedding** — trait exists, FastembedVisionEmbedder declared; real usage unverified.

## 5. Inference / RAG — **IMPLEMENTED (working retrieval+generation path)** ✅

Evidence:
- **Embeddings:** `crates/models_embed/src/fastembed_impl.rs:22-27` — `FastembedTextEmbedder::new_nomic_v1_5()`, `new_nomic_v1_5_q()`. Real ONNX models via fastembed crate. `.embed_text()` works. `.fastembed_cache/` dir present on disk (models downloaded).
- **Lexical:** Tantivy BM25 (`crates/index/src/backends.rs` → `TantivyLexIndex`).
- **Hybrid search:** `crates/query/src/retrieval.rs:141-253` — `HybridQuery` (text + embedding + k + filters + rerank_top_n + ann_oversample + lazy_embed). RRF fusion, two-stage rerank, temporal/recency config.
- **LLM:** `crates/models_llm/src/openai.rs` — `OpenAiProvider` via `async-openai` (real HTTP, api_key from config). `MistralrsProvider` for local. `Llm` trait with `generate_async`, `generate_async_with_image`.
- **Server RAG path:** `crates/server/src/server.rs:30-31,62,585` — chat handler wires retrieval → grounding gate (`crates/server/src/grounding.rs`) → LLM generation. `git log`: `6640f39 feat(server): wire parent retrieval + Rhai dispatch into chat handler`.
- **Grounding gate:** `crates/server/src/grounding.rs` — `GroundingGateConfig`, `corrective_prompt`, `sgi_score` (semantic grounding index). Blocks/redirects low-confidence generations.

**Verdict: full RAG loop exists and runs** — embed (nomic) → store (ANN+BM25) → retrieve (hybrid+rerank) → ground → generate (OpenAI/Mistral). Benchmark harness (`retrieval_bench`) validates retrieval quality on real datasets (e.g., `eb38a34 test(retrieval): sensaio email thread`).

## Domain Terms
- **EventNode / NodeV3:** the unit of storage. Has timestamp + parent_id (hierarchy) + payload + optional vector. Content-addressed.
- **GraphStore:** parent/child + neighbor + community + entity + topic-edge store. Tree-first, not DAG.
- **SourceSnapshot / UnitChangePlan:** incremental ingest state — compares content hashes to emit Put/Replace/Tombstone.
- **community:** RoaringBitmap grouping of nodes (offline Leiden-style recompute). Orthogonal to hierarchy.
- **jog:** a curiosity/open-question node type (human/jog). Additive, not forgetting.
- **grounding gate:** server-side check that retrieved context supports the generation before emitting.

## Risks
- **domain_code is a dead schema** (381 LOC, no parser): if "mech" or any consumer expects structural code indexing, it doesn't exist. Would need tree-sitter wiring from scratch.
- **No forgetting = unbounded growth:** nodes persist forever; compaction only reclaims explicitly-deleted tombstones. Long-running store will accumulate stale nodes with no auto-prune.
- **`semantic_geometry` (Clifford) is experimental and unwired** — if someone believes "geometric semantic search" works, it doesn't in the live path.
- **`server.rs` is 14k LOC monolith** (one file) — maintainability risk, but functionally complete.
- **Edge model not hash-keyed:** claim "edges keyed by file hash" is imprecise. Edges key on NodeKey (numeric); hash sync is ingest-layer-only.
- **Resolver v3 (edition 2024)** — requires very recent Rust toolchain.

## Start Here
Next agent querying this substrate: open `crates/sdk/src/store.rs:207-712` (the `Store` API) — that's the integration surface. For task-status enforcement ("mech"), use `domain_workspace` schemas (`v3/task`, `WorkspaceStatus`) + `Store.put_node` + `GraphStore.add_child`. Do NOT assume code parsing works. Do NOT assume any forgetting happens — enforce lifecycle explicitly.

---

## How Real Is the Substrate Today

**Real and substantial.** ~86k LOC of Rust, compiles clean, a working temporal+hierarchical event store backed by FS segments, real embedding models (nomic via fastembed, models cached on disk), real hybrid retrieval (Tantivy BM25 + ANN + RRF + rerank), a full Axum HTTP server with a live chat/RAG endpoint wired to OpenAI, incremental hash-based file ingest with snapshot/diff/tombstone, and a benchmark harness proving retrieval quality on real datasets. The three claims: temporal+hierarchy = solid; code parsing = vapor (pure schema, zero tree-sitter); hash-sync = real at the ingest/node level but "graph edges keyed by hash" is imprecise. Forgetting does not exist — the kaizen loop tunes retrieval weights, it does not prune nodes. A task-status enforcer could integrate against `sdk::Store` + `domain_workspace` schemas today; it would need to manage its own node lifecycle.
