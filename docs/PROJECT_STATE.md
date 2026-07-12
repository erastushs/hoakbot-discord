# Project State

## Current Version

3.2.3. This remains the compatibility baseline described by the [architecture](ARCHITECTURE.md) and [roadmap](ROADMAP.md).

## Current Milestone

4.0.0 plugin platform: migrate from internal manifest-driven modules to a supported, compatibility-first plugin platform.

## Current Phase

Phase 08 — Assets is complete with validated ownership and licensing metadata, deterministic generated build assets, safe namespaced resolution, bounded handle caching and disposal, migrated Shrine, Welcome, and Voice consumers, and direct-path compatibility rollback. Phase 07 was explicitly skipped for this authorized task and remains incomplete. No Phase 08 commit has been created; commit pending authorization. Phase 09 has not started.

## Completed Phases

- Phase 00 — Documentation, completed by commit `27306f1`. Its approved contract is [PHASE-00-DOCUMENTATION](phases/PHASE-00-DOCUMENTATION.md).
- Phase 01 — UX Polish. Its approved inventory, presentation matrix, golden regression map, and rollback rules are [PHASE-01-PRESENTATION-BASELINE](phases/PHASE-01-PRESENTATION-BASELINE.md).
- Phase 02 — Plugin Core. Static catalog validation, deterministic dependency resolution, atomic registry snapshots, scoped context, metadata redaction, lifecycle coordination, compatibility projections, and reversible bootstrap selection are implemented under [PHASE-02-PLUGIN-CORE](phases/PHASE-02-PLUGIN-CORE.md).
- Phase 03 — Plugin Migration. All seven built-ins migrated in the required order with compatibility projections, independent rollback flags, parity fixtures, single ownership, and deterministic cleanup under [PHASE-03-PLUGIN-MIGRATION](phases/PHASE-03-PLUGIN-MIGRATION.md).
- Phase 04 — Dashboard. Safe compatibility projections, normalized metadata-driven UI, dependency-aware guild state controls, persistence, audit, and authenticated live updates are implemented under [PHASE-04-DASHBOARD](phases/PHASE-04-DASHBOARD.md).
- Phase 05 — Config. Plugin-owned validated settings, compatibility reads, deterministic value hot reload, redacted diagnostics, namespaced checksummed migrations, and reversible feature flags are implemented under [PHASE-05-CONFIG](phases/PHASE-05-CONFIG.md).
- Phase 06 — Commands. Typed command descriptors, generated deterministic catalogs and hashes, atomic registry projections, shared permission visibility, authorized bounded autocomplete, explicit list/deploy workflows, drift detection, 3.2.3 payload fixtures, and rollback adapters are implemented under [PHASE-06-COMMANDS](phases/PHASE-06-COMMANDS.md). No commit has been created; commit pending authorization.
- Phase 08 — Assets. Validated ownership and licensing inventory, namespaced descriptors, deterministic generated maps and build copying, safe resolver boundaries, bounded handle caching and disposal, font registration support, migrated Shrine, Welcome, and Voice consumers, compatibility adapters, and focused regressions are implemented under [PHASE-08-ASSETS](phases/PHASE-08-ASSETS.md). Phase 07 was explicitly skipped and remains incomplete. No Phase 08 commit has been created; commit pending authorization.

## Current Objective

Preserve existing Shrine rendering, Welcome fallback, Voice playback, and source-path rollback behavior through the completed Phase 08 asset controls. Phase 07 remains incomplete after its authorized skip; do not begin Phase 09.

## Known Issues

None recorded for Phase 01.

## Blockers

None recorded. Human approval remains required for scope changes, contract/ADR changes, destructive operations, releases, deployments, migrations against shared data, and commits unless session policy explicitly authorizes them.

## Pending TODO

- Keep Phase 01 golden regressions green during subsequent work.
- Keep plugin-core and legacy bootstrap parity green.
- Keep all seven plugin migration parity and rollback regressions green.
- Keep Phase 04 dashboard compatibility, security, dependency-state, and live-update regressions green.
- Keep Phase 05 ownership, validation, hot-reload, migration, rollback, and compatibility regressions green.
- Keep Phase 06 command catalog, payload, permission, Help, autocomplete, deployment-drift, and rollback regressions green.
- Keep Phase 08 manifest, generator, containment, integrity, ownership, cache/disposal, build integration, consumer compatibility, and rollback regressions green.
- Create the Phase 08 commit only with explicit authorization.
- Keep Phase 07 recorded as skipped and incomplete; do not begin Phase 09 without separate authorization.

## Next Recommended Task

Review and authorize the pending Phase 08 commit separately; do not begin Phase 09.

## Relevant ADRs

- [ADR-011 — Plugin System](adr/ADR-011-Plugin-System.md)
- [ADR-012 — Configuration](adr/ADR-012-Configuration.md)
- [ADR-013 — Dashboard](adr/ADR-013-Dashboard.md)
- [ADR-014 — Command Discovery](adr/ADR-014-Command-Discovery.md)

Phase 02 implements ADR-011 core behavior without changing later-phase contracts.

## Relevant Phase Documents

[Phase 08 — Assets](phases/PHASE-08-ASSETS.md), [Phase 06 — Commands](phases/PHASE-06-COMMANDS.md), [Phase 05 — Config](phases/PHASE-05-CONFIG.md), [Phase 04 — Dashboard](phases/PHASE-04-DASHBOARD.md), [Phase 03 — Plugin Migration](phases/PHASE-03-PLUGIN-MIGRATION.md), and [Phase 02 — Plugin Core](phases/PHASE-02-PLUGIN-CORE.md). Phase 07 remains skipped and incomplete.

## Files Recently Changed

Phase 08 added a validated asset inventory and schema, deterministic generated deployment maps and copying, path and integrity validation, namespaced owner-isolated resolution, bounded handle caching and disposal, deterministic font registration support, resolver-backed Shrine textures, Welcome fallback imagery, and Voice sounds, direct-path rollback adapters, and focused regressions. The full build, typecheck, test, and lint pipeline passes; Phase 07 was explicitly skipped for this authorized task, Phase 09 has not started, and no Phase 08 commit has been created.
