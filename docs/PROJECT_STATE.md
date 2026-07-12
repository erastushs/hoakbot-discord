# Project State

## Current Version

3.2.3. This remains the compatibility baseline described by the [architecture](ARCHITECTURE.md) and [roadmap](ROADMAP.md).

## Current Milestone

4.0.0 plugin platform: migrate from internal manifest-driven modules to a supported, compatibility-first plugin platform.

## Current Phase

Phase 04 — Dashboard is complete behind a disabled-by-default `pluginDashboard` rollback flag.

## Completed Phases

- Phase 00 — Documentation, completed by commit `27306f1`. Its approved contract is [PHASE-00-DOCUMENTATION](phases/PHASE-00-DOCUMENTATION.md).
- Phase 01 — UX Polish. Its approved inventory, presentation matrix, golden regression map, and rollback rules are [PHASE-01-PRESENTATION-BASELINE](phases/PHASE-01-PRESENTATION-BASELINE.md).
- Phase 02 — Plugin Core. Static catalog validation, deterministic dependency resolution, atomic registry snapshots, scoped context, metadata redaction, lifecycle coordination, compatibility projections, and reversible bootstrap selection are implemented under [PHASE-02-PLUGIN-CORE](phases/PHASE-02-PLUGIN-CORE.md).
- Phase 03 — Plugin Migration. All seven built-ins migrated in the required order with compatibility projections, independent rollback flags, parity fixtures, single ownership, and deterministic cleanup under [PHASE-03-PLUGIN-MIGRATION](phases/PHASE-03-PLUGIN-MIGRATION.md).
- Phase 04 — Dashboard. Safe compatibility projections, normalized metadata-driven UI, dependency-aware guild state controls, persistence, audit, and authenticated live updates are implemented under [PHASE-04-DASHBOARD](phases/PHASE-04-DASHBOARD.md).

## Current Objective

Preserve the approved 3.2.3 module-facing baseline through the completed Phase 04 dashboard compatibility layer. Do not begin Phase 05 without separate authorization.

## Known Issues

None recorded for Phase 01.

## Blockers

None recorded. Human approval remains required for scope changes, contract/ADR changes, destructive operations, releases, deployments, migrations against shared data, and commits unless session policy explicitly authorizes them.

## Pending TODO

- Keep Phase 01 golden regressions green during subsequent work.
- Keep plugin-core and legacy bootstrap parity green.
- Keep all seven plugin migration parity and rollback regressions green.
- Keep Phase 04 dashboard compatibility, security, dependency-state, and live-update regressions green.
- Begin Phase 05 only under its phase contract and normal approval gates.

## Next Recommended Task

Review and authorize Phase 05 separately; Phase 04 does not begin configuration platform work.

## Relevant ADRs

- [ADR-011 — Plugin System](adr/ADR-011-Plugin-System.md)
- [ADR-012 — Configuration](adr/ADR-012-Configuration.md)
- [ADR-013 — Dashboard](adr/ADR-013-Dashboard.md)
- [ADR-014 — Command Discovery](adr/ADR-014-Command-Discovery.md)

Phase 02 implements ADR-011 core behavior without changing later-phase contracts.

## Relevant Phase Documents

[Phase 04 — Dashboard](phases/PHASE-04-DASHBOARD.md), [Phase 03 — Plugin Migration](phases/PHASE-03-PLUGIN-MIGRATION.md), and [Phase 02 — Plugin Core](phases/PHASE-02-PLUGIN-CORE.md).

## Files Recently Changed

Phase 04 added safe dashboard serializers, guild module-state persistence and events, dependency-aware secured state endpoints, normalized client contracts, generic navigation/metadata/settings/state UI, rollback controls, and contract/security/UI regressions.
