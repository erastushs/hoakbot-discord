# Phase 09 — Testing

## Goal
Build a reusable plugin test harness and shared mocks, then prove integration compatibility and coverage before 4.0.0.

## Background
Plugin lifecycle, config, commands, events, dashboard, and assets cross boundaries that isolated unit tests cannot validate.

## Scope
Explicit **plugin harness, shared mocks, integration, and coverage**; contract fixtures, security/regression suites, upgrade/rollback rehearsal, failure injection, resource leak checks, and release evidence.

## Out of Scope
New features, production experiments without rollback, compatibility removal, and treating coverage percentage as sufficient correctness.

## Requirements
Harness starts one or more plugins without real Discord/Supabase and exposes deterministic lifecycle/registry assertions. Shared mocks model Discord interactions/guilds/members/channels, config/database/cache, event bus, command/API registries, clock/timers, logger, assets, and failures; mocks must not weaken production contracts. Integration covers all seven built-ins and phase boundaries. Establish measured baseline coverage, then approve per-layer thresholds and no-regression gate; critical security/config/lifecycle code requires branch coverage and scenario tests.

## Technical Design
Create a host builder that accepts manifests/factories, dependency graph, scoped capabilities, fake clock, and failure injection, returning registry state, emitted events, logs, cleanup counts, and requests. Centralize typed fixture factories with safe defaults and explicit overrides. Add integration suites for bootstrap -> plugin load -> command/event/config/API/dashboard projection -> stop. Store 3.2.3 golden fixtures and 4.0 parity reports. Coverage configuration includes plugin core and migrated built-ins, excludes generated files with justification, and publishes machine-readable artifacts.

## Folder Changes
Expected additions under existing test conventions: plugin harness, shared mocks/fixtures, contract tests, integration/security/migration/rollback suites, coverage configuration/report scripts, and fixture assets. Production edits are limited to reviewed injection seams; no test-only branches in production.

## Acceptance Criteria
A contributor can test a plugin with no network/database/Discord credentials; shared mocks are used by migrated plugin tests; all seven built-ins pass integration/parity; failure/cleanup and security scenarios pass; coverage meets approved thresholds with no unjustified exclusions; 3.2.3 upgrade and rollback preserve data/commands/API/dashboard behavior; no flaky release blockers.

## Deliverables
Harness API, shared mocks/fixtures, integration matrix/suites, coverage policy/config/report, security and leak tests, parity snapshots, upgrade/rollback evidence, and release checklist.

## Testing
Self-test harness/mocks against production contracts; unit/contract/property/integration/e2e/security tests; lifecycle timeout and resource leaks; config concurrency/hot reload; command autocomplete/permissions; event priority/dependencies; asset corruption; dashboard auth/guild isolation; PM2-style shutdown; `npm run lint`, `npm run typecheck`, `npm run build`, `npm test`, and coverage command.

## Rollback Plan
Testing changes do not require production rollback. If injection seams regress behavior, revert those seams and retain black-box tests. Block release, restore prior artifact/config in rehearsal, disable plugin flags, and verify baseline fixtures before retrying.

## Notes
Threshold numbers are approved from measured baseline during implementation, not invented here. Generated-code exclusions must be listed and reviewed.
