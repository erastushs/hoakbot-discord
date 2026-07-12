# Review Checklist

Every item is mandatory unless explicitly marked not applicable with a reason.

- [x] **Phase:** Work matches [Phase 10](phases/PHASE-10-PLUGIN-SDK.md), its approved scope, deliverables, acceptance criteria, testing, and rollback plan; Phase 07 remains explicitly skipped and incomplete.
- [x] **Acceptance criteria:** Phase 10 criteria are covered by canonical runtime/SDK schema identity, exact reviewed exports, safe atomic generation with overwrite refusal, generated and example consumer builds/tests, static malformed/incompatible/collision validation without factory execution, recursively redacted inspection, bounded fixed-stage preflight, export/asset/integrity package checks, compiled documentation workflow, ESM compatibility declaration, and prerelease rollback evidence documented in [Phase 10 evidence](phases/PHASE-10-EVIDENCE.md).
- [x] **Architecture and ADRs:** Architecture is unchanged unless the phase requires a change and a human approved it; changes comply with [ARCHITECTURE](ARCHITECTURE.md) and relevant [ADR-011](adr/ADR-011-Plugin-System.md), [ADR-012](adr/ADR-012-Configuration.md), [ADR-013](adr/ADR-013-Dashboard.md), and [ADR-014](adr/ADR-014-Command-Discovery.md).
- [x] **Correctness:** Success, empty, denied, missing-data, boundary, and failure paths are correct and deterministic.
- [x] **Compatibility:** Existing commands, permissions, settings, IDs, database data, API envelopes/routes, dashboard behavior, and module compatibility remain intact unless approved.
- [x] **Types and boundaries:** Strict TypeScript passes; ESM `.js` imports are correct; unknown external data is validated with Zod.
- [x] **DI and lifecycle:** Dependencies/capabilities are injected; ownership, startup, cleanup, and shutdown are deterministic and tested.
- [x] **Tests:** New/changed behavior has focused Vitest regression coverage; snapshots were semantically reviewed; mocks do not hide integration failures.
- [x] **Discord and assets:** Embed limits, mentions, sanitization, visibility, Unicode truncation, canvas bounds, asset validation, and fallbacks are tested.
- [x] **Dashboard security:** OAuth session, CSRF, authorization, guild isolation, CORS, rate limits, audit, envelopes, and WebSocket authentication are preserved.
- [x] **Security:** No secrets, unsafe logs, traversal, injection, executable metadata, privilege expansion, or unbounded attacker-controlled work was introduced.
- [x] **Performance:** No unbounded collections/concurrency/retries, repeated scans, N+1 queries, blocking I/O, or unjustified rendering cost was introduced.
- [x] **Maintainability:** No duplicated code was introduced; shared behavior uses an existing or justified narrowly scoped primitive.
- [x] **Configuration and constants:** No hardcoded configuration or magic numbers were introduced; environment-specific values are validated configuration and domain limits are named constants.
- [x] **Scope:** Diff contains only task-related files; unrelated dirty files are untouched; dependency/generated-file changes are justified.
- [x] **Validation:** Phase 10 SDK API generation/check, SDK typecheck/build/tests, example consumer build/tests, CLI acceptance tests, repository build/typecheck/tests/lint, and Node matrix declaration passed; Node 26 executed locally, while declared executable Node 22/24 matrix entries were unavailable locally.
- [x] **Documentation/state:** Documentation is updated; links resolve; [ROADMAP](ROADMAP.md), [PROJECT_STATE](PROJECT_STATE.md), phase docs, ADRs, and changelog reflect every applicable trigger.
- [x] **Rollback:** The active phase or change documents a specific, feasible rollback, and implementation changes remain reversible as described.
- [x] **Commit readiness:** Message follows [COMMIT_RULES](COMMIT_RULES.md); commit occurs only with explicit authorization.
- [x] **Orchestration:** [ORCHESTRATOR](ORCHESTRATOR.md) stopping conditions and approval gates were honored; no failure was ignored or left behind.
- [x] **Coding rules:** The complete [CODING_RULES](CODING_RULES.md) review section and applicable domain rules were satisfied.
