# Phase 10 — Plugin SDK

## Goal
Ship a supported Plugin SDK with a generator, reusable template, complete documentation, and CLI workflow for independent contributors.

## Background
Core contracts and tests are insufficient unless authors can reliably scaffold, validate, test, package, and diagnose plugins without importing internals.

## Scope
Explicit **generator, template, documentation, and CLI**; stable SDK exports, plugin harness integration, examples, validators, packaging, compatibility matrix, and module-to-plugin migration guide.

## Out of Scope
Marketplace, remote installer, publisher identity service, guaranteed sandboxing, unrestricted DI access, and removal of module compatibility.

## Requirements
Generator creates a uniquely named plugin from validated prompts/flags, refuses overwrite, and emits no secrets. Template covers manifest, context/lifecycle, config, commands/autocomplete, events/priority/dependencies, assets, tests, README, license placeholders, and package exports. Documentation includes quickstart, concepts, API reference, recipes, security, assets, testing, packaging, migration, operations, and version support. CLI provides at minimum create, validate, test/preflight, inspect, and pack/check workflows; exact command names/flags are approved during implementation. CLI and runtime use the same schemas.

## Technical Design
Publish only reviewed public contracts/builders/schema parsers plus Phase 09 harness utilities. Build generator from versioned text/AST templates and verify generated output as a consumer package. CLI loads static manifests without factory execution for validation, prints human and machine-readable diagnostics, delegates tests to repository/package scripts safely, inspects capability/dependency catalogs, and checks package exports/integrity before pack. Documentation snippets are compiled/tested. `docs/templates/plugin-template.md` remains the design/acceptance worksheet, not a substitute for generated source.

## Folder Changes
Expected additions: an SDK workspace/package, CLI entrypoint and command modules, generator templates, example plugin, harness exports, docs/reference generation, and consumer fixtures following repository package conventions. Root scripts/package configuration change only when implementation is approved; runtime imports only stable SDK contracts.

## Acceptance Criteria
From a clean temp directory, the generator creates a compilable plugin without overwriting files; generated tests pass using the harness; CLI validate rejects malformed/incompatible/colliding metadata without executing factories; inspect redacts secrets; pack/check verifies exports/assets/integrity; docs quickstart reproduces the workflow; module migration guide covers IDs/settings/commands/events/API/dashboard; SDK/runtime schema parity and supported Node/ESM matrix pass.

## Deliverables
Versioned SDK, generator, source template, CLI, harness exports, example plugin, documentation set, generated API reference, compatibility matrix, packaging/migration/security guides, and release policy.

## Testing
Golden generator tests, unsafe-name/path/overwrite cases, generated-project install/typecheck/test/build/pack, CLI exit codes/stdout JSON/stderr and malformed fixtures, schema parity, ESM exports, documentation snippet/link tests, example lifecycle/config/command/event/asset tests, supported Node matrix, and repository full suite.

## Rollback Plan
Release SDK/CLI as prerelease until gates pass. If defective, stop promotion, deprecate only the affected SDK version, publish a corrected version, and leave runtime 4.0 contracts unchanged. Generated projects remain pinned and migration instructions identify changes.

## Notes
Only documented exports are supported. Internal core paths are explicitly unstable and unavailable to templates.
