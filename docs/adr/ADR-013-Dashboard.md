# ADR-013 — Dashboard

## Status
Accepted for the 4.0.0 implementation plan.

## Context
The dashboard already renders module metadata through secure API v1 contracts. V4 requires dynamic plugin navigation, metadata, settings, and enable/disable controls without direct coupling, custom executable UI, or security regressions.

## Decision
The dashboard remains an API-only, metadata-driven React client. Plugin registry records are projected into existing module payloads and may also be exposed through additive aliases. Existing `/api/v1/modules`, dashboard URLs, response envelopes, OAuth sessions, CSRF, authorization, guild isolation, CORS, rate limiting, security audit, and WebSocket authentication remain supported.

Navigation is generated from safe ordered metadata. Generic settings controls are selected by setting metadata, not plugin ID. Enable/disable is guild-scoped, authorized, audited, dependency-aware, and reflected through refreshed state/live updates. Disabled plugins do not expose active controls. Generic components render every plugin; plugin-name conditionals, bot/plugin imports, secrets, handler references, and plugin-supplied executable UI are prohibited. Exact endpoint/view-model additions require implementation review and must remain additive.

## Consequences
Existing clients continue working and new plugins gain navigation/configuration UI automatically. Compatibility serializers and dual terminology add temporary complexity. Plugin-specific experiences are constrained to approved shared metadata primitives, and dependency-aware state changes require richer error handling.

## Alternatives Considered
Import plugin UI bundles: rejected for trust, coupling, and build complexity. Create one page per plugin: rejected as non-scalable. Rename API/routes in place: rejected as breaking. Let plugin routes bypass middleware: rejected for security. Expose enable/disable without dependency validation: rejected because it can create invalid runtime state.

## Related ADRs
ADR-005 API Convention, ADR-008 Dashboard Architecture, ADR-011 Plugin System, ADR-012 Configuration, ADR-014 Command Discovery.
