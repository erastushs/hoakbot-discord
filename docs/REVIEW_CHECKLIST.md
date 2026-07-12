# Review Checklist

Every item is mandatory unless explicitly marked not applicable with a reason.

- [x] **Phase:** Work matches [Phase 02](phases/PHASE-02-PLUGIN-CORE.md), its scope, deliverables, acceptance criteria, testing, and rollback plan; Phase 03 and later helper APIs were not started.
- [x] **Acceptance criteria:** Phase 02 criteria are covered by `tests/unit/plugin-core.test.ts`, `tests/unit/built-in-plugin-catalog.test.ts`, and `tests/unit/module-index.test.ts`: no factory on invalid catalog; deterministic dependency order/path diagnostics; complete collision rejection; atomic immutable/concurrency-safe registry snapshots; scoped context denial and redaction; lifecycle timeout/abort/cleanup/reverse/repeated-stop traces; 3.2.3 projections; and disabled-flag legacy rollback.
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
- [x] **Validation:** Build (`npm run build`), typecheck (`npm run typecheck`), tests (`npm test`), and lint (`npm run lint`) all pass in that order after final code changes.
- [x] **Documentation/state:** Documentation is updated; links resolve; [ROADMAP](ROADMAP.md), [PROJECT_STATE](PROJECT_STATE.md), phase docs, ADRs, and changelog reflect every applicable trigger.
- [x] **Rollback:** The active phase or change documents a specific, feasible rollback, and implementation changes remain reversible as described.
- [x] **Commit readiness:** Message follows [COMMIT_RULES](COMMIT_RULES.md); commit occurs only with explicit authorization.
- [x] **Orchestration:** [ORCHESTRATOR](ORCHESTRATOR.md) stopping conditions and approval gates were honored; no failure was ignored or left behind.
- [x] **Coding rules:** The complete [CODING_RULES](CODING_RULES.md) review section and applicable domain rules were satisfied.
