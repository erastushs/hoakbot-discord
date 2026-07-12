# Changelog

All notable changes to Hoak Bot are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Polished the 3.2.3 user-facing Discord presentation baseline across general commands, Welcome, Goodbye, Shrine, moderation, and logging while preserving public behavior.
- Standardized safe Discord content truncation and mention escaping and recorded the approved Phase 01 surface inventory, presentation matrix, and golden regression map.

### Security
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
