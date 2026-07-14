# Project State

## Current Version

3.2.3. This remains the compatibility baseline described by the [architecture](ARCHITECTURE.md) and [roadmap](ROADMAP.md).

## Current Milestone

4.0.0 plugin platform: migrate from internal manifest-driven modules to a supported, compatibility-first plugin platform.

## Current Phase

Hardening Phase H4 — Transactional plugin initialization is complete. Factory and lifecycle failures now unwind capability registrations exactly once in reverse order, contain cleanup failures, restore registry state, and leave no partial ownership. Built-ins use explicit frozen capability grants instead of unrestricted container access. H1–H3, Phase 07, and Phase 10 remain complete.

## Completed Phases

- Phase 00 — Documentation, completed by commit `27306f1`. Its approved contract is [PHASE-00-DOCUMENTATION](phases/PHASE-00-DOCUMENTATION.md).
- Phase 01 — UX Polish. Its approved inventory, presentation matrix, golden regression map, and rollback rules are [PHASE-01-PRESENTATION-BASELINE](phases/PHASE-01-PRESENTATION-BASELINE.md).
- Phase 02 — Plugin Core. Static catalog validation, deterministic dependency resolution, atomic registry snapshots, scoped context, metadata redaction, lifecycle coordination, compatibility projections, and reversible bootstrap selection are implemented under [PHASE-02-PLUGIN-CORE](phases/PHASE-02-PLUGIN-CORE.md).
- Phase 03 — Plugin Migration. All seven built-ins migrated in the required order with compatibility projections, independent rollback flags, parity fixtures, single ownership, and deterministic cleanup under [PHASE-03-PLUGIN-MIGRATION](phases/PHASE-03-PLUGIN-MIGRATION.md).
- Phase 04 — Dashboard. Safe compatibility projections, normalized metadata-driven UI, dependency-aware guild state controls, persistence, audit, and authenticated live updates are implemented under [PHASE-04-DASHBOARD](phases/PHASE-04-DASHBOARD.md).
- Phase 05 — Config. Plugin-owned validated settings, compatibility reads, deterministic value hot reload, redacted diagnostics, namespaced checksummed migrations, and reversible feature flags are implemented under [PHASE-05-CONFIG](phases/PHASE-05-CONFIG.md).
- Phase 06 — Commands. Typed command descriptors, generated deterministic catalogs and hashes, atomic registry projections, shared permission visibility, authorized bounded autocomplete, explicit list/deploy workflows, drift detection, 3.2.3 payload fixtures, and rollback adapters are implemented under [PHASE-06-COMMANDS](phases/PHASE-06-COMMANDS.md). No commit has been created; commit pending authorization.
- Phase 07 — Events. Typed declarations, validated inventory and generated catalog, deterministic dependency/priority ordering, lifecycle-safe registration and source adapters, compatibility aliases, payload/failure diagnostics, migrated built-ins, and explicit rollback are implemented under [PHASE-07-EVENTS](phases/PHASE-07-EVENTS.md), with acceptance evidence in [PHASE-07-EVIDENCE](phases/PHASE-07-EVIDENCE.md). No Phase 07 commit has been created.
- Phase 08 — Assets. Validated ownership and licensing inventory, namespaced descriptors, deterministic generated maps and build copying, safe resolver boundaries, bounded handle caching and disposal, font registration support, migrated Shrine, Welcome, and Voice consumers, compatibility adapters, and focused regressions are implemented under [PHASE-08-ASSETS](phases/PHASE-08-ASSETS.md). No Phase 08 commit has been created.
- Phase 09 — Testing. A credential-free plugin harness, shared typed fixtures, production-contract self-tests, all-seven-built-in integration/parity coverage, failure and cleanup scenarios, measured root/dashboard no-regression coverage gates, upgrade/rollback evidence, and release checks are implemented under [PHASE-09-TESTING](phases/PHASE-09-TESTING.md), with measured evidence in [PHASE-09-EVIDENCE](phases/PHASE-09-EVIDENCE.md). No Phase 09 commit has been created.
- Phase 10 — Plugin SDK. Canonical contracts, reviewed SDK and harness exports, a safe generator and reusable template, example plugin, static CLI validation and inspection, bounded preflight, package checks, contributor documentation, compatibility guidance, and prerelease policy are implemented under [PHASE-10-PLUGIN-SDK](phases/PHASE-10-PLUGIN-SDK.md), with acceptance and validation evidence in [PHASE-10-EVIDENCE](phases/PHASE-10-EVIDENCE.md). No Phase 10 commit has been created; commit pending authorization.

