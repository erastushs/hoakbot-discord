# Coding Rules

These rules implement [ARCHITECTURE](ARCHITECTURE.md), accepted [ADRs](adr/ADR-011-Plugin-System.md), and the active phase identified by [PROJECT_STATE](PROJECT_STATE.md). Review every change with [REVIEW_CHECKLIST](REVIEW_CHECKLIST.md).

## TypeScript Style

- Keep strict TypeScript enabled; do not introduce `any`, unchecked casts, non-null assertions, or suppressed diagnostics unless a localized boundary exception is justified and reviewed.
- Use ESM syntax and `.js` extensions in relative TypeScript imports that execute as emitted JavaScript.
- Export explicit public types, keep implementation details private, and narrow `unknown` only after validation.
- Prefer immutable data and explicit return types for public contracts and lifecycle methods.

## Naming Convention

- Use `Plugin*` for new platform contracts; retain existing `Module*` names only on 4.0 compatibility surfaces.
- Keep built-in IDs in `hoak:<name>` form and settings, commands, events, permissions, migrations, and assets lowercase and namespaced.
- Name classes and types in PascalCase, functions and variables in camelCase, constants in UPPER_SNAKE_CASE only when truly immutable, and files according to neighboring repository conventions.
- Names must describe domain behavior; prohibit placeholders such as `data`, `thing`, `util`, or `manager` when a precise domain name exists.

## Folder Structure

- Keep platform services in `src/core`, Discord adapters in `src/adapters`, compatibility built-ins in `src/modules`, dashboard code in `dashboard`, and documentation in `docs`.
- Keep plugin-owned code and assets within that plugin's directory/package; do not import plugin internals across ownership boundaries.
- Do not move public paths or create new top-level directories without phase scope and human approval.
- Place tests and shared utilities according to existing neighboring patterns; do not create duplicate utility locations.

## Dependency Injection

- Inject services through constructors or explicit capability contexts; do not import mutable singletons from feature code.
- Depend on interfaces and public contracts, never another plugin's implementation.
- Grant plugins only declared capabilities; never expose the unrestricted DI container.
- Make resource ownership explicit and clean up partial initialization and subscriptions.

## Plugin Architecture

- Use static manifests/catalogs, Zod validation, deterministic registration, dependency-first startup, and reverse-order shutdown.
- Reject missing or incompatible dependencies, cycles, and duplicate IDs, commands, settings, events, or assets before readiness.
- Preserve `hoak:<name>`, module storage, APIs, routes, identifiers, and built-in behavior during compatibility migration.
- Never recursively scan arbitrary runtime directories, deploy commands during discovery/startup, or add plugin-name branches to core/dashboard code.

## Logging

- Use the injected Pino logger with structured fields; prohibit `console` in production paths.
- Include stable event/component identifiers and actionable context; pass errors through the logger's supported error field.
- Never log tokens, cookies, OAuth data, authorization headers, secrets, private configuration, or unnecessary user content.
- Use structured fields rather than concatenating variable data into messages.

## Error Handling

- Use typed domain errors or existing error classes; preserve original causes when translating errors at boundaries.
- Fail startup for required invalid plugins and clean up partial initialization; report optional/runtime failures through existing health and logging paths.
- Return safe, stable API or Discord errors without stack traces, secrets, internal paths, or raw database details.
- Never swallow exceptions. Handle, translate, retry with an explicit bound, or propagate them to the owning lifecycle boundary.

## Configuration

- Validate environment, API, manifest, command, event, setting, and persistence inputs with existing Zod schemas.
- Preserve cache → database → manifest-default reads and authorized, guild-scoped, transactional, audited writes.
- Namespace plugin settings and define defaults in validated metadata; prohibit hardcoded environment-specific values and secrets in source, manifests, or dashboard metadata.
- Replace unexplained numeric/string literals with named constants or validated configuration; do not silently coerce invalid values or change established defaults.

