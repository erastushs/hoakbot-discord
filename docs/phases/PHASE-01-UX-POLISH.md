# Phase 01 — UX Polish

## Goal
Polish every existing user-facing bot response and dashboard presentation before the plugin refactor, establishing 3.2.3 behavior and visual snapshots as the migration baseline.

## Background
Current user experiences span informational commands, guild lifecycle messages, Shrine output, moderation actions, and logging. Generic cleanup would miss feature-specific contracts that later phases must preserve.

## Scope
Audit and polish **Help, Bot Info, Server Info, User Info, Avatar, Ping, Welcome, Goodbye, Shrine, moderation embeds, and logging embeds**. Cover wording, embed hierarchy, colors, timestamps, footers, thumbnails/images, field ordering, truncation, mentions, loading/error/empty states, accessibility, and mobile readability.

## Out of Scope
Plugin runtime, command names/options, moderation policy, log event selection, Shrine artwork redesign, API/auth changes, dashboard routing, and new product features.

## Requirements
Create an inventory mapping each named surface to its current source, inputs, output variants, and snapshot. Use shared embed/presentation primitives where behavior is identical, but retain feature-specific content. Preserve permissions, ephemeral/public behavior, mentions, command payloads, settings, API/security controls, and existing fallbacks. Sanitize user content and obey Discord embed limits.

## Technical Design
First capture golden fixtures for success, empty, permission-denied, missing-data, and failure variants. Define an approved presentation matrix rather than an unapproved final helper interface. Implement shared builders/tokens only after inventory proves duplication. Help retains discoverability and permission filtering; Bot/Server/User Info and Avatar retain current data/privacy boundaries; Ping retains latency semantics; Welcome/Goodbye retain configured channels and templates; Shrine retains image generation/fallback; moderation/logging embeds retain audit identity, action/event context, timestamps, and safe truncation.

## Folder Changes
Expected edits are limited to existing command files under `src/modules/general/commands`, General help code, Welcome/Goodbye/Shrine presentation code, moderation/logging embed producers, and existing shared presentation utilities/tests. Add a shared embed utility only if no suitable utility exists; do not move features or rename public paths in this phase.

## Acceptance Criteria
Every named surface has approved fixtures for applicable variants; output stays within Discord limits; unsafe mentions/content are escaped; command behavior and permissions match 3.2.3; Welcome/Goodbye settings still control delivery; Shrine fallback works; moderation/logging retain required audit fields; dashboard accessibility and existing security tests remain green.

## Deliverables
Surface inventory, presentation matrix, golden fixtures, shared primitives justified by inventory, polished implementations for all named surfaces, and regression documentation.

## Testing
Unit-test each named surface and boundary-length/Unicode/mention cases. Snapshot embeds and Shrine images where deterministic. Integration-test interaction visibility, guild/member absence, Welcome/Goodbye dispatch, moderation authorization, and logging events. Run `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`.

## Rollback Plan
Keep changes separable by surface. Revert a failing surface to its captured 3.2.3 formatter without changing commands, settings, or data. If a shared primitive causes broad regressions, restore local formatters and rerun all golden fixtures.

## Status

Complete. The approved inventory, matrix, fixtures, and regression rules are recorded in [PHASE-01-PRESENTATION-BASELINE](PHASE-01-PRESENTATION-BASELINE.md).

## Notes
This phase establishes presentation baselines; it does not introduce production plugin contracts.
