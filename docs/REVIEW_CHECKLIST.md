# Review Checklist

Every item is mandatory unless explicitly marked not applicable with a reason.

- [ ] **Phase:** Work matches the active [phase](phases/PHASE-01-UX-POLISH.md), its scope, deliverables, acceptance criteria, testing, and rollback plan; no later phase was started.
- [ ] **Acceptance criteria:** Every acceptance criterion in the active phase is demonstrably satisfied.
- [ ] **Architecture and ADRs:** Architecture is unchanged unless the phase requires a change and a human approved it; changes comply with [ARCHITECTURE](ARCHITECTURE.md) and relevant [ADR-011](adr/ADR-011-Plugin-System.md), [ADR-012](adr/ADR-012-Configuration.md), [ADR-013](adr/ADR-013-Dashboard.md), and [ADR-014](adr/ADR-014-Command-Discovery.md).
- [ ] **Correctness:** Success, empty, denied, missing-data, boundary, and failure paths are correct and deterministic.
- [ ] **Compatibility:** Existing commands, permissions, settings, IDs, database data, API envelopes/routes, dashboard behavior, and module compatibility remain intact unless approved.
- [ ] **Types and boundaries:** Strict TypeScript passes; ESM `.js` imports are correct; unknown external data is validated with Zod.
- [ ] **DI and lifecycle:** Dependencies/capabilities are injected; ownership, startup, cleanup, and shutdown are deterministic and tested.
- [ ] **Tests:** New/changed behavior has focused Vitest regression coverage; snapshots were semantically reviewed; mocks do not hide integration failures.
- [ ] **Discord and assets:** Embed limits, mentions, sanitization, visibility, Unicode truncation, canvas bounds, asset validation, and fallbacks are tested.
- [ ] **Dashboard security:** OAuth session, CSRF, authorization, guild isolation, CORS, rate limits, audit, envelopes, and WebSocket authentication are preserved.
- [ ] **Security:** No secrets, unsafe logs, traversal, injection, executable metadata, privilege expansion, or unbounded attacker-controlled work was introduced.
- [ ] **Performance:** No unbounded collections/concurrency/retries, repeated scans, N+1 queries, blocking I/O, or unjustified rendering cost was introduced.
- [ ] **Maintainability:** No duplicated code was introduced; shared behavior uses an existing or justified narrowly scoped primitive.
- [ ] **Configuration and constants:** No hardcoded configuration or magic numbers were introduced; environment-specific values are validated configuration and domain limits are named constants.
- [ ] **Scope:** Diff contains only task-related files; unrelated dirty files are untouched; dependency/generated-file changes are justified.
- [ ] **Validation:** Build (`npm run build`), typecheck (`npm run typecheck`), tests (`npm test`), and lint (`npm run lint`) all pass in that order after final code changes.
- [ ] **Documentation/state:** Documentation is updated; links resolve; [ROADMAP](ROADMAP.md), [PROJECT_STATE](PROJECT_STATE.md), phase docs, ADRs, and changelog reflect every applicable trigger.
- [ ] **Rollback:** The active phase or change documents a specific, feasible rollback, and implementation changes remain reversible as described.
- [ ] **Commit readiness:** Message follows [COMMIT_RULES](COMMIT_RULES.md); commit occurs only with explicit authorization.
- [ ] **Orchestration:** [ORCHESTRATOR](ORCHESTRATOR.md) stopping conditions and approval gates were honored; no failure was ignored or left behind.
- [ ] **Coding rules:** The complete [CODING_RULES](CODING_RULES.md) review section and applicable domain rules were satisfied.
