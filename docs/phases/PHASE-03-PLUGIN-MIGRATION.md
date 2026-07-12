# Phase 03 — Plugin Migration

## Goal
Migrate all built-in modules to plugin contracts without user-visible behavior changes.

## Background
Built-ins already own manifests, settings, commands, events, and services. Sequential migration limits risk.

## Scope
Plugin wrappers/entrypoints, capability registration, compatibility exports, parity fixtures, and per-plugin cutover.

## Out of Scope
Renaming IDs/tables/routes, command redesign, dashboard-specific pages, external plugins, and destructive migrations.

## Requirements
Migration order is exactly **General -> Logging -> Welcome -> Goodbye -> Voice -> Moderation -> Shrine**. Finish and verify each before the next. Preserve IDs, settings/defaults, commands/options, permissions, events/aliases, APIs, and behavior.

## Technical Design
Create one plugin factory per built-in, transfer registration ownership to the plugin registry, retain module adapters, prevent dual handler ownership, and cut over with independent flags and parity telemetry.

## Folder Changes
Built-ins may remain under `src/modules`; add entrypoints/adapters following current style. Physical renaming is not required for 4.0.

## Acceptance Criteria
All seven migrate in exact order; snapshots match; no duplicate handlers/subscriptions; startup/shutdown is clean; API/dashboard module projections remain complete.

## Deliverables
Seven plugin entrypoints, adapters, migration flags, parity fixtures, regression tests, and migration record.

## Testing
Per plugin: metadata snapshots, registrations, commands, events, config reload, service behavior, resource cleanup, then full suite before proceeding.

## Rollback Plan
Disable the newest plugin flag and restore its module path; roll back in reverse order without changing persisted data.

## Migration Record

Completed 2026-07-12 in the required order: General -> Logging -> Welcome -> Goodbye -> Voice -> Moderation -> Shrine. Each built-in has a plugin factory, compatibility module adapter, independent disabled-by-default migration flag, and parity projection preserving manifest IDs, settings/defaults, commands/options, permissions, events/aliases, routes, dashboard metadata, and service behavior.

Evidence:
- `tests/unit/built-in-plugin-catalog.test.ts` verifies exact migration order, complete API/dashboard projections, independent reverse rollback, incompatibility diagnostics, and single reverse-order lifecycle cleanup.
- Per-plugin migration suites for General, Logging, Welcome, Goodbye, Voice, Moderation, and Shrine verify metadata parity, ownership, idempotent startup/shutdown, registration cleanup, service behavior, and rollback without dual subscriptions.
- Voice migration coverage verifies audio/native cleanup; Shrine migration coverage verifies network/scheduler cleanup; Welcome migration coverage records the legacy behavior inventory.
- Final pipeline on 2026-07-12 passed in exact order: `npm run build`; `npm run typecheck`; `npm test` (80 files/640 tests plus dashboard 7 files/28 tests); `npm run lint`.

## Notes
Voice and Shrine require explicit native/audio/network/scheduler cleanup tests. Inventory Welcome before migration and preserve observed behavior.
