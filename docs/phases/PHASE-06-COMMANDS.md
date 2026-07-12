# Phase 06 — Commands

## Goal
Introduce a typed `defineCommand()` authoring helper and deterministic automatic discovery for one canonical command registry.

## Background
Runtime routing, Help, listing, and deployment can drift when they index command files independently. ADR-014 requires static discovery and centralized deployment.

## Scope
Explicit **`defineCommand()`, auto discovery, permission metadata, and autocomplete**; descriptor validation, generated catalog, handler binding, collision checks, Help/list/deploy projections, and drift detection.

## Out of Scope
Automatic Discord deployment at startup, recursive runtime filesystem scanning, command UX redesign, or replacing existing permission enforcement.

## Requirements
`defineCommand()` must preserve TypeScript inference while producing serializable metadata plus handler references; its exact signature is approved during implementation against ADR-014. Auto discovery is build-time generation from approved built-in locations/package manifests, deterministic and side-effect controlled. Permission metadata names an existing action/default visibility and drives Help filtering plus runtime checks. Autocomplete declares option ownership, receives the same auth/guild context, respects Discord limits/timeouts, and fails safely. Existing names/options/scopes remain stable.

## Technical Design
Inventory existing command shapes and derive a candidate descriptor schema. Generator emits sorted explicit imports and a catalog hash; CI fails stale generated output. Validation checks Discord constraints, duplicate names/aliases, option uniqueness, permission actions, deployment scope, and autocomplete bindings before Discord connection. Registry atomically binds execute/autocomplete handlers. Router, Help, `list:commands`, and `deploy:commands` consume immutable projections of that registry; deployment remains explicit.

## Folder Changes
Expected changes: command contract/helper near public plugin contracts; generator under existing scripts/tooling conventions; generated catalog near current command/module index; command registry/router; Help indexer; deploy/list scripts; built-in command declarations and tests. Do not hand-edit generated output.

## Acceptance Criteria
Every built-in uses or adapts to `defineCommand()`; adding an approved command and regenerating makes it available to router/Help/list/deploy automatically; stale catalogs fail CI; collisions/invalid permissions/autocomplete bindings fail startup; runtime and Help enforce identical visibility; autocomplete is authorized, bounded, and returns valid choices; 3.2.3 command payload snapshots match.

## Deliverables
Approved helper contract, descriptor schema, generator/catalog/hash, registry, router/Help/script integrations, permission/autocomplete metadata support, migration adapters, and tests.

## Testing
Compile-time inference tests, generator determinism/staleness, malformed/collision fixtures, payload snapshots, permission matrix, Help visibility, execute routing, autocomplete auth/timeout/result limits, deploy/list dry-run mocks, and all quality commands.

## Rollback Plan
Switch router/Help/scripts to their prior indexes and retain old command declarations through adapters. Do not delete Discord commands; redeploy the last known compatible snapshot only if publication occurred.

## Notes
“Auto discovery” means deterministic build/package catalog generation, not arbitrary runtime scanning. ADR-014 governs.
