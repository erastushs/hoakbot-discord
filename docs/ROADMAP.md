# Hoak Bot Plugin Platform Roadmap

## Current Version
3.2.3: manifest-driven modules, registry-backed configuration/API behavior, and metadata-driven dashboard.

## Target Version
4.0.0: compatibility-first plugin platform with migrated built-ins and a supported plugin SDK.

## Current Phase
Phase 08 — Assets is complete with a validated ownership and licensing inventory, deterministic generated build assets, safe namespaced resolution, bounded handle caching and disposal, migrated Shrine, Welcome, and Voice consumers, and compatibility rollback; Phase 07 was explicitly skipped for this authorized task and remains incomplete, and Phase 09 has not started.

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

## Upcoming Phases
1. UX Polish
2. Plugin Core
3. Plugin Migration
4. Dashboard
5. Config
6. Commands
7. Events
8. Assets
9. Testing
10. Plugin SDK

## Success Metrics
- All seven built-ins migrate with unchanged behavior and exact order: General -> Logging -> Welcome -> Goodbye -> Voice -> Moderation -> Shrine
- Existing API, dashboard, security, configuration, and persistent identifiers remain compatible
- Plugin startup, dependencies, commands, events, and assets are deterministic and validated
- Full build, lint, typecheck, security, migration, dashboard, and test suites pass
- Contributors can create, validate, test, package, and document a plugin independently
