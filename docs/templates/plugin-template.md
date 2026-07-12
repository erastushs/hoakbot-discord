# Plugin: Display Name

## Identity
| Field | Value |
|---|---|
| Plugin ID | `vendor:name` |
| Package | `package-name` |
| Plugin version | `0.1.0` |
| Hoak platform range | `>=4.0.0 <5.0.0` |
| Author/owner | Name/team |
| License | SPDX identifier |
| Source/provenance | Repository/package source |

## Purpose
Describe users, capability, non-goals, and observable behavior.

## Compatibility
List migrated module ID, retained settings/tables, commands/options, events/aliases, API/dashboard projections, and minimum platform/Node versions. Explain rollback behavior.

## Manifest and Metadata
Record static identity/display metadata, semantic dependencies, enabled default, category/order, capabilities, health metadata, and package exports. Manifest evaluation must be side-effect free and contain no secrets, handlers, environment-derived values, or mutable state.

## Dependencies and Context
List required/optional plugin ranges and requested scoped context capabilities. Explain behavior when dependencies are missing/disabled/degraded. Never request unrestricted container access.

## Lifecycle
Describe registration, start, config hot reload, stop, timeout/abort behavior, acquired resources, cleanup order, idempotency, and required/optional failure policy.

## Configuration
For every key record owner, scope, schema, default, sensitivity, authorization, legacy key, hot-reload effect, and migration. Defaults are public metadata; secrets use approved scoped services.

## Commands
For every `defineCommand()` declaration record name/options, scope, permission action, Help visibility, execute behavior, autocomplete behavior, Discord limits, and legacy payload snapshot.

## Events
For every `defineEvent()` declaration record source, published/subscribed name, payload schema, priority, dependencies, failure policy, ordering assumptions, and legacy aliases.

## API and Dashboard
List method/path, auth level, guild scope, validation and response schema, rate-limit class, audit behavior, and generic metadata/settings/navigation/enable-state presentation. All routes use core security middleware; executable custom dashboard UI is prohibited.

## Assets
Inventory shared versus plugin-owned logical IDs, texture/image constraints, fonts/family/style/weight, sounds/format/duration, source/license/hash, build mapping, cache/disposal, and fallback. No traversal or undeclared remote download.

## Data and Migrations
List immutable namespaced migration IDs, order, checksum, affected data, backward readability, transaction behavior, disable/uninstall retention, and explicit audited purge procedure.

## Security and Privacy
Document permissions, external hosts, data read/written/retained, secret access, user-content sanitization, log redaction, abuse controls, supply-chain review, and trust assumptions. Do not claim sandboxing.

## Folder Plan
Map maintained source, generated catalog, commands, events, services, assets, migrations, tests, fixtures, and docs. Explain any retained module compatibility path and never hand-edit generated files.

## Testing
Specify harness setup and shared mocks; manifest/dependency/collision tests; lifecycle cleanup/failure; config validation/hot reload/guild isolation; command permission/autocomplete; event priority/dependencies; API security/dashboard metadata; migration replay; asset corruption/traversal; redaction; package/CLI validation; integration and coverage expectations.

## Operations
Document create/validate/inspect/test/pack workflow, enable/disable, preflight, readiness effect, logs/metrics, upgrade, incident containment, rollback, data retention, and support matrix.

## Acceptance Checklist
- [ ] Static manifest validates without factory execution
- [ ] Identity, dependencies, metadata, and capabilities are complete
- [ ] Context is least-privilege and secret-safe
- [ ] Lifecycle cleanup, timeout, failure, and hot reload are tested
- [ ] Config is owned, validated, guild-isolated, and backward compatible
- [ ] Commands include permissions, Help visibility, and autocomplete tests
- [ ] Events include priority, dependencies, aliases, and cleanup tests
- [ ] API/dashboard security and generic rendering tests pass
- [ ] Shared/plugin assets, textures, fonts, and sounds are inventoried and validated
- [ ] Migrations are immutable, checksummed, and backward readable
- [ ] Harness, shared mocks, integration, and coverage gates pass
- [ ] Generator/template/docs/CLI package workflow passes
- [ ] Disable and rollback preserve user data and avoid duplicate handlers
- [ ] Build, lint, typecheck, and full tests pass

## Rollback
State trigger, flag/package/catalog reversal, handler/subscription deactivation order, migration/data handling, cache/generated-artifact cleanup, command redeployment policy, and API/dashboard/config verification.
