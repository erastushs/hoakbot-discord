# ADR-012 — Configuration

## Status
Accepted for the 4.0.0 implementation plan. Supersedes legacy ADR-002 Settings Metadata, ADR-003 Configuration Provider, ADR-006 Database Configuration, and configuration portions of ADR-010 Configuration Lifecycle.

## Context
Plugins need owned, validated configuration and runtime value updates while 3.2.3 consumers depend on existing keys, tables, cache/database/default fallback, audit, and guild isolation.

## Decision
Plugin metadata declares namespaced setting ownership and validation schemas. Existing keys and tables remain authoritative compatibility contracts. Reads retain cache -> database -> manifest default behavior; writes remain authorized, guild-scoped, transactional, audited, cache-invalidating, and event-driven. Validation occurs at every external boundary.

Configuration hot reload updates values, not source code. After commit, changes are delivered in deterministic per-plugin/guild order, may be coalesced without losing final state, and report timeout/failure through health diagnostics. A callback failure does not undo committed data; bounded retry or operator reconciliation applies it. Plugin migrations are namespaced, ordered, immutable, and checksum verified. Disable retains data; purge is explicit and audited. Secrets never appear in manifests, logs, or metadata APIs. Exact callback/type signatures are implementation-reviewed under ADR-011.

## Consequences
Configuration remains backward compatible, attributable, and reloadable without process restart. Adapters and legacy names persist through 4.0; strict ownership may reveal collisions; committed value and runtime application can temporarily diverge after callback failure and therefore require degraded health/reconciliation.

## Alternatives Considered
Rename module storage immediately: rejected as breaking. Give plugins raw database/config access: rejected for isolation and audit. Roll back committed data when a callback fails: rejected because callbacks are external side effects and distributed rollback is unreliable. Hot reload plugin code: rejected as unsafe and out of scope. Delete data on uninstall: rejected for rollback safety.

## Related ADRs
ADR-011 Plugin System, ADR-013 Dashboard. Legacy ADR-002, ADR-003, ADR-006, and ADR-010 are archived under `docs/archive/legacy-architecture/adr/`.
