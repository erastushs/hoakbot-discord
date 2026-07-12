# Phase 10 — Evidence

## Approved Contract

Phase 10 implements the approved generator, template, documentation, CLI, stable SDK export, harness, example, validation, packaging, compatibility, migration, and prerelease scope in [PHASE-10-PLUGIN-SDK](PHASE-10-PLUGIN-SDK.md). Runtime and SDK manifest validation share `@hoakbot/plugin-contracts`; undocumented core paths remain unsupported.

## Public Surface

`@hoakbot/plugin-sdk` exports only `.`, `./testing`, and `./manifest-schema`. The root exports `capabilityKinds`, `defineManifest`, `definePlugin`, `parseManifest`, the public schemas, and documented contract types. The `hoak-plugin` CLI provides `create`, `validate`, `inspect`, `preflight`, `check`, and `pack`, with `--json`; create also accepts `--id`, `--description`, and `--license`, and preflight accepts `--timeout-ms`.

## Acceptance Mapping

- Generation: validated names and paths, atomic output, overwrite refusal, no generated secrets, compilable versioned template.
- Validation and inspection: static manifest loading without factory execution, malformed/dependency/collision diagnostics, stable JSON, recursive secret redaction.
- Testing and consumers: exported lifecycle harness, generated project and example plugin coverage for config, commands/autocomplete, events, assets, and cleanup.
- Packaging: ESM exports, binaries, declared files and assets, safe tar entries, and npm integrity are checked before acceptance.
- Documentation: quickstart, concepts, API, recipes, security, assets, testing, packaging, migration, operations, compatibility, and release policy are present and linked.

## Validation and Compatibility

SDK API generation/check, SDK typecheck/build/tests, generated and example consumer checks, CLI acceptance tests, and repository validation passed. Node 26 executed locally. Node 22 and 24 are declared executable ESM matrix entries but were unavailable locally; no local execution is claimed for them. CommonJS is not supported.

## Release and Rollback

`@hoakbot/plugin-contracts` and `@hoakbot/plugin-sdk` remain `4.0.0-next.0` prereleases until all promotion gates, including the supported Node matrix, pass. On a defect, stop promotion, deprecate only the affected prerelease, publish a corrected prerelease, preserve runtime 4.0 contracts, and keep generated projects pinned with explicit migration instructions. No Phase 10 commit has been created.
