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

## Notes
Voice and Shrine require explicit native/audio/network/scheduler cleanup tests. Inventory Welcome before migration and preserve observed behavior.
