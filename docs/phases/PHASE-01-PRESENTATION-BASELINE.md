# Phase 01 — UX Presentation Baseline

This document is the approved 3.2.3 presentation baseline and regression index for Phase 01. Approval means implementation and tests may use the shared primitives listed below; it does not authorize command, permission, setting, API, authentication, routing, moderation-policy, or plugin-contract changes.

## Surface inventory and approved presentation matrix

| Surface | Source | Inputs and preserved behavior | Applicable golden variants | Approved presentation |
| --- | --- | --- | --- | --- |
| Help | `src/modules/general/commands/help.command.ts` | registry, caller permissions; filtering and visibility unchanged | success, empty, denied | primary embed; grouped commands; safe field limits |
| Bot Info | `src/modules/general/commands/botinfo.command.ts` | client/config/module state; no added private data | success, missing client data | primary embed; ordered status fields; timestamp/footer |
| Server Info | `src/modules/general/commands/serverinfo.command.ts` | interaction guild and counts; guild-only behavior unchanged | success, missing guild, boundary text | primary embed; escaped/truncated text; thumbnail |
| User Info | `src/modules/general/commands/userinfo.command.ts` | selected/current member; privacy boundary unchanged | success, missing member | primary embed; ordered identity fields; thumbnail |
| Avatar | `src/modules/general/commands/avatar.command.ts` | selected/current user; visibility unchanged | success, missing user | primary embed with image and safe identity text |
| Ping | `src/modules/general/commands/ping.command.ts` | interaction and websocket latency; latency semantics unchanged | success, unavailable latency, failure | status embed; deterministic labels and color |
| Welcome | `src/modules/welcome/services/welcome.service.ts` | per-guild enabled/channel/templates/image | success, disabled, missing channel/config, image/send failure, Unicode/mentions | configured delivery; template card; image fallback; no extra ping content |
| Goodbye | `src/modules/goodbye/services/goodbye.service.ts` | per-guild enabled/channel/templates/image | success, bot/disabled, missing channel/config, image/send failure, runtime config | configured delivery; template card; attachment-only output; no extra ping content |
| Shrine | `src/modules/shrine/services/shrine.service.ts` and canvas renderers | command data, assets, renderer | success, empty/missing data, render failure/fallback, boundary/Unicode | deterministic image where available; safe embed fallback |
| Moderation embeds | `src/modules/logging/services/moderation-log.service.ts` | authorized moderation events and configured log channel | kick, ban, timeout, warn/remove/clear, missing reason/channel/guild, disabled, unsupported, send failure, boundaries | action color/title; moderator/target identity; reason/action context; timestamp/footer |
| Message logs | `src/modules/logging/services/message-log.service.ts` | delete/edit/bulk events, audit lookup, attachments | content/empty, edit, bulk known/unknown actor, archive outcomes, disabled/missing channel, failure, boundaries | event hierarchy; author/channel/message context; safe content and attachment summaries; timestamp/footer |
| Member/voice logs | corresponding services under `src/modules/logging/services` | Discord events and configured channels | each selected event, missing/disabled channel, send failure | event identity/context; timestamp/footer; safe fields |
| Dashboard presentation | `dashboard/src` metadata-driven pages/components | authenticated, authorized, guild-scoped API contracts unchanged | loading, empty, error, populated, validation | semantic headings/landmarks; programmatic labels/descriptions/errors; keyboard focus; status text not color-only; no secret/session rendering |

## Shared primitive approval

`EmbedFactory`, `Response`, and `discord-content` are approved only for identical Discord limit enforcement, Unicode-safe truncation, user-content escaping, and standard embed hierarchy. Feature wording, colors, fields, event selection, visibility, and delivery remain local. This duplication is demonstrated across all command, lifecycle, moderation, and logging rows above.

## Golden fixtures and regression map

Golden fixtures are executable semantic assertions rather than serialized Discord internals. They live in:

- `tests/unit/general-presentation.test.ts` and `tests/unit/embed-content.test.ts` for command hierarchy, Discord limits, Unicode, and mention escaping.
- Existing command tests for Help, Bot Info, Server Info, User Info, Avatar, and Ping behavior/visibility.
- `tests/unit/welcome-service.test.ts` and `tests/unit/goodbye-service.test.ts` for configured dispatch, suppression, runtime settings, templates, image output/fallback, and failures.
- `tests/unit/shrine-service.test.ts` and deterministic canvas tests for render/fallback behavior.
- `tests/unit/moderation-log-service.test.ts`, `message-log-service.test.ts`, `member-log-service.test.ts`, and `voice-log-service.test.ts` for audit identity, event context, timestamps, truncation, channel/config and send failures.
- `dashboard/tests` for loading/empty/error/populated presentation, labels, validation, keyboard-accessible controls, and protected rendering.
- Security suites under `tests/unit` and `tests/integration` for OAuth sessions, CSRF, authorization, guild isolation, CORS, rate limits, audit behavior, envelopes, and authenticated SSE live updates.

Snapshots are intentionally semantic: tests assert stable user-visible fields and invariants while excluding nondeterministic timestamps and Discord.js serialization details. Canvas bytes are asserted only where deterministic; otherwise tests assert attachment/fallback contracts.

## Regression rules

1. Preserve command names/options, permissions, ephemeral/public behavior, event selection, configured channels/templates, APIs, authentication, authorization, and guild isolation.
2. Escape attacker-controlled markdown/mentions and truncate at Unicode code-point boundaries within Discord title, description, field, footer, and aggregate limits.
3. Moderation/logging output must retain actor, target, action/event context, reason when available, timestamp, and audit-safe structured errors.
4. Dashboard states must remain understandable without color, controls must have accessible names, errors must be announced, focus must be visible, and secrets/session credentials must never be presented.
5. Roll back a failing surface to its local 3.2.3 formatter. If a shared primitive regresses multiple surfaces, restore local formatting and rerun every fixture listed above.
