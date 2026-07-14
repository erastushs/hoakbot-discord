# HoakBot Engineering Audit Review

**Review date:** 2026-07-13  
**Revision verified:** `6dc8f30`  
**Method:** Every material finding from the prior audit was treated as a hypothesis and checked against current documentation, implementation, tests, scripts, configuration, dependency metadata, and Git history.  
**Repository changes:** None. Working tree remained clean.

## Classification Summary

| Classification                  | Meaning                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| **Confirmed**                   | Current repository directly supports the finding                                        |
| **Partially Confirmed**         | Core concern exists, but the prior wording was too broad                                |
| **False Positive**              | Current evidence contradicts the finding                                                |
| **Obsolete**                    | Historically true or still documented, but invalidated by current history/state         |
| **Expected Transitional State** | Intentional compatibility scaffolding, not necessarily acceptable as the final baseline |

Complexity and regression risk use **Low / Medium / High / Very High**.

---

# 1. Phase Findings

## Phase 00

| Hypothesis                                         | Classification     | Evidence                                                                                                                                                                                                |
| -------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required documentation artifacts are incomplete    | **False Positive** | The phase defines and supplies the required documentation set at `docs/phases/PHASE-00-DOCUMENTATION.md:9-31`; completion commit `27306f1` exists and is recorded at `docs/PROJECT_STATE.md:17`.        |
| Phase 00 did not establish documentation authority | **False Positive** | The V4 plan and governing ADR authority are stated at `docs/phases/PHASE-00-DOCUMENTATION.md:18-22`. The later problem is competing legacy documents, not failure of the original Phase 00 deliverable. |

**Disposition:** Original Phase 00 deliverables remain complete.

---

## Phase 01

| Hypothesis                                                                   | Classification          | Evidence                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No presentation/golden matrix exists                                         | **Partially Confirmed** | A matrix and test-location index exist at `docs/phases/PHASE-01-PRESENTATION-BASELINE.md:5-39`. Traceability remains coarse because several rows reference broad files or “existing command tests,” not exact test names or fixture IDs. |
| Shrine success/failure/boundary coverage is absent                           | **False Positive**      | Shrine variants and test locations are recorded at `docs/phases/PHASE-01-PRESENTATION-BASELINE.md:17`, `:34`, and `:39`; `tests/unit/shrine-service.test.ts` exists.                                                                     |
| Dashboard loading, empty, error, populated, and validation states are absent | **False Positive**      | States are specified at `docs/phases/PHASE-01-PRESENTATION-BASELINE.md:21`; loading/error/content rendering exists at `dashboard/src/App.tsx:287-305`; dashboard component tests exist.                                                  |
| No canonical Phase 01 completion evidence/commit is recorded                 | **Partially Confirmed** | UX commits exist, including `02bf663`, `def9db4`, and `d0fcd9c`, but `docs/PROJECT_STATE.md:18` does not identify a canonical phase commit or dedicated evidence document.                                                               |

**Confirmed issues:** None at the full “Confirmed” level.

---

## Phase 02

### Confirmed

| Issue                                                                                            | Severity | Complexity | Regression risk | Evidence                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | -------: | ---------: | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Built-in plugins can access the unrestricted DI container — **resolved H4**                        | **High** |  Very High |            High | All seven migrated built-ins now receive explicit frozen capability grants. Plugin contexts expose no container, token resolver, token map, `has`, or `clear` capability. |
| Factory failure does not undo earlier factory capability registrations — **resolved H4**           | **High** |       High |            High | Production loading now owns exactly-once capability disposers per plugin, unwinds partial factories globally in reverse order, restores registry state, and retains cleanup diagnostics. |
| Explicit `any` remains in the plugin event contract                                              |  **Low** |        Low |             Low | `EventDefinition<any>` appears at `src/plugin-core/contracts.ts:14`; current lint reports one warning.                                                                                                                                                                     |

### Other classifications

| Hypothesis                                              | Classification                  | Evidence                                                                                                                                                                                                                  |
| ------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin registry publication itself cannot roll back     | **False Positive**              | Snapshot restoration and compare-and-restore protection exist at `src/plugin-core/loader.ts:50-69` and `src/plugin-core/registry.ts:22-25`.                                                                               |
| Dual plugin/module lifecycle is accidental architecture | **Expected Transitional State** | Legacy and declarative modes are explicit compatibility mechanisms at `src/plugin-core/loader.ts:10-17` and are required by Phase 02 rollback scope. It remains unsuitable as the final architecture, but is intentional. |
| Static factories are guaranteed side-effect-free        | **Partially Confirmed**         | Factories are lazy and catalog validation occurs first, but `PluginFactory` has no purity contract and arbitrary factory effects cannot be rolled back.                                                                   |

---

## Phase 03

### Confirmed

| Issue                                                     |   Severity | Complexity | Regression risk | Evidence                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | ---------: | ---------: | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dedicated migration evidence is missing for six built-ins | **Medium** |     Medium |          Medium | The phase claims per-plugin suites at `docs/phases/PHASE-03-PLUGIN-MIGRATION.md:40-43`; only `tests/unit/welcome-plugin-migration.test.ts` is a dedicated migration suite. Catalog-wide tests do not fully replace per-plugin lifecycle/resource assertions. |

