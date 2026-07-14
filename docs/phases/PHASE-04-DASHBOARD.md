# Phase 04 — Dashboard

## Goal
Make the dashboard fully plugin-metadata driven while preserving API v1 compatibility and all security boundaries.

## Background
The dashboard already consumes module metadata. V4 requires explicit **dynamic navigation, plugin settings, plugin metadata, and enable/disable** behavior without plugin-specific UI code.

## Scope
Registry-to-API metadata projection, dynamic navigation, generic plugin overview/settings rendering, plugin metadata display, per-guild enable/disable controls, compatibility normalization, live updates, and associated API/dashboard tests.

## Out of Scope
Plugin-supplied executable UI, bespoke plugin pages, removal of `/api/v1/modules`, authentication redesign, or weakening authorization.

## Requirements
Navigation is generated from ordered metadata and enabled/available state. Plugin settings render from validated metadata types and preserve save/error/conflict states. Metadata shows safe identity/version/description/category/health/dependencies only. Enable/disable requires existing guild authorization, audit, dependency/dependent validation, and confirmation where disabling affects dependents. Disabled plugins cannot expose active controls. Preserve OAuth sessions, CSRF, CORS, rate limiting, guild isolation, security audit, envelopes, authenticated SSE live updates, and existing routes.

## Technical Design
Add an API serializer over immutable plugin snapshots while retaining module-shaped responses; an additive plugin alias is optional, not assumed. Normalize responses in the dashboard API layer into one internal view model. Build dynamic navigation by category/order from metadata. Generic settings controls map existing setting metadata discriminants to shared components. Enable/disable calls the existing secured state endpoint or an explicitly reviewed additive endpoint, then refreshes registry/state and propagates authenticated SSE updates. Dependency errors use structured API errors. No component branches on plugin ID.

## Folder Changes
Expected changes: API registry serializers/endpoints and contract tests under existing core API paths; dashboard API client/types; shared navigation, plugin/module page, settings controls, state control, and tests under existing dashboard conventions. Do not import `src/modules` or plugin packages into dashboard.

## Acceptance Criteria
Adding a metadata fixture creates navigation/settings UI without code changes; all seven built-ins display correct metadata; settings read/write and validation errors work; authorized enable/disable persists and audits state; unauthorized/cross-guild/CSRF attempts fail; required dependencies cannot be disabled incorrectly; disabled state updates navigation/UI; old module endpoint/dashboard URLs remain functional.

## Deliverables
Compatibility serializer, normalized dashboard model, dynamic navigation, generic metadata/settings pages, enable/disable workflow, live-state handling, and contract/security/UI tests.

## Testing
API schema snapshots, auth/role/guild/CSRF/CORS/rate-limit matrices, dependency state transitions, audit assertions, metadata fuzzing, setting-type components, optimistic/conflict/error states, navigation ordering, accessibility/responsive/e2e/SSE tests, and all quality commands.

## Rollback Plan
Feature-flag plugin dashboard projections and controls. Revert client normalization/navigation to existing module responses, leave persisted module/plugin states unchanged, and verify old routes, authorization, settings, and dashboard smoke tests.

## Notes
ADR-013 governs. Metadata never contains secrets, handlers, filesystem paths, or executable UI.
