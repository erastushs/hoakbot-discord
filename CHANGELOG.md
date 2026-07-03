# Changelog

All notable changes to Hoak Bot are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- EmbedFactory with shared embed builders (success, error, warning, info, custom)
- Centralized color constants (`COLORS.PRIMARY`, `COLORS.MODERATION.*`, etc.)
- Error catalog (`Errors.*`) replacing all hardcoded user-facing strings
- Response factory (`Response.*`) wrapping embed construction and `ctx.reply()`
- BaseCommand abstract class with protected response helpers
- Configurable voice join delay (`joinDelayMs`) with WAITING state
- Vitest testing infrastructure with v8 coverage (80% thresholds)
- GitHub Actions CI pipeline (lint → typecheck → build → test → deploy)
- Observability metrics (`command_execution_total`, `command_failed_total`, `voice_error_total`)
- Health check exposing anonymous metrics counters
- Repository standards: .editorconfig, .gitattributes, CODEOWNERS, dependabot, issue templates, PR template, CONTRIBUTING.md, SECURITY.md

### Changed
- All commands extend BaseCommand instead of implementing ICommand directly
- Embed colors use named constants instead of numeric literals
- Error messages centralized in Errors catalog
- Embed replies use Response factory instead of raw `new EmbedBuilder()`
- Voice state machine: IDLE → MOVING → WAITING → PLAYING → RETURNING → COOLDOWN

### Fixed
- Voice module respects shutdown flag during join delay
- Permission middleware properly validates both user and bot permissions

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

[Unreleased]: https://github.com/erastushs/hoakbot/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/erastushs/hoakbot/releases/tag/v1.0.0