## Testing

- Use Vitest and existing test utilities; follow the established suite placement and naming pattern.
- Cover success, empty, denied, missing-data, malformed-input, limits, Unicode, and failure behavior where applicable.
- Control clocks, randomness, network, Discord, database, and canvas boundaries so tests remain deterministic.
- Add contract/regression tests with behavior changes; inspect snapshot semantics before accepting updates.

## Documentation

- Update [PROJECT_STATE](PROJECT_STATE.md) whenever phase, objective, blockers, issues, TODOs, next task, references, or recent files materially change.
- Update [ROADMAP](ROADMAP.md), phase documents, ADRs, and changelog only under the triggers in [COMMIT_RULES](COMMIT_RULES.md).
- Keep relative links valid, terminology/version claims consistent, acceptance criteria explicit, and rollback instructions executable.
- Documentation does not authorize implementation, commit, migration, deployment, or release actions.

## Dashboard

- Keep the React dashboard API-only and metadata-driven; never import bot/plugin runtime code or add plugin-ID conditionals.
- Preserve OAuth sessions, CSRF, authorization, guild isolation, CORS, rate limiting, audit, response envelopes, and authenticated guild-scoped SSE live updates.
- Render untrusted content as text; prohibit raw HTML and plugin-provided executable UI.
- Enforce authorization server-side; hidden client controls are not access control.

## Canvas

- Resolve assets through validated deterministic local mappings owned by the feature/plugin; reject traversal and arbitrary remote/runtime paths.
- Bound dimensions, decoded input size, text length, rendering time, and memory work before processing.
- Test missing/corrupt asset fallbacks and use deterministic fixtures for snapshots.
- Keep dashboard assets separate from bot/plugin canvas assets and avoid repeated font/image decoding.

## Discord Embeds

- Enforce Discord limits before submission; truncate on safe Unicode boundaries while retaining audit-critical fields.
- Sanitize user-controlled text, disable unintended mentions, and preserve permissions and ephemeral/public visibility.
- Make field order, timestamps, identity, colors, footer/image behavior, and empty/error variants intentional and tested.
- During presentation-only work, do not alter command names, options, deployment scope, or permission semantics.

## Performance

- Prohibit repeated registry scans, N+1 database queries, unbounded caches/collections, blocking I/O, and repeated canvas/font decoding.
- Bound concurrency, retries, timeouts, payload sizes, queues, and retained state with named limits.
- Measure before optimizing and add a regression test or benchmark for performance-sensitive changes.
- Reuse validated registries and shared primitives rather than duplicating computation.

## Security

- Apply least privilege, boundary validation, safe error responses, and fail-closed authorization.
- Never commit secrets, weaken cryptography, execute plugin metadata, interpolate untrusted SQL, or trust client-supplied guild/user identity.
- Preserve auditing for configuration, enable/disable, moderation, and administrative actions.
- Treat external plugins as administrator-trusted supply-chain code, not as a secure sandbox.

## Refactoring Principles

- Refactor only within phase scope and with characterization tests preserving behavior.
- Prefer small reversible changes; do not combine renames, behavior changes, and migrations unless inseparable.
- Remove duplicated code through an existing or narrowly scoped shared primitive only after identical behavior is demonstrated.
- Do not introduce abstractions that erase feature contracts, alter architecture without requirement, or create speculative extension points.

## Code Review Expectations

- Compare the diff against phase requirements, acceptance criteria, ADRs, compatibility guarantees, rollback plan, and [PROJECT_STATE](PROJECT_STATE.md).
- Require Build → Typecheck → Tests → Lint and accurate documentation before approval.
- Reject unrelated edits, duplicated code, hardcoded configuration, magic numbers, hidden behavior changes, unvalidated boundaries, security regressions, and undocumented rollback impact.
- Apply [COMMIT_RULES](COMMIT_RULES.md); code quality never grants autonomous commit permission.