### Other classifications

| Hypothesis                                                | Classification                  | Evidence                                                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Split lifecycle ownership is an unplanned Phase 03 defect | **Expected Transitional State** | Independent migration flags and compatibility projections intentionally select legacy or plugin ownership. Welcome explicitly tests disjoint listener ownership.                                                   |
| Required migration order is undocumented                  | **False Positive**              | Exact order appears at `docs/phases/PHASE-03-PLUGIN-MIGRATION.md:15-16`.                                                                                                                                           |
| Runtime ordering contradicts migration order              | **Partially Confirmed**         | The migration sequence differs from retained legacy bootstrap order. Both are tested, but documentation does not clearly distinguish them.                                                                         |
| Metrics is an omitted eighth migrated plugin              | **Expected Transitional State** | Metrics remains a platform/compatibility service rather than one of the seven plugin migrations. Its user-facing “module” terminology is residue requiring clarification, not proof of a missing plugin migration. |

---

## Phase 04

### Confirmed

| Issue                                                                   |     Severity | Complexity | Regression risk | Evidence                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | -----------: | ---------: | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guild changes can retain the previous guild’s form values               | **Critical** |        Low |          Medium | `defaultValues` changes with `initialValues` at `dashboard/src/modules/SharedModulePage.tsx:22-24`, but the reset effect depends only on setting keys at `:34-40`. Guilds with identical setting keys do not trigger reset. `ModulePage` has no guild-specific React key at `dashboard/src/App.tsx:302`. |
| Logs REST and SSE are not guild-scoped                                  |     **High** |       High |            High | **Resolved by H3.** Canonical REST and SSE routes require `:guildId`, reuse centralized membership and permission authorization, and filter strict guild equality before pagination or serialization. Platform-only entries are excluded and legacy unscoped routes expose no data. |
| Persisted enable/disable state does not control runtime plugin behavior |     **High** |  Very High |            High | Endpoint persistence and audit occur at `src/core/api/module-config.endpoints.ts:174-215`, but no lifecycle, command, event, or scheduler registration is changed. Runtime availability remains based on globally loaded modules.                                                                        |
| Documented WebSocket architecture differs from SSE implementation       |   **Medium** |     Medium |          Medium | WebSockets are required by `docs/ARCHITECTURE.md:28` and Phase 04; runtime advertises SSE at `src/core/api/module-config.endpoints.ts:100-108` and uses `EventSource` at `dashboard/src/App.tsx:240-248`.                                                                                                |
| Required browser E2E coverage is absent                                 |   **Medium** |     Medium |             Low | Phase 04 requests E2E/responsive/live-update tests, but no Playwright/Cypress dependency or E2E script exists in `package.json`.                                                                                                                                                                         |
| Dashboard/server API DTOs are duplicated manually                       |      **Low** |     Medium |          Medium | Server contracts live in `src/core/api/contracts.ts`; dashboard duplicates transport types in `dashboard/src/contracts.ts:1-192`.                                                                                                                                                                        |

### Reconciliation of conflicting verification results

One review path initially classified the guild-state issue as false because saves use the currently selected guild at `dashboard/src/App.tsx:251-267`. That does not disprove the issue: the stale form values can still be displayed and then saved to the newly selected guild. Direct component-state evidence therefore supports **Confirmed**.

---

## Phase 05

### Confirmed

| Issue                                                            |     Severity | Complexity | Regression risk | Evidence                                                                                                                                                                         |
| ---------------------------------------------------------------- | -----------: | ---------: | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-setting writes are not transactional                       | **Critical** |       High |            High | `bulkSave()` performs sequential independent upserts at `src/core/config/guild-settings.repository.ts:85-89`.                                                                    |
| Configuration audit is not committed atomically with persistence |     **High** |       High |            High | Settings persist at `src/core/api/module-config.endpoints.ts:150-152`; audit follows at `:153-164`.                                                                              |
| Setting records have no concurrency version                      |   **Medium** |     Medium |          Medium | Records contain guild, key, value, and timestamp only at `src/core/config/guild-settings.repository.ts:14-26`; upserts overwrite unconditionally at `:44-54`.                    |
| `expectedVersion` is accepted but ignored                        |     **High** |     Medium |          Medium | Schema accepts it at `src/core/api/contract.schemas.ts:9-12`; handler narrows the body to settings only and never reads it at `src/core/api/module-config.endpoints.ts:136-151`. |
| Configuration cache has no TTL or cardinality bound              |   **Medium** |     Medium |          Medium | Bare values are stored indefinitely in a `Map` at `src/core/config/configuration.service.ts:10-12`, `:26-64`; only explicit invalidation exists.                                 |
| Database provider `watch()` is a no-op                           |   **Medium** |     Medium |             Low | `src/core/config/database-config.provider.ts:115-117` returns an inert unsubscribe function.                                                                                     |

### Other classifications

