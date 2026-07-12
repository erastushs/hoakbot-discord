# Commit Rules

Follow the workflow in [ORCHESTRATOR](ORCHESTRATOR.md). These rules define commit quality, not permission: no agent may commit without explicit human authorization or explicit session policy.

## Format

`<prefix>(<scope>): <imperative summary>`

Scope is mandatory, lowercase, specific, and hyphenated when needed. Summary is imperative, starts lowercase, has no trailing period, and describes one outcome.

## Allowed Prefixes

Exactly: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, `revert`.

## Required Rules

- Make each commit atomic, buildable, reviewable, and limited to one approved concern.
- Stage only intended files after reviewing `git status` and the complete staged diff.
- Run the required validation pipeline before committing; record any explicitly approved exception honestly.
- Preserve tests with behavior changes and documentation with contract/state changes.
- Use a body when rationale, migration, compatibility, security, rollback, or issue context is not evident from the summary.
- Mark breaking changes only when explicitly approved, using a `BREAKING CHANGE:` footer and migration instructions.

## Forbidden Rules

- Do not commit without explicit authorization; do not infer permission from task completion.
- Do not use unlisted prefixes, omit scope, use vague summaries, or bundle unrelated edits.
- Do not commit secrets, generated noise, local configuration, debug output, or failing work.
- Do not bypass hooks, amend, force-push, rewrite history, or create empty commits unless separately authorized.
- Do not claim tests passed when they were skipped or failed.

## Documentation Update Triggers

- **CHANGELOG:** update for user-visible behavior, fixes, compatibility changes, deprecations, security-relevant changes, and release content when the repository's release process requires it.
- **ROADMAP:** update when phase ordering, milestone scope, target outcomes, success metrics, or official current phase changes.
- **PROJECT_STATE:** update whenever current phase/objective, completed phases, blockers, known issues, TODOs, next task, relevant references, or recently changed files materially change. Phase completion must identify its commit.

Keep these documents consistent with [ARCHITECTURE](ARCHITECTURE.md), the relevant [phase](phases/PHASE-01-UX-POLISH.md), and accepted [ADRs](adr/ADR-011-Plugin-System.md).

## Good Examples

- `docs(governance): define phase execution rules`
- `feat(help): polish permission-filtered command embeds`
- `fix(canvas): bound member-card text rendering`
- `test(welcome): cover missing-channel fallback`
- `refactor(logging): inject embed presentation builder`

## Bad Examples

- `updated files` — no prefix, scope, or imperative outcome.
- `feat: improvements` — missing scope and vague summary.
- `feature(help): Added new help.` — prefix is not allowed, not imperative, capitalization, trailing period.
- `fix(all): fix bugs and refactor dashboard` — vague scope and unrelated concerns.
- `chore(release): commit secrets` — forbidden content regardless of format.

Before approval, complete [REVIEW_CHECKLIST](REVIEW_CHECKLIST.md) and obey [CODING_RULES](CODING_RULES.md).
