# Phase 05 — Config

## Goal
Provide validated plugin configuration with safe runtime hot reload while preserving 3.2.3 storage and security behavior.

## Background
Existing configuration already supports metadata, cache/database/default reads, audited writes, and change events. Plugins require explicit ownership and lifecycle delivery.

## Scope
Explicit **plugin config, validation, and hot reload**; setting ownership/namespaces, compatibility mappings, defaults, migration metadata, config-change batching, failure handling, and disable/uninstall policy.

## Out of Scope
Hot reloading plugin code, renaming existing keys/tables, destructive uninstall, arbitrary plugin SQL, or exposing secrets as metadata.

## Requirements
Each key has one plugin owner and Zod-compatible schema. Existing keys/tables/default behavior remain readable. Validate at file/env/API/database boundaries. Writes remain authorized, guild-scoped, transactional, audited, and cache-invalidating. Hot reload means configuration values only: serialize delivery per plugin, coalesce bursts while retaining final values, provide old/new values and scope, and define retry/failure health without restarting code.

## Technical Design
Inventory existing settings and assign owners before enforcing uniqueness. Registry resolves effective values cache -> database -> manifest default and exposes legacy module projections. On committed write: audit -> invalidate cache -> publish change -> queue affected plugin callback. Queue preserves per-guild/plugin order, batches keys, applies timeout, and records last successfully applied version; callback failure does not roll back committed data but marks degraded health and allows bounded retry/manual reconciliation. Exact callback signature is approved with ADR-011 contracts during implementation. Migrations are namespaced/checksummed and execute before start.

## Folder Changes
Expected changes: existing config/settings registries and schemas; plugin context config capability; config event/queue coordinator; migration metadata/runner; health diagnostics; compatibility adapters and tests. Existing `module_states`, setting keys, and configuration files are not renamed.

## Acceptance Criteria
All existing settings map to one owner; invalid defaults/files/API writes are rejected before use; guild isolation and fallback pass; committed writes audit/invalidate/deliver once; burst changes coalesce deterministically; callback timeout/failure degrades only the owner and can reconcile; secrets are redacted; disabling plugin retains data; 3.2.3 fixtures remain readable.

## Deliverables
Plugin config registry, schemas, ownership map, compatibility projection, hot-reload queue/coordinator, migration integration, diagnostics, policies, and tests.

## Testing
Valid/invalid schema fixtures, defaults, file/env/API boundaries, guild isolation, transactions/concurrency, cache invalidation, audit redaction, ordered/coalesced hot reload, timeout/retry/reconciliation, migration replay/checksum, disable/rollback, and all repository quality commands.

## Rollback Plan
Disable hot-reload delivery and plugin ownership enforcement, route reads/writes through existing module config adapters, retain additive metadata and all user data, restart to apply values, then verify settings/API/dashboard behavior.

## Notes
Configuration hot reload does not unload/import source code. ADR-012 is authoritative.
