# Hoak Bot Plugin Platform Roadmap

## Current Version
3.2.3: manifest-driven modules, registry-backed configuration/API behavior, and metadata-driven dashboard.

## Target Version
4.0.0: compatibility-first plugin platform with migrated built-ins and a supported plugin SDK.

## Current Phase
Release Phase R3 — Documentation consistency is complete for baseline promotion. The active authority chain is [ARCHITECTURE](ARCHITECTURE.md), this roadmap, [PROJECT_STATE](PROJECT_STATE.md), and ADR-011 through ADR-014. Legacy v3 architecture, roadmap, ADR-001 through ADR-010, and old specifications are archived under [Documentation Archive](archive/README.md) as historical references only.

## Completed Milestones
- Existing module manifests, registries, dependency graph, and loader
- Secure API with authenticated and guild-scoped controls
- Metadata-driven dashboard and configuration platform
- V4 documentation plan and terminology baseline
- Phase 01 user-facing surface inventory, presentation baseline, golden regressions, and accessibility/security verification
- Phase 02 validated plugin contracts, generated built-in catalog, deterministic loader/registry/context/lifecycle, compatibility projections, and reversible bootstrap flag
- Phase 03 migrated all seven built-ins in required order with parity evidence, independent rollback flags, single lifecycle ownership, and clean resource shutdown
- Phase 04 delivered metadata-driven dashboard projections, dependency-aware state controls, persistence, audit, and authenticated live updates
- Phase 05 delivered plugin-owned validated settings, deterministic hot reload, migration checksums, diagnostics, and rollback controls
- Phase 06 delivered typed command definitions, generated deterministic discovery, canonical registry projections, permission and autocomplete metadata, explicit deployment drift detection, and compatibility rollback adapters
- Phase 07 delivered typed declarative event definitions, validated inventory and generated discovery, deterministic dependency/priority ordering, lifecycle-safe source adapters, compatibility aliases, observable failure handling, migrated built-ins, and legacy rollback
- Phase 08 delivered validated asset ownership, deterministic generated build assets, safe namespaced resolution, bounded caching and disposal, migrated consumers, and compatibility rollback
- Phase 09 delivered a reusable plugin test harness, shared typed fixtures, integration/parity and security coverage, measured coverage regression gates, upgrade/rollback evidence, and release checks
- Phase 10 delivered canonical SDK contracts, reviewed harness exports, safe generation and templates, an example plugin, static CLI workflows, contributor documentation, compatibility guidance, and prerelease policy
- Release Phase R1 resolved production dependency vulnerabilities with a clean high-severity production audit and no accepted risks
- Release Phase R3 removed baseline-blocking documentation conflicts, reconciled dashboard live updates on SSE, superseded conflicting ADRs, archived obsolete architecture/roadmap material, and documented feature-flag state

## Remaining Promotion Gates

1. Hosted GitHub Actions release matrix must pass on Node 22, Node 24, and Node 26.
2. Human approval is required before prerelease publication, deployment, or commits.

## Feature-Flag Baseline

- `pluginCoreBootstrap`: enabled in the checked-in baseline as the selected v4 core path.
- `pluginDashboard`, `pluginConfigOwnership`, `pluginConfigHotReload`, `pluginConfigRollback`, `pluginEventsRollback`, and per-built-in plugin flags: disabled unless an operator intentionally selects those rollout or rollback paths.
- `modules.*`: compatibility-facing module availability controls that remain valid through 4.0.

Feature flags are rollout and rollback controls. Disabled later-phase flags do not invalidate completed phase implementation or evidence.

## Success Metrics
- All seven built-ins migrate with unchanged behavior and exact order: General -> Logging -> Welcome -> Goodbye -> Voice -> Moderation -> Shrine
- Existing API, dashboard, security, configuration, and persistent identifiers remain compatible
- Plugin startup, dependencies, commands, events, and assets are deterministic and validated
- Full build, lint, typecheck, security, migration, dashboard, and test suites pass
- Contributors can create, validate, test, package, and document a plugin independently
- Documentation references one active baseline authority chain, with obsolete v3 material archived as historical