| Hypothesis                                                                  | Classification          | Evidence                                                                                                                                                        |
| --------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retrieval cannot enumerate all settings                                     | **False Positive**      | Registry-wide metadata and manifest defaults are available through current endpoints/provider behavior. Explicit key lists are intentional for value retrieval. |
| Settings boundary validation is wholly absent                               | **False Positive**      | Reads and writes are validated in `src/core/config/configuration.service.ts:26-38`, `:54-61`, and `:92-111`; API validation also occurs.                        |
| Validation is proven equivalent across file, environment, API, and database | **Partially Confirmed** | API and database-returned values are validated, but no complete acceptance matrix proves identical ownership-aware behavior across every named boundary.        |

---

## Phase 06

### Confirmed

| Issue                                                                                  |   Severity | Complexity | Regression risk | Evidence                                                                                                                                         |
| -------------------------------------------------------------------------------------- | ---------: | ---------: | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Built-in command declarations remain legacy classes centrally adapted into descriptors | **Medium** |       High |          Medium | Generator constructs classes at `scripts/generate-command-catalog.ts:43-58`; raw commands are adapted in `src/shared/command-registry.ts:18-20`. |
| Discovery is hardcoded to General and Moderation                                       | **Medium** |     Medium |          Medium | Fixed locations and owner inference appear at `scripts/generate-command-catalog.ts:5-23`.                                                        |
| Generator parses TypeScript with regular expressions and fixed dependency mappings     | **Medium** |     Medium |            High | `scripts/generate-command-catalog.ts:15-37`.                                                                                                     |
| Permission actions are not checked against the actual permission registry              | **Medium** |     Medium |          Medium | Validation uses a fixed regex/list at `src/shared/command/validate-command.ts:4-5`, `:100-108`.                                                  |
| Global deployment projection always omits commands                                     |   **High** |     Medium |            High | `deployment('global')` returns no descriptors at `src/shared/command-registry.ts:67-73`; the test currently enshrines the empty result.          |
| No dedicated Phase 06 evidence document exists                                         |    **Low** |        Low |             Low | `PHASE-06-COMMANDS.md` exists without a corresponding evidence document.                                                                         |
| No focused end-to-end rollback test covers router, Help, list, and deploy together     | **Medium** |     Medium |          Medium | Compatibility adapters exist, but Phase 06 tests cover individual contracts/projections rather than complete rollback.                           |

### False positive

The prior broad claim that router autocomplete acceptance coverage was missing is **False Positive**. Authorization, timeout, abort, failure handling, and 25-choice bounds are covered at `tests/integration/command-router.test.ts:305-375`.

---

## Phase 07

### Confirmed

| Issue                                                        |   Severity | Complexity | Regression risk | Evidence                                                                                                                                                                   |
| ------------------------------------------------------------ | ---------: | ---------: | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event inventory disagrees with the Voice declaration         |   **High** |        Low |            High | Inventory marks `voice.memberJoined` Discord-sourced at `src/core/event-bus/event-inventory.ts:19`; plugin marks it internal at `src/modules/voice/voice.plugin.ts:52-56`. |
| Event dependencies model owner IDs, not service capabilities | **Medium** |       High |          Medium | Checks inspect owner/plugin IDs only at `src/core/event-bus/event-registry.ts:43-48` and `src/plugin-core/lifecycle.ts:37-38`.                                             |
| Lifecycle coordinator trusts supplied plugin order           |   **High** |       High |            High | `src/plugin-core/lifecycle.ts:39` iterates the provided array without dependency sorting.                                                                                  |
| Event installation is not transactional                      |   **High** |     Medium |            High | Registrations are sequential at `src/core/event-bus/event-registry.ts:49-52`; a later failure does not roll back earlier registrations.                                    |
| Aliases can collide with another canonical ID                |   **High** |     Medium |            High | Alias checks inspect the alias map but not all canonical IDs at `src/core/event-bus/event-registry.ts:12-20`.                                                              |
| Ordering/collision permutation tests are incomplete          | **Medium** |     Medium |          Medium | Focused coverage uses one reversed pair/dependency scenario at `tests/unit/phase-07-events.test.ts:6-19`.                                                                  |

### Other classifications

| Hypothesis                                           | Classification                  | Evidence                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event failures have no metrics integration           | **False Positive**              | Bootstrap connects diagnostics to metrics at `src/bootstrap.ts:257`; the registry reports diagnostics at `src/core/event-bus/event-registry.ts:78`.      |
| Node 22/24 execution is missing                      | **Expected Transitional State** | Evidence explicitly records Node 26-only validation and retains Node 22/24 as promotion gates. It is a release gate, not a hidden implementation defect. |
| Evidence says no Phase 07 commit exists              | **Obsolete**                    | Commit `6dc8f30` exists; `docs/phases/PHASE-07-EVIDENCE.md:15` is stale.                                                                                 |
| Legacy and declarative event paths can both dispatch | **False Positive**              | Disjoint modes are tested in `tests/integration/phase-07-events.test.ts`.                                                                                |

---

## Phase 08

### Confirmed

