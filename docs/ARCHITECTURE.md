# Hoak Bot Platform Architecture

**Current:** 3.2.3  
**Target:** 4.0.0

## Vision
Evolve Hoak Bot from manifest-driven modules into a stable plugin platform while preserving current behavior and contributor clarity.

## Goals
Provide explicit plugin contracts, migrate built-ins safely, retain secure API/dashboard/configuration behavior, and enable independently developed plugins.

## Core Principles
Metadata over hardcoding; registries over runtime scanning; schema validation at boundaries; least privilege; deterministic startup; backward compatibility; additive migration; reversible phases.

## Folder Structure
Core platform services remain under `src/core`; Discord adapters remain under `src/adapters`; built-ins may remain under `src/modules` during 4.0 compatibility. New plugin contracts, registries, and SDK code follow existing repository conventions. Dashboard remains isolated in `dashboard/`. Plugin assets are plugin-owned. Documentation lives under `docs/`.

## Plugin Lifecycle
Static manifest discovery -> schema validation -> dependency validation -> registration -> dependency-ordered start -> runtime/config callbacks -> reverse-order stop. Required failures block readiness. Partial initialization must clean up. New code says “plugin”; existing module IDs, adapters, `module_states`, and `/api/v1/modules` remain compatible.

## Command Lifecycle
Plugins statically declare commands. One canonical registry validates ownership and collisions, then supplies runtime routing, help, listing, and explicit Discord deployment. Discovery never deploys commands automatically.

## Event Lifecycle
Plugins declare published and subscribed events with owned schemas. Core infrastructure events remain core-owned. Event names are namespaced, compatibility aliases are explicit, subscriptions are removed during shutdown, and payload boundaries are validated.

## Dashboard Architecture
The React dashboard remains an API-only client with no bot/plugin imports. It renders generic metadata-driven plugin/module pages without name-specific branches. OAuth sessions, CSRF, authorization, guild isolation, CORS, rate limiting, security audit, response envelopes, and authenticated WebSockets remain unchanged.

## Configuration Strategy
Retain cache -> database -> manifest-default reads and validated, transactional, audited writes with cache invalidation and events. Existing setting keys and tables remain valid. Plugin settings are namespaced; secrets never enter manifests, logs, or dashboard metadata.

## Dependency Rules
Dependencies use plugin IDs and semantic ranges. Graphs must reject missing dependencies, incompatible versions, and cycles with actionable paths. Registration/start are dependency-first; shutdown is reverse order. Plugins depend on public contracts, not other plugins’ internals.

## Coding Standards
Use TypeScript strict typing, ESM, constructor/capability injection, Zod boundary validation, existing lint/format conventions, no secret logging, and no plugin-specific core/dashboard branching. Public contracts require compatibility tests.

## Naming Convention
New platform types use `Plugin*`. Existing `Module*` names remain deprecated compatibility surfaces through 4.0. IDs remain `hoak:<name>` for built-ins. Settings, commands, events, permissions, migrations, and assets use lowercase namespaced identifiers consistent with existing contracts.

## Testing Philosophy
Test contracts before implementations; use unit, schema, registry, lifecycle, integration, security, dashboard, migration, and rollback tests. Preserve 3.2.3 snapshots. Every implementation phase runs lint, typecheck, build, and full tests.

## Asset Organization
Each plugin owns assets beneath its directory/package. Manifests reference stable logical asset IDs or validated paths, not arbitrary remote/runtime paths. Build output preserves deterministic mapping; dashboard assets remain dashboard-owned.

## Future Expansion Strategy
After 4.0 stabilization, add explicit locked external-package discovery, richer SDK tooling, optional isolation research, and versioned API improvements. Compatibility surfaces are removed only in a later major release with migration tooling.
