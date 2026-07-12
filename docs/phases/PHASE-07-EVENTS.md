# Phase 07 — Events

## Goal
Introduce typed `defineEvent()` declarations and lifecycle-safe automatic event registration with explicit priority and dependency behavior.

## Background
Built-ins currently register event handlers through module code. Plugin ownership needs deterministic registration, ordering, validation, and cleanup.

## Scope
Explicit **`defineEvent()`, auto registration, priority, and dependencies**; event descriptor/payload typing, publication/subscription ownership, generated catalog integration, compatibility aliases, error policy, and diagnostics.

## Out of Scope
External brokers, event sourcing, cross-process delivery, polling, and implicit arbitrary-directory scanning.

## Requirements
`defineEvent()` describes event name/source, handler, payload validation, priority, and plugin/service dependencies; exact signature remains implementation-reviewed. Names are namespaced and core events remain core-owned. Auto registration occurs from validated plugin metadata during lifecycle registration and auto unregistration during stop. Priority has a documented stable ordering and tie-breaker. Dependencies must be present/started before handler activation. Payloads/logs contain no secrets; failure isolation is explicit.

## Technical Design
Inventory current event sources/subscriptions and legacy aliases. Validate descriptors after plugin graph resolution. Registration coordinator sorts by dependency order, then numeric priority, then deterministic plugin/descriptor key; no code may rely on incidental filesystem order. Bind Discord gateway and internal bus sources through adapters, record unsubscribe cleanup, and prevent dispatch to non-started/stopping plugins. Validate payloads at trust boundaries; handler errors are logged/metriced and follow an explicit continue/stop policy per event class.

## Folder Changes
Expected changes: event helper/schema near plugin contracts; event registry/coordinator beside current event bus; generated declarations where required; adapters for Discord/internal sources; built-in event declarations/types; compatibility aliases and tests. Existing public event names remain unless aliased.

## Acceptance Criteria
Every existing handler has owner/source/dependencies/priority; valid descriptors auto-register on start and unregister on stop; missing dependencies and duplicate invalid ownership fail pre-start; ordering is stable across catalog permutations; stopped plugins receive no events; aliases preserve 3.2.3 behavior; handler failure policy and payload validation are observable.

## Deliverables
Approved helper contract, schemas, event registry/coordinator, lifecycle integration, priority/dependency rules, aliases, migrated declarations, diagnostics, and tests.

## Testing
Compile-time payload tests; descriptor validation; permutation/order/priority ties; missing/not-started dependencies; automatic registration/unregistration and leak tests; Discord/internal/config event integrations; malformed payloads; handler failures/timeouts; alias parity; all quality commands.

## Rollback Plan
Disable declarative event registration and restore existing module registration via adapters. Remove newly bound subscriptions before activating old paths to prevent duplicate delivery; verify subscription counts and baseline events.

## Notes
Priority is for deterministic handling, not concurrency guarantees. Dependencies refer to declared plugin/service capabilities, not private implementation imports.