| Issue                                                                   |   Severity | Complexity | Regression risk | Evidence                                                                                                                                                |
| ----------------------------------------------------------------------- | ---------: | ---------: | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No real font asset is declared                                          |    **Low** |     Medium |             Low | All manifest entries are textures or sound at `src/plugin-core/assets/manifest.ts:9-16`.                                                                |
| Font registry lacks focused tests                                       | **Medium** |     Medium |          Medium | Phase 08 tests do not exercise `src/plugin-core/assets/fonts.ts`.                                                                                       |
| Font release does not unregister from canvas global state               | **Medium** |       High |          Medium | Release only updates internal bookkeeping at `src/plugin-core/assets/fonts.ts:52-57`.                                                                   |
| Shrine golden-image parity is not demonstrated                          | **Medium** |       High |          Medium | Phase 08 tests cover descriptor/resolver mechanics, not rendered-image snapshots.                                                                       |
| Voice playback, volume, decode, and cleanup parity are not demonstrated |   **High** |       High |            High | Existing asset tests validate MP3 metadata, not the production playback lifecycle.                                                                      |
| Generator does not perform full media-property validation               |   **High** |     Medium |            High | `scripts/generate-assets.ts:13-29` checks descriptor shape, containment, file size, and hash, but not complete MIME/dimension/duration/font validation. |
| No stale generated-asset check exists                                   | **Medium** |     Medium |          Medium | `package.json` has `generate:assets` but no `check:assets`.                                                                                             |
| Voice consumer inventory is incomplete                                  | **Medium** |        Low |          Medium | Manifest consumer declarations omit the resolver-mediated service path.                                                                                 |
| No dedicated Phase 08 evidence document exists                          |    **Low** |        Low |             Low | Only the phase contract exists.                                                                                                                         |
| Resolver rollback parity is untested                                    | **Medium** |     Medium |          Medium | Old and new Shrine/Voice paths are not behaviorally compared.                                                                                           |
| Validated asset resolution can be bypassed                              | **Medium** |     Medium |          Medium | Voice, Shrine, and member-card paths retain environment-controlled or source-tree fallbacks.                                                            |

### Partially confirmed

Asset owner namespaces differ from event/plugin ownership, but no current contract requires one common owner syntax. This is **Partially Confirmed**, not a demonstrated defect.

---

## Phase 09

### Confirmed

| Issue                                                          |   Severity | Complexity | Regression risk | Evidence                                                                                                                                          |
| -------------------------------------------------------------- | ---------: | ---------: | --------------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Declared critical per-file coverage floors are not enforced    |   **High** |     Medium |            High | `criticalGates` exist at `tests/fixtures/phase-09-coverage-policy.json:11-18`; checker ignores them at `scripts/check-phase-09-evidence.ts:4-18`. |
| Release-matrix integration tests contain synthetic stand-ins   |   **High** |       High |            High | Local sorting and trivial promises/filters appear at `tests/integration/phase-09-release-matrix.test.ts:33-55`.                                   |
| Seven-built-in coverage is projection-oriented, not end-to-end |   **High** |       High |            High | `tests/integration/phase-09-release-matrix.test.ts:12-30` verifies IDs/projections/flags rather than operational boundaries.                      |
| Parity approval is accepted from static fixture text           |   **High** |       High |            High | `scripts/check-phase-09-parity.ts:4-12` validates status strings rather than deriving parity from executions.                                     |
| Real upgrade/data rollback rehearsal is absent                 |   **High** |       High |            High | Runtime flag switching is tested, but no executable 3.2.3 data migration and rollback is demonstrated.                                            |
| Evidence can become stale and overstate release validation     | **Medium** |     Medium |            High | Evidence records all checks passed while the current Phase 10 acceptance suite fails.                                                             |

### Other classifications

| Hypothesis                                                               | Classification                                                                                                      |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Phase 09 evidence says Phase 07 was skipped and Phase 10 had not started | **Obsolete**—the statement remains in the file but is disproven by current implementation/history.                  |
| Coverage was not rerun by the original audit                             | **Expected Transitional State**—an audit-execution limitation, not a repository defect.                             |
| Mock fidelity is wholly unproven                                         | **Partially Confirmed**—some real production-path tests exist, but release claims still depend on synthetic checks. |

---

## Phase 10

### Confirmed

| Issue                                                                                               |     Severity | Complexity | Regression risk | Evidence                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | -----------: | ---------: | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current SDK acceptance suite fails                                                                  | **Resolved H5** |     Medium |            High | `plugin-sdk:check` now passes the expanded SDK acceptance suite.                                                                                         |
| SDK harness does not process declarative `instance.events`                                          | **Resolved H5** |     Medium |            High | The harness validates ownership/capability declarations and installs declarative events before startup.                                                  |
| Harness does not enforce manifest capabilities                                                      | **Resolved H5** |       High |            High | Settings, commands, events, routes, and health permissions are denied unless declared.                                                                   |
| Harness cleanup is weaker than production lifecycle semantics                                       | **Resolved H5** |       High |            High | Registrations use exactly-once disposers, reverse cleanup, idempotent stop, and startup/factory rollback.                                                 |
| Generated project is not fully installed, checked, built, tested, and packed as one acceptance path | **Resolved H5** |       High |          Medium | Acceptance generates externally, installs packed SDK/contracts, typechecks, builds, tests, and packs the plugin.                                         |
| Custom semver support is incomplete                                                                 |   **Medium** |     Medium |            High | Deferred because dependency/compatibility upgrades are outside H5 scope.                                                                                 |
| Documentation snippets are not compiled                                                             | **Resolved H5** |     Medium |          Medium | TypeScript documentation fences compile against public SDK exports during acceptance.                                                                    |
| API-reference drift check is omitted from `plugin-sdk:check`                                        | **Resolved H5** |        Low |          Medium | `plugin-sdk:check` includes symbol-level API-reference validation.                                                                                        |
| Phase 10 evidence says SDK tests passed despite current failure                                     | **Resolved H5** |        Low |            High | The evidence statement is again supported by the expanded passing acceptance suite.                                                                      |
| Public example/template event behavior and harness behavior disagree                                | **Resolved H5** |     Medium |            High | Example and generated tests observe declarative event registration and lifecycle cleanup.                                                                |

