# Phase 09 — Testing Evidence

## Integration Matrix

| Area | Evidence |
| --- | --- |
| Plugin harness and shared fixtures | Credential-free `TestPluginHost` lifecycle, scoped registries, deterministic cleanup accounting, typed Discord/config/database/cache/event/clock/logger/asset fixtures, and failure injection are self-tested against production contracts. |
| Built-ins and compatibility | General, Logging, Welcome, Goodbye, Voice, Moderation, and Shrine are checked through the generated catalog, legacy projections, 4.0 cutover selection, and independent rollback flags. |
| Lifecycle and events | Dependency start/stop order, event priority, injected startup failure, lifecycle timeout, cleanup rollback, leak assertions, and idempotent PM2-style shutdown are covered. |
| Commands, config, and assets | 3.2.3 command fixtures, permissions, bounded autocomplete behavior, guild-isolated config, concurrent hot reload behavior, and corrupted asset rejection are covered. |
| Security and boundaries | Undeclared capability denial, guild isolation, credential-free operation, and lifecycle, commands, events, config, API, dashboard, and asset boundary projections are covered. |
| Upgrade and rollback | Stable 3.2.3 and 4.0 parity corpora verify preserved commands, data, API, dashboard behavior, plugin order, and independent built-in rollback selection. |

## Coverage Policy and Report

Coverage uses V8 and emits text plus machine-readable JSON reports under `artifacts/coverage/root` and `artifacts/coverage/dashboard`. Generated reports are ignored by Git. The policy is an absolute, zero-tolerance no-regression gate based on the measured Phase 09 baseline; it is not a claim of complete coverage.

| Layer | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Root | 58.55% | 54.61% | 63.62% | 60.55% |
| Dashboard | 53.82% | 49.93% | 57.09% | 56.56% |

Critical branch floors are plugin core 73.29%, lifecycle 80.76%, config 60.90%, security API 64.64%, and built-in projection 70.00%. Reviewed exclusions are type-only `src/**/*.interface.ts`, root ambient/generated declarations `src/**/*.d.ts`, and dashboard ambient declarations `dashboard/src/**/*.d.ts`, because they emit no executable behavior. The executable policy and artifact list are recorded in `tests/fixtures/phase-09-coverage-policy.json`; `scripts/check-phase-09-evidence.ts` rejects root or dashboard regression below the measured totals.

## Release Checklist

- [x] Production build passed.
- [x] Typecheck passed after the build.
- [x] Full test suite passed after typecheck.
- [x] Lint passed after tests.
- [x] Root and dashboard coverage plus evidence/parity checks passed.
- [x] Harness and shared fixtures passed production-contract self-tests without network, database, or Discord credentials.
- [x] All seven built-ins passed integration, cutover parity, and independent rollback checks.
- [x] Failure cleanup, timeout, leak, security, guild-isolation, corrupted-asset, and PM2-style shutdown scenarios passed.
- [x] 3.2.3 upgrade and rollback evidence preserves commands, data, API, dashboard behavior, and plugin order.
- [x] No flaky release blocker was observed in the required validation run.

No Phase 09-only commit has been created. Later phases are complete in repository state: Phase 07 evidence is recorded in [PHASE-07-EVIDENCE](PHASE-07-EVIDENCE.md), and Phase 10 evidence is recorded in [PHASE-10-EVIDENCE](PHASE-10-EVIDENCE.md). Hosted Node 22/24/26 release-matrix execution remains the promotion gate tracked in [PROJECT_STATE](../PROJECT_STATE.md).
