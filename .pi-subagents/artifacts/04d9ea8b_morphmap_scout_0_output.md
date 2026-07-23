Report written. Summary of findings:

**Crate inventory:** 22 crates, ~86k LOC, compiles clean (exit 0). Heavy real code in `sdk` (28k), `server` (14k), `index` (7k). `domain_code` = 381 LOC pure schema.

**Three claims verdict:**
- **2a Temporal+hierarchy: IMPLEMENTED** — `EventNodeOwned` has `parent_id` + `timestamp` (`core/src/event_node.rs:9-22`); `GraphStore` trait has `add_child`/`get_parent`/`get_descendants` (`index/src/traits/graph_store.rs:33-45`). Tree, not flat DAG.
- **2b Tree-sitter code parsing: NOT IMPLEMENTED** — zero tree-sitter references anywhere in manifests or code. `domain_code/src/lib.rs:6` self-documents: "scaffold only. No parser/indexing pipeline yet." Schema only.
- **2c Hash-sync: PARTIAL** — incremental hash-based file ingest is real (`source_ingest/src/{hashing,snapshot,change}.rs`, Put/Replace/Tombstone diff). But "edges keyed by file hash" imprecise — edges use numeric `NodeKey`; hash-sync is ingest-layer/node-level only.

**Forget mechanism: ABSENT.** Compaction = tombstone defrag, not relevance pruning. `human/jog` = curiosity node (additive). Kaizen tuner (`sdk/src/bin/kaizen_tuner.rs`) adjusts retrieval weights from quality feedback — does not delete nodes.

**Usable now:** `sdk::Store` API (`store.rs:549-712`) + `domain_workspace` task schemas. An enforcer can store/query task nodes today. Code indexing and forgetting are vapor.