### Other classifications

| Hypothesis                                                   | Classification                                                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Node 22/24 execution is missing                              | **Expected Transitional State**, but remains a release gate.                                                                   |
| Matrix script claims to execute all Node versions            | **False Positive**—the script only validates the current runtime against an allowed list.                                      |
| Package checks prove no public-target gaps                   | **Partially Confirmed**—external ESM import is genuinely tested, but not every export/type/asset condition.                    |
| CLI compression/`any` is itself an acceptance failure        | **Partially Confirmed**—maintainability concern, not proven functional failure.                                                |
| Inspect must redact secret-looking values under neutral keys | **Partially Confirmed**—key-based recursive redaction is implemented; broader value-pattern detection is not clearly required. |
| “No Phase 10 commit” is definitely obsolete                  | **Partially Confirmed**—Phase 10 files were included in commit `373c266`, but no cleanly scoped Phase 10 commit exists.        |

---

# 2. Architecture and ADR Findings

## Confirmed architecture issues

| Issue                                                                       |     Severity | Complexity | Regression risk | Evidence                                                                                                                                        |
| --------------------------------------------------------------------------- | -----------: | ---------: | --------------: | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration persistence violates transactional/audit/version requirements | **Critical** |       High |            High | `src/core/config/guild-settings.repository.ts:44-54`, `:85-88`; audit follows persistence at `src/core/api/module-config.endpoints.ts:150-164`. |
| Plugin capability isolation is bypassed by unrestricted container access — **resolved H4** |     **High** |  Very High |            High | Explicit frozen per-plugin grants replace the container bridge; reflective regressions reject generic resolution and token access. |
| Core event layer imports all concrete module event maps                     |     **High** |       High |            High | `src/core/event-bus/events.ts:3-52`.                                                                                                            |
| Factory-side registration rollback is incomplete — **resolved H4**          |     **High** |       High |            High | Capability registration ownership is tracked per plugin and unwound globally in reverse order on factory, publish, and lifecycle failure. |
| Legacy `ModuleLoader` ignores dependency graph validation                   |     **High** |     Medium |          Medium | `src/modules/module-loader.ts:21-52`.                                                                                                           |
| Persisted dashboard module state does not govern runtime activation         |     **High** |  Very High |            High | `src/core/api/module-config.endpoints.ts:174-215`.                                                                                              |
| Validated asset paths remain bypassable                                     |   **Medium** |     Medium |          Medium | Voice, Shrine, and member-card fallback paths bypass resolver checks.                                                                           |
| Competing architecture documents remain simultaneously normative-looking    |     **High** |     Medium |             Low | Root `ARCHITECTURE.md` describes V3; `docs/ARCHITECTURE.md` describes 3.2.3→4.0.0.                                                              |
| Source-layer dependency reversals remain                                    |     **High** |  Very High |            High | Core API → modules, core events → modules, shared commands → concrete modules, adapter → General Help internals.                                |
| Health registration is authorized as a permission                           |   **Medium** |     Medium |          Medium | Capability schema omits health; `src/plugin-core/context.ts:57` checks health IDs against permissions.                                          |

## Partially confirmed architecture issues

- **Command discovery:** deterministic and drift-checked, but hardcoded, regex-based, and not structurally single-source.
- **Manifest namespace consistency:** collision and runtime-declaration checks exist, but owner namespace and cross-section consistency are not enforced.
- **Dashboard transport contracts:** isolation is respected, but transport types are manually duplicated.
- **Dual lifecycle:** real architectural cost, but currently an **Expected Transitional State** rather than an accidental regression.

## ADR disposition

| ADR                             | Reverified status                       |
| ------------------------------- | --------------------------------------- |
| ADR-001 Module Manifest         | Partially compliant                     |
| ADR-002 Settings Metadata       | Partially compliant                     |
| ADR-003 Config Provider         | Partially compliant                     |
| ADR-004 Permission Model        | Partially compliant                     |
| ADR-005 API Convention          | Partially compliant                     |
| ADR-006 Database Configuration  | **Confirmed non-compliance**            |
| ADR-007 Plugin System/Loading   | Expected transitional overlap           |
| ADR-008 Dashboard Architecture  | Partially compliant                     |
| ADR-009 Event Convention        | **Confirmed non-compliance**            |
| ADR-010 Configuration Lifecycle | **Confirmed non-compliance**            |
| ADR-011 Plugin System           | Partially compliant                     |
| ADR-012 Configuration           | Partially compliant with high-risk gaps |
| ADR-013 Dashboard               | Partially compliant                     |
| ADR-014 Command Discovery       | Partially compliant                     |