## Current Objective

Preserve the completed H1–H4 hardening fixes and all completed plugin-platform behavior. Do not begin another hardening phase or promote the SDK/CLI prerelease without separate authorization and complete release gates.

## Known Issues

The Engineering Audit Review's dashboard isolation, transactional configuration, guild logging, reversible plugin loading, and unrestricted built-in DI findings are resolved. Remaining audit release blockers are recorded below.

## Blockers

The remaining Engineering Audit Review release blockers are the Phase 10 SDK acceptance failure, SDK harness capability enforcement, high-severity dependency vulnerabilities, and honest release gates. Human approval remains required for scope changes, contract/ADR changes, destructive operations, releases, deployments, migrations against shared data, and commits unless session policy explicitly authorizes them.

## Pending TODO

- Keep Phase 01 golden regressions green during subsequent work.
- Keep plugin-core and legacy bootstrap parity green.
- Keep all seven plugin migration parity and rollback regressions green.
- Keep Phase 04 dashboard compatibility, security, dependency-state, and live-update regressions green.
- Keep Phase 05 ownership, validation, hot-reload, migration, rollback, and compatibility regressions green.
- Keep Phase 06 command catalog, payload, permission, Help, autocomplete, deployment-drift, and rollback regressions green.
- Keep Phase 07 inventory, alias, ordering, dependency, lifecycle, source-adapter, payload, failure, timeout, and rollback regressions green.
- Keep Phase 08 manifest, generator, containment, integrity, ownership, cache/disposal, build integration, consumer compatibility, and rollback regressions green.
- Keep Phase 09 harness, shared-fixture, integration/parity, failure/cleanup, security, coverage, upgrade/rollback, and release-evidence checks green.
- Keep Phase 10 schema parity, exact exports, generator, harness, CLI, packaging, documentation, and consumer checks green.
- Execute the declared Node 22 and 24 matrix before prerelease promotion; only Node 26 was available and executed locally.
- Create Phase 07 and Phase 10 commits only with explicit authorization.

## Next Recommended Task

Define and authorize the next hardening phase separately. Do not begin SDK, dependency, or release-gate work as part of H4.

## Relevant ADRs

- [ADR-011 — Plugin System](adr/ADR-011-Plugin-System.md)
- [ADR-012 — Configuration](adr/ADR-012-Configuration.md)
- [ADR-013 — Dashboard](adr/ADR-013-Dashboard.md)
- [ADR-014 — Command Discovery](adr/ADR-014-Command-Discovery.md)

Phase 02 implements ADR-011 core behavior without changing later-phase contracts.

## Relevant Phase Documents

[Phase 10 — Plugin SDK](phases/PHASE-10-PLUGIN-SDK.md), [Phase 10 — Evidence](phases/PHASE-10-EVIDENCE.md), [Phase 09 — Testing](phases/PHASE-09-TESTING.md), [Phase 09 — Evidence](phases/PHASE-09-EVIDENCE.md), [Phase 08 — Assets](phases/PHASE-08-ASSETS.md), [Phase 07 — Events](phases/PHASE-07-EVENTS.md), [Phase 07 — Evidence](phases/PHASE-07-EVIDENCE.md), [Phase 06 — Commands](phases/PHASE-06-COMMANDS.md), [Phase 05 — Config](phases/PHASE-05-CONFIG.md), [Phase 04 — Dashboard](phases/PHASE-04-DASHBOARD.md), [Phase 03 — Plugin Migration](phases/PHASE-03-PLUGIN-MIGRATION.md), and [Phase 02 — Plugin Core](phases/PHASE-02-PLUGIN-CORE.md).

## Files Recently Changed

Hardening Phase H4 added per-plugin capability ownership, exactly-once disposer wrappers, reverse-order catalog rollback, failing/optional lifecycle cleanup, registry restoration, cleanup-failure diagnostics, and explicit frozen built-in capability grants across all seven migrated plugins. Build, typecheck, 722 backend tests, 33 dashboard tests, and lint completed successfully on Node 26; lint reports one pre-existing `no-explicit-any` warning in `src/plugin-core/contracts.ts`. The Engineering Audit Review and changelog were updated. No commit was created.
