# Phase 02 — Plugin Core

## Status
Complete. Evidence: plugin-core contract tests, generated built-in catalog and compatibility projection tests, bootstrap flag rollback, and the mandated Build → Typecheck → Tests → Lint pipeline.

## Goal
Implement the core plugin platform behind a reversible runtime flag while preserving all module-facing behavior.

## Background
The repository has module manifests, a generated index, loader, registry, dependency graph, and lifecycle. V4 must formalize these without assuming implementation interfaces beyond ADR-011.

## Scope
Explicitly implement **Plugin Manifest, Loader, Registry, Context, Metadata, and Lifecycle**, plus validation, dependency resolution, collision detection, compatibility adapters, diagnostics, and bootstrap selection.

## Out of Scope
Built-in migration, external marketplace/package installation, dashboard conversion, command/event helper APIs, and SDK publication.

## Requirements
Plugin Manifest is static, side-effect free, Zod validated, versioned, and declares identity/dependencies/capabilities. Loader validates the whole catalog before factory execution. Registry publishes immutable atomic snapshots and rejects duplicate IDs/capabilities. Context exposes only approved logger/config/event/command/API/health capabilities, scoped to owner and guild where applicable. Metadata is serializable and secret-free. Lifecycle is deterministic, timeout/abort aware, dependency-first on start and reverse-order on stop, with cleanup after partial failure.

## Technical Design
During implementation, inventory current module contracts and write behavioral contract tests first. Define candidate types from ADR-011, then approve exact names/signatures in code review. Pipeline: generated built-in catalog -> manifest/schema validation -> dependency/range/cycle validation -> global collision validation -> factory creation -> staged registration -> atomic registry commit -> lifecycle start -> readiness. Required failures abort readiness; optional-failure policy must be explicit. Legacy module registry/loader views adapt plugin snapshots. A single feature flag selects old or new bootstrap path.

## Folder Changes
Expected additions: a plugin-core area adjacent to `src/modules` for manifest schema/types, loader, registry, context capability adapters, metadata serializer, lifecycle coordinator, and errors; generated built-in catalog near current `module-index`; compatibility adapters beside current module contracts; focused unit/integration tests beside repository conventions. Exact filenames are implementation decisions, not pre-approved API.

## Acceptance Criteria
Invalid manifests execute no factory; catalog permutations produce identical order; missing/range/cycle errors identify paths; all collision classes fail before commit; registry readers never observe partial state; Context cannot obtain undeclared secrets/container access; hook order, timeout, abort, cleanup, and reverse shutdown pass; module projections match 3.2.3; disabling the flag restores old bootstrap.

## Deliverables
Approved core contracts, schemas, Loader, Registry, Context, Metadata serializer, Lifecycle coordinator, catalog generation, compatibility layer, feature flag, diagnostics, and tests.

## Testing
Malformed/side-effect manifest fixtures; dependency property/permutation tests; collision matrix for IDs/settings/commands/events/routes/permissions; registry atomicity/concurrency tests; context capability denial and redaction tests; lifecycle trace/failure/timeout/abort/repeated-stop tests; bootstrap parity. Run all repository quality commands.

## Rollback Plan
Disable the plugin-core bootstrap flag and restore the existing module loader/index. Keep adapters unused, remove no persistent data, verify module enumeration/startup/shutdown and all 3.2.3 snapshots.

## Notes
External JavaScript remains administrator-trusted code, not a security sandbox. ADR-011 is authoritative where details conflict.