All ADR files remain marked accepted. Supersession and precedence are not sufficiently documented.

---

# 3. Security Findings

## Confirmed

| Issue                                                                           |        Severity |  Complexity | Regression risk |
| ------------------------------------------------------------------------------- | --------------: | ----------: | --------------: |
| Cross-guild settings form-state retention                                       |    **Critical** |         Low |          Medium |
| Platform-wide logs exposed to any authenticated dashboard user — **resolved H3** |        **High** |        High |            High |
| Root dependency audit reports 6 high and 3 moderate vulnerabilities             |        **High** |        High |            High |
| Public endpoint exposes full health results                                     |      **Medium** |         Low |             Low |
| OAuth state is process-local, restart-sensitive, and not independently bounded  |      **Medium** |      Medium |          Medium |
| `expectedVersion` contract is ignored                                           | **Medium/High** |      Medium |          Medium |
| Invalid JSON, oversized bodies, and malformed URI encoding become 500 responses |      **Medium** |  Low/Medium |          Medium |
| Rate limiting omits logs, health, SSE, and several read paths                   |      **Medium** | Medium/High |            High |
| Log redaction is key-name-based and leaves message/neutral-field secrets        |      **Medium** |      Medium |            High |
| Configuration audit redaction depends entirely on correct metadata              |      **Medium** |      Medium |            High |
| Settings mutation batches lack key-count/key-length/per-value bounds            |      **Medium** |         Low |          Medium |
| Server CORS defaults are permissive when explicit options are omitted           |         **Low** |         Low |      Low/Medium |
| Deployment-specific Discord IDs and signed URLs are committed                   |         **Low** |  Low/Medium |          Medium |

## False positive

**Hardcoded credentials/secrets:** Not confirmed. Tracked source contains deployment identifiers and placeholders, but no bot token, OAuth secret, session secret, private key, database credential, or API key was identified. `.env` files are ignored.

---

# 4. Documentation and Governance Findings

## Confirmed

| Issue                                                                              |   Severity | Complexity | Regression risk | Evidence                                                                                           |
| ---------------------------------------------------------------------------------- | ---------: | ---------: | --------------: | -------------------------------------------------------------------------------------------------- |
| Project state falsely says Phase 07–10 commits do not exist                        |   **High** |        Low |             Low | `docs/PROJECT_STATE.md:13`, `:24-27`, `:75`; commits `6dc8f30`, `373c266`, and `c2b7ee5` exist.    |
| Phase 09 evidence is stale                                                         |   **High** |        Low |             Low | `docs/phases/PHASE-09-EVIDENCE.md:38`.                                                             |
| Completed phases do not identify their canonical commits                           |   **High** |        Low |             Low | Only Phase 00 complies with `docs/COMMIT_RULES.md:36`.                                             |
| Orchestrator still identifies Phase 01 as current                                  |   **High** |        Low |             Low | `docs/ORCHESTRATOR.md:15`.                                                                         |
| Roadmap calls completed phases “Upcoming”                                          | **Medium** |        Low |             Low | `docs/ROADMAP.md:28-38`.                                                                           |
| Review checklist is a pre-checked Phase 07 record, not a reusable checklist        | **Medium** |        Low |             Low | `docs/REVIEW_CHECKLIST.md:5-25`.                                                                   |
| Changelog omits historical releases and phase content                              | **Medium** |        Low |             Low | Released sections jump from Unreleased to 2.0.0 despite 3.2.x tags.                                |
| Multi-package version policy is undocumented                                       | **Medium** |     Medium |          Medium | Root 3.2.3, dashboard 3.0.0, SDK/contracts 4.0.0-next.0, example 0.1.0.                            |
| Root and `docs/` architecture/roadmap sources conflict                             |   **High** |     Medium |          Medium | Both remain present and normative-looking.                                                         |
| WebSocket documentation conflicts with SSE runtime                                 |   **High** |     Medium |          Medium | Runtime uses `EventSource`; architecture and checklist claim WebSockets.                           |
| Checked-in feature flags differ from “disabled-by-default/current behavior” claims |   **High** |     Medium |            High | `config/feature-flags.json` enables plugin core while many later platform flags remain disabled.   |
| Release workflow omits Phase 09/10 gates                                           | **Resolved H6** |     Medium |          Medium | Tagged candidates run coverage/parity, SDK acceptance, API drift, and workspace validation on Node 22/24/26 before publication. |
| Root lint/build do not cover the full workspace                                    | **Resolved H6** |     Medium |          Medium | Root build, lint, and typecheck now include maintained workspace package sources and scripts.                                  |
| Stale milestone placeholders remain                                                |    **Low** |        Low |             Low | Example: `src/core/auth/providers/oauth-state.service.ts:14-19`.                                   |
| Coverage baselines are low for security-sensitive code                             | **Medium** |       High |          Medium | Phase 09 evidence records approximately 50–60% aggregate floors.                                   |

