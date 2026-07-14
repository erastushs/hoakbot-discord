# Review Checklist

Every item is mandatory unless explicitly marked not applicable with a reason.

- [ ] **Scope:** Work matches the authorized phase or task, and the diff contains only related files.
- [ ] **Architecture and ADRs:** Changes comply with [ARCHITECTURE](ARCHITECTURE.md), active ADRs under [docs/adr](adr/ADR-011-Plugin-System.md), and any relevant phase document.
- [ ] **Documentation authority:** Active references point to [ARCHITECTURE](ARCHITECTURE.md), [ROADMAP](ROADMAP.md), [PROJECT_STATE](PROJECT_STATE.md), and ADR-011 through ADR-014; archived legacy documents are historical only.
- [ ] **Compatibility:** Existing commands, permissions, settings, IDs, database data, API envelopes/routes, dashboard behavior, and module compatibility remain intact unless explicitly approved.
- [ ] **Security:** OAuth sessions, CSRF, authorization, guild isolation, CORS, rate limits, audit, response envelopes, authenticated SSE live updates, secret handling, traversal protections, injection defenses, and privilege boundaries are preserved.
- [ ] **Types and boundaries:** Strict TypeScript passes; ESM `.js` imports are correct; unknown external data is validated with Zod.
- [ ] **DI and lifecycle:** Dependencies/capabilities are injected; ownership, startup, cleanup, rollback, and shutdown are deterministic and tested.
- [ ] **Tests:** New or changed behavior has focused regression coverage; snapshots were semantically reviewed; mocks do not hide integration failures.
- [ ] **Discord and assets:** Embed limits, mentions, sanitization, visibility, Unicode truncation, canvas bounds, asset validation, and fallbacks are preserved.
- [ ] **Dashboard:** The dashboard remains API-only and metadata-driven, without bot/plugin runtime imports or plugin-ID conditionals.
- [ ] **Performance:** No unbounded collections/concurrency/retries, repeated scans, N+1 queries, blocking I/O, or unjustified rendering cost was introduced.
- [ ] **Configuration and constants:** No hardcoded environment-specific values or unexplained magic constants were introduced; feature flags are documented as rollout/rollback controls.
- [ ] **Validation:** Required build, typecheck, tests, lint, release gates, and any phase-specific checks passed or any unavailable hosted checks are explicitly recorded as blockers.
- [ ] **Documentation/state:** [ROADMAP](ROADMAP.md), [PROJECT_STATE](PROJECT_STATE.md), phase docs, ADRs, audit review, and changelog reflect every applicable trigger.
- [ ] **Rollback:** The active phase or change documents a specific, feasible rollback, and implementation changes remain reversible as described.
- [ ] **Commit readiness:** Message follows [COMMIT_RULES](COMMIT_RULES.md); commit occurs only with explicit authorization.
- [ ] **Orchestration:** [ORCHESTRATOR](ORCHESTRATOR.md) stopping conditions and approval gates were honored; no failure was ignored or left behind.
