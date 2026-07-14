# Orchestrator

## Mission

Deliver the 3.2.3-to-4.0.0 plan in reversible phases while preserving compatibility, security, deterministic behavior, and the contracts in [ARCHITECTURE](ARCHITECTURE.md), [ROADMAP](ROADMAP.md), and accepted ADRs.

## Startup Sequence

Read in this exact order before changing files:

1. [PROJECT_STATE](PROJECT_STATE.md)
2. [ORCHESTRATOR](ORCHESTRATOR.md)
3. [ARCHITECTURE](ARCHITECTURE.md)
4. Every ADR relevant to the current work, beginning with [ADR-011](adr/ADR-011-Plugin-System.md), [ADR-012](adr/ADR-012-Configuration.md), [ADR-013](adr/ADR-013-Dashboard.md), and [ADR-014](adr/ADR-014-Command-Discovery.md) as applicable
5. The current phase, release phase, or promotion gate identified by `PROJECT_STATE`; when a dedicated phase document exists, read it before implementation

Then inspect git status/diff, package scripts, affected implementation, neighboring tests, and repository conventions.

## Workflow

Use exactly: **Read → Plan → Implement → Test → Fix → Retest → Update docs → Commit → Repeat**.

“Commit” is conditional: commit only when explicitly authorized by a human or an explicit session policy. Otherwise stop with validated, commit-ready changes and report that no commit was created.

## Stopping Conditions

### When to Stop Automatically

Stop when the scoped deliverable and current phase acceptance criteria are satisfied, Build → Typecheck → Tests → Lint passes, required documentation and [PROJECT_STATE](PROJECT_STATE.md) are current, rollback is documented, and changes are commit-ready or an authorized commit is complete. Stop immediately without proceeding on an unsafe or destructive request, detected secret, overlapping unrelated dirty-file conflict, unclear phase boundary, ADR conflict, unavailable required validation, repeated unexplained failure, or work outside the approved phase. Report the stopping reason and preserve the last validated state.

### When to Ask for Human Input

Ask before resolving ambiguous product behavior, changing architecture or an accepted ADR, expanding phase scope, modifying acceptance criteria, accepting any failing or skipped check, choosing a breaking migration, altering compatibility, touching overlapping unrelated work, or performing a human approval gate. Ask when required evidence cannot be obtained from repository code, tests, docs, or current state. Do not ask for routine implementation choices resolved by those sources.

## Human Approval Gates

Human approval is mandatory before:

- changing or superseding an ADR, architecture contract, phase scope, or acceptance criterion;
- breaking API, command, setting, database, identifier, dashboard-route, or persisted-data compatibility;
- deleting data, running shared/production migrations, deploying commands, publishing, releasing, or changing credentials;
- adding dependencies, weakening security controls, or introducing plugin-specific dashboard/core branches;
- modifying unrelated files or proceeding despite unrelated dirty changes that overlap the task;
- committing, amending, rebasing, merging, pushing, or opening a PR unless the human/session policy explicitly authorizes that action.

## Validation Pipeline

Run in this requested order and fix failures before continuing:

1. **Build:** `npm run build`
2. **Typecheck:** `npm run typecheck`
3. **Tests:** `npm test`
4. **Lint:** `npm run lint`
5. **Docs update:** verify links, phase/state accuracy, ADR references, and update [PROJECT_STATE](PROJECT_STATE.md) when state changed

After any fix, rerun the failed stage and every later stage; after cross-cutting fixes, rerun the full pipeline.

## Commit Policy

Follow [COMMIT_RULES](COMMIT_RULES.md). Agents have no implicit permission to commit. An explicit human instruction or session policy may authorize commits; absent authorization, leave a cleanly scoped, validated diff ready for commit. Never bypass hooks, conceal failures, amend without authorization, or combine unrelated work.

## Forbidden Actions

Never skip a phase, ignore an ADR, modify unrelated files, leave validation failures, expose secrets, deploy commands during discovery/startup, weaken dashboard authentication/CSRF/authorization/guild isolation, perform destructive git operations, or claim completion while required checks are unrun. Follow [CODING_RULES](CODING_RULES.md) and complete [REVIEW_CHECKLIST](REVIEW_CHECKLIST.md).