---

# 5. Code-Quality Findings

## Confirmed

| Issue                                                                              |                Severity | Complexity | Regression risk |
| ---------------------------------------------------------------------------------- | ----------------------: | ---------: | --------------: |
| `dashboard/src/App.tsx` is a 571-line mixed-responsibility component               |                  Medium |       High |            High |
| `src/bootstrap.ts` is a 610-line composition root with hidden ordering constraints |                  Medium |       High |            High |
| Dashboard contains duplicate setting renderers/state-normalization paths           |                  Medium |     Medium |          Medium |
| Plugin and module lifecycle paths overlap                                          | High architectural cost |       High |            High |
| Multiple catalog/registry paths appear canonical simultaneously                    | High architectural cost |       High |            High |
| Configuration cache is unbounded and untimed                                       |                  Medium |     Medium |          Medium |
| One lint warning remains in public plugin contracts                                |                     Low |        Low |             Low |

Large file size alone is not a defect; the confirmed concern is the number of responsibilities and hidden coupling within those files.

---

# 6. Corrected Overall Assessment

The original audit was directionally accurate on the most serious configuration, plugin-isolation, SDK, log-authorization, documentation, and architecture issues. It overstated or misclassified several findings:

- Phase 00 incompleteness was a false positive.
- Shrine and dashboard presentation-state coverage were understated.
- Autocomplete router coverage was stronger than reported.
- Event metrics integration exists.
- Legacy/declarative event disjointness is tested.
- No hardcoded credential was found.
- Dual lifecycle and unavailable Node versions are better described as transitional states/release gates.
- The guild-state issue remains confirmed after direct component-state verification.

The repository should not be accepted as a final 4.0 baseline until the release blockers below are resolved.

---

# Remediation Roadmap

## Release Blockers

### 1. Correct cross-guild dashboard state isolation

- **Basis:** Confirmed critical tenant-isolation issue.
- **Scope:** Reset form state on guild/module/value revision, preserve dirty-state semantics deliberately, and add guild-switch/save regression coverage.
- **Complexity:** Low.
- **Regression risk:** Medium.
- **Disposition:** Resolved in Hardening Phase 1. Module forms reset values, dirty keys, validation, and save state on semantic module/settings/value revision. Unit coverage verifies dirty-state discard on loaded-value revision; integration coverage verifies a dirty guild switch followed by a save targets only the active guild. The required build, typecheck, 735-test, and lint pipeline passed on 2026-07-13; lint retained one pre-existing warning.

### 2. Scope and authorize logs by guild

- **Basis:** Confirmed platform-wide REST/SSE log disclosure.
- **Scope:** Guild-scoped endpoint/stream, server-side membership and permission checks, filtering before delivery, handling of platform-only logs.
- **Complexity:** High.
- **Regression risk:** High.
- **Disposition:** Resolved in Hardening Phase H3. Log history and live transport use canonical guild-scoped routes and the shared authorization policy for session membership plus guild permissions before querying or subscribing. Guild filtering occurs before REST filtering, pagination, cursor totals, and SSE serialization. Unattributed platform entries and other-guild entries are excluded; legacy unscoped routes expose no logs. SSE reconnects reauthorize, subscribe to exactly one guild, and clean up idempotently. Build, typecheck, 748 tests, and lint passed on 2026-07-13; lint retained one pre-existing warning.

### 3. Make configuration writes transactional and versioned

- **Basis:** Confirmed ADR-006/010/012 non-compliance.
- **Scope:** Atomic bulk write, row/version concurrency, durable audit in the same transaction, post-commit cache/event/hot-reload behavior, conflict response.
- **Complexity:** High.
- **Regression risk:** High.
- **Disposition:** Resolved in Hardening Phase H2. Guild configuration writes now lock a guild-wide version row and atomically commit all setting mutations, one version increment, and durable per-key audit records. Matching `expectedVersion` values commit; stale versions return `409 CONFLICT` without persistence or post-commit effects. Cache mutation, events, security telemetry, and hot reload use authoritative committed changes only after transaction success. Single writes and deletes use the same versioned transaction path. Build, typecheck, 738 tests, and lint passed on 2026-07-13; lint retained one pre-existing warning.

### 4. Resolve the failing Phase 10 SDK acceptance suite

- **Basis:** Current required suite fails.
- **Scope:** Align harness with declarative `instance.events`, ensure disposal and lifecycle parity, and regenerate evidence only after passing.
- **Complexity:** Medium.
- **Regression risk:** High.

### 5. Enforce SDK harness capability declarations

- **Basis:** Public harness currently permits behavior production contracts may reject.
- **Complexity:** High.
- **Regression risk:** High.

### 6. Remediate or formally disposition high-severity dependency vulnerabilities

- **Basis:** Current production audit reports six high vulnerabilities.
- **Scope:** Upgrade/remove affected Discord/media dependencies where possible; document unavoidable exceptions and exposure.
- **Complexity:** High.
- **Regression risk:** High.

### 7. Make plugin factory loading transactionally reversible

