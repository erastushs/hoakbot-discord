# Changelog

All notable changes to Hoak Bot are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added the Phase 02 plugin core: static validated catalogs, dependency and collision diagnostics, atomic immutable registry snapshots, scoped capability context, secret-free metadata serialization, deterministic lifecycle coordination, and legacy module projections.
- Added a disabled-by-default `pluginCoreBootstrap` flag providing reversible old/new bootstrap selection.
- Added Phase 03 plugin factories, parity fixtures, lifecycle cleanup, and independent migration flags for General, Logging, Welcome, Goodbye, Voice, Moderation, and Shrine.
- Added the Phase 04 metadata-driven dashboard projection, normalized guild module state, generic metadata and state controls, dependency-aware audited enable/disable persistence, authenticated live state updates, and a disabled-by-default `pluginDashboard` rollback flag.
- Added Phase 05 plugin-owned, schema-validated configuration, deterministic value hot reload with health diagnostics and reconciliation, namespaced checksummed migrations, secret-redacted change delivery, and disabled-by-default ownership/hot-reload flags with an explicit compatibility rollback flag.
- Added Phase 06 typed command definitions, deterministic generated command discovery and catalog hashing, atomic registry projections, shared permission visibility, bounded authorized autocomplete, registry-backed Help/list/deploy workflows, deployment drift detection, 3.2.3 payload fixtures, and explicit rollback adapters.
- Added Phase 07 typed declarative event contracts, validated generated inventory, deterministic dependency/priority ordering, lifecycle-safe source adapters, payload and failure diagnostics, compatibility aliases, migrated built-in handlers, and an explicit legacy-registration rollback flag.
- Added Phase 09 developer and release verification: a credential-free plugin harness, shared typed fixtures, all-seven-built-in integration/parity evidence, upgrade/rollback checks, and measured root/dashboard coverage regression gates with machine-readable reports.
- Added the `4.0.0-next.0` developer prereleases of `@hoakbot/plugin-contracts` and `@hoakbot/plugin-sdk`, including reviewed ESM contracts, shared schemas and harness exports, a safe plugin generator and template, the `hoak-plugin` create/validate/inspect/preflight/check/pack CLI, an example plugin, and contributor documentation.

### Changed
- Hardened the public plugin SDK harness with declarative event installation, manifest capability enforcement, exactly-once reverse cleanup, and startup rollback matching production behavior.
- Expanded SDK acceptance to compile documentation snippets and verify generated plugins through clean install, typecheck, build, test, and pack using only public APIs; API-reference drift is now part of `plugin-sdk:check`.
- Added deterministic asset generation to the production build and migrated Shrine textures, the default Welcome background, and Voice sounds to validated namespaced resolution with a direct-path compatibility rollback.
- Polished the 3.2.3 user-facing Discord presentation baseline across general commands, Welcome, Goodbye, Shrine, moderation, and logging while preserving public behavior.
- Standardized safe Discord content truncation and mention escaping and recorded the approved Phase 01 surface inventory, presentation matrix, and golden regression map.

### Security
- Made plugin initialization transactional with exactly-once reverse-order capability rollback, failure-contained cleanup, registry restoration, and explicit least-privilege built-in capability grants replacing unrestricted container access.
- Scoped dashboard log history and live SSE streams to one server-authorized guild, excluding cross-guild and platform-only entries before pagination or transport and cleaning up reconnect subscriptions safely.
- Made guild configuration writes atomic and versioned with optimistic concurrency, transactional durable audit records, rollback on failure, post-commit cache and hot-reload updates, and dashboard conflict handling.
- Fixed cross-guild dashboard form isolation by discarding stale dirty state whenever the active module or loaded settings values change, with guild-switch and save regression coverage.
- Verified dashboard accessibility presentation and existing authenticated, authorized, guild-isolated, CSRF, CORS, rate-limit, audit, and WebSocket security regressions.

## [2.0.0] — 2025-07-03

### Added
- **Logging Module** — comprehensive member, voice, message, and moderation logging:
  - `VoiceLogService` — join/leave/move events with embeds
  - `MemberLogService` — nickname, display name, avatar, and role add/remove event logging
  - `MessageLogService` — message delete, edit, bulk delete with attachment archiving
  - `ModerationLogService` — kick, ban, timeout, warn, clean action logging
- **Welcome Module** — configurable welcome cards with custom backgrounds and templates
- **Goodbye Module** — configurable goodbye cards with custom backgrounds
- **Moderation Module** — kick, ban, timeout, warn, clean commands with permission checks
- **General Module** — ping and help commands with structured responses
- **Metrics Module** — health check and metrics reporting with anonymous counters
- `EmbedFactory` — centralized embed builder with color constants
- `COLORS` constants — named palette (`PRIMARY`, `SUCCESS`, `ERROR`, `WARNING`, `MODERATION.*`, `VOICE.*`)
- `Response` factory — structured embed replies with error/success/warning/info patterns
- `BaseCommand` abstract class — shared response helpers for all commands
- Error catalog (`Errors.*`) — centralized user-facing error strings
- Configurable voice join delay (`joinDelayMs`) with `WAITING` state
- Permission middleware with role-based level system (admin, moderator, trusted)
- Feature flags system for module toggling
- Vitest testing infrastructure with 80% coverage thresholds
- GitHub Actions CI pipeline (lint → typecheck → build → test → deploy)
- GitHub Actions release workflow with version validation
- Repository standards: `.editorconfig`, `.gitattributes`, `CODEOWNERS`, `dependabot`, issue/PR templates, `CONTRIBUTING.md`, `SECURITY.md`

### Changed
- All commands extend `BaseCommand` with typed `CommandContext`
- Embed colors use named `COLORS.*` constants
- Error messages centralized in `Errors` catalog
- Embed replies use `Response` builder
- Voice state machine: `IDLE → MOVING → WAITING → PLAYING → RETURNING → COOLDOWN`
- Project name changed to Hoak Bot

### Fixed
- Voice module respects shutdown flag during join delay
- Permission middleware validates both user and bot permissions
- Module loader respects feature flag config

## [1.0.0] — 2025-04-05

### Added
- Dual slash and prefix command system
- Shared CommandRegistry with alias support and case-insensitive lookup
- Voice follow-and-play with 5-state machine (IDLE → MOVING → PLAYING → RETURNING → COOLDOWN)
- Dependency injection container
- Typed EventBus with 16 event types
- Config validation with Zod schemas
- Structured logging via Pino (pretty-print in dev, NDJSON in production)
- PostgreSQL adapter with connection pooling (Supabase)
- Subsystem health checks with startup summary table
- In-process metrics (counters, gauges, timers)
- Module-based architecture with feature flag toggles
- Permission middleware (guildOnly, owner bypass, permission bitfield checks)
- GitHub Actions deploy pipeline to VPS via SSH
- PM2 process management with zero-downtime reload

[2.0.0]: https://github.com/erastushs/hoakbot/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/erastushs/hoakbot/releases/tag/v1.0.0
