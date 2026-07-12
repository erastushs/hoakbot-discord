# Project State

## Current Version

3.2.3. This remains the compatibility baseline described by the [architecture](ARCHITECTURE.md) and [roadmap](ROADMAP.md).

## Current Milestone

4.0.0 plugin platform: migrate from internal manifest-driven modules to a supported, compatibility-first plugin platform.

## Current Phase

Phase 02 — Plugin Core is complete and remains behind the disabled-by-default `pluginCoreBootstrap` rollback flag.

## Completed Phases

- Phase 00 — Documentation, completed by commit `27306f1`. Its approved contract is [PHASE-00-DOCUMENTATION](phases/PHASE-00-DOCUMENTATION.md).
- Phase 01 — UX Polish. Its approved inventory, presentation matrix, golden regression map, and rollback rules are [PHASE-01-PRESENTATION-BASELINE](phases/PHASE-01-PRESENTATION-BASELINE.md).
- Phase 02 — Plugin Core. Static catalog validation, deterministic dependency resolution, atomic registry snapshots, scoped context, metadata redaction, lifecycle coordination, compatibility projections, and reversible bootstrap selection are implemented under [PHASE-02-PLUGIN-CORE](phases/PHASE-02-PLUGIN-CORE.md).

## Current Objective

Preserve the approved 3.2.3 module-facing baseline through the Phase 02 compatibility adapters. Do not begin Phase 03 migration without separate authorization.

## Known Issues

None recorded for Phase 01.

## Blockers

None recorded. Human approval remains required for scope changes, contract/ADR changes, destructive operations, releases, deployments, migrations against shared data, and commits unless session policy explicitly authorizes them.

## Pending TODO

- Keep Phase 01 golden regressions green during subsequent work.
- Keep plugin-core and legacy bootstrap parity green.
- Begin Phase 03 only under its phase contract and normal approval gates.

## Next Recommended Task

Review and authorize Phase 03 separately; Phase 02 does not migrate built-ins or add future command/event helper APIs.

## Relevant ADRs

- [ADR-011 — Plugin System](adr/ADR-011-Plugin-System.md)
- [ADR-012 — Configuration](adr/ADR-012-Configuration.md)
- [ADR-013 — Dashboard](adr/ADR-013-Dashboard.md)
- [ADR-014 — Command Discovery](adr/ADR-014-Command-Discovery.md)

Phase 02 implements ADR-011 core behavior without changing later-phase contracts.

## Relevant Phase Documents

[Phase 02 — Plugin Core](phases/PHASE-02-PLUGIN-CORE.md), [Phase 01 — UX Polish](phases/PHASE-01-UX-POLISH.md), and its [presentation baseline](phases/PHASE-01-PRESENTATION-BASELINE.md).

## Files Recently Changed

Phase 02 added plugin-core contracts and implementation, generated built-in catalog projection, module compatibility adapters, bootstrap flag selection, focused contract/integration tests, and governing phase/state/changelog evidence.