- **Basis:** Failed factory/catalog loading can leave external registrations.
- **Scope:** Collect capability disposers, unwind in reverse order, handle partial factory/resource initialization.
- **Complexity:** High.
- **Regression risk:** High.
- **Disposition:** Resolved in Hardening Phase H4. Production plugin loading now tracks every capability disposer in per-plugin scopes, wraps manual and host cleanup exactly once, unwinds registrations in global reverse order, restores registry state, and continues cleanup after disposer failures. Required and optional lifecycle failures clean partial ownership without affecting healthy plugins. All seven migrated built-ins use explicit frozen capability grants and cannot resolve arbitrary DI tokens. Build, typecheck, 755 tests, and lint passed on 2026-07-14; lint retained one pre-existing warning.

### 8. Establish honest release gates

- **Basis:** Release workflow omits required SDK, API, parity, coverage, and Node checks.
- **Scope:** Include all release-critical commands and execute supported Node versions before promotion.
- **Complexity:** Medium.
- **Regression risk:** Medium.
- **Disposition:** Resolved in Hardening Phase H6. Tagged release candidates execute the complete quality-gate set on Node 22, 24, and 26. Publication is a separate job that depends on the full matrix and alone receives content-write permission. Workflow regression tests enforce the matrix, command inventory, dependency, and workspace-validation structure. Local Node 26 validation passed; hosted Node 22/24 execution remains required before promotion.

---

## High Priority

1. **Replace unrestricted built-in DI access with explicit capability adapters — resolved H4.**  
   Explicit frozen grants now replace arbitrary container/token resolution across all seven migrated built-ins.

2. **Make dashboard module state govern actual runtime commands, events, schedulers, and lifecycle—or redefine the feature contract.**  
   Complexity: Very High; regression risk: High.

3. **Make event installation atomic and reject alias/canonical collisions.**  
   Complexity: Medium; regression risk: High.

4. **Topologically order lifecycle startup internally rather than trusting caller order.**  
   Complexity: High; regression risk: High.

5. **Remove core-to-module event aggregation and source-layer dependency reversals.**  
   Complexity: High/Very High; regression risk: High.

6. **Enforce Phase 09 critical per-file coverage gates.**  
   Complexity: Medium; regression risk: High.

7. **Replace synthetic Phase 09 release checks with production-path integration tests.**  
   Complexity: High; regression risk: High.

8. **Generate parity and upgrade/rollback evidence from executable runs rather than static approval JSON.**  
   Complexity: High; regression risk: High.

9. **Correct global command deployment projection.**  
   Complexity: Medium; regression risk: High.

10. **Perform full build-time asset validation and add Voice playback/cleanup parity tests.**  
    Complexity: Medium/High; regression risk: High.

11. **Correct project-state, phase-evidence, architecture, roadmap, and commit-history claims before declaring a baseline.**  
    Complexity: Low/Medium; regression risk: Low.

---

## Medium Priority

1. Replace regex/hardcoded command discovery with explicit declaration-driven discovery.
2. Validate command permission actions against the authoritative permission registry.
3. Add a complete Phase 06 rollback integration test.
4. Reconcile event inventory with declarations and strengthen permutation/cycle tests.
5. Implement cache TTL/cardinality controls.
6. Either implement database `watch()` semantics or remove the misleading contract.
7. Correct malformed request handling to return 400/413 rather than 500.
8. Add settings batch/key/value bounds.
9. Expand rate limiting to logs, SSE, health, and expensive read paths.
10. Harden log and configuration-audit redaction.
11. Separate public liveness from authenticated readiness details.
12. Add full generated-plugin install/typecheck/test/build/check/pack acceptance.
13. Compile SDK documentation examples.
14. Include SDK API drift checking in the default SDK acceptance command.
15. Add stale generated-asset validation.
16. Add Shrine visual parity and resolver rollback parity tests.
17. Add dedicated migration acceptance coverage for all seven built-ins.
18. Generate or share dashboard transport contracts.
19. Document or replace the SDK’s restricted custom semver grammar.
20. Reconcile WebSocket documentation with the actual SSE transport.

---

## Low Priority

1. Remove the explicit `any` lint warning.
2. Add dedicated Phase 06 and Phase 08 evidence documents.
3. Add a real font asset and tests, or explicitly mark font migration not applicable.
4. Clarify Metrics’ status relative to the seven plugin migrations.
5. Document the multi-package version policy.
6. Replace stale milestone comments.
7. Make CORS defaults fail closed even outside normal bootstrap.
8. Move deployment-specific IDs and signed media URLs into deployment configuration.
9. Improve Phase 01 test-to-matrix traceability.
10. Correct legacy/migration order terminology.

---

## Nice to Have

1. Split dashboard routing, data loading, SSE, settings state, and diagnostics into focused units.
2. Split bootstrap into independently tested composition factories.
3. Consolidate duplicate dashboard setting renderers and normalization logic.
4. Raise aggregate coverage floors incrementally after per-file gates are operational.
5. Standardize phase evidence format and canonical completion-commit recording.
6. Mark obsolete root architecture/roadmap documents as historical or archive them under an explicit supersession policy.
7. Improve font lifecycle documentation where global canvas unregistering is unavailable.
8. Add more exhaustive command/event catalog permutation tests.
