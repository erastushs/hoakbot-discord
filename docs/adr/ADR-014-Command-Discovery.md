# ADR-014 — Command Discovery

## Status
Accepted for the 4.0.0 implementation plan. Supersedes command-discovery and permission-visibility portions of legacy ADR-001 Module Manifest and ADR-004 Permission Model.

## Context
Runtime routing, Discord deployment scripts, command listing, Help, permission visibility, and autocomplete can drift if they discover commands independently. Plugins require explicit ownership and collision detection without arbitrary runtime scanning.

## Decision
Commands use a typed `defineCommand()` authoring contract whose exact TypeScript signature is approved during implementation. It yields static serializable metadata and bound execute/autocomplete references. Metadata declares owner, name/options, deployment scope, permission action, Help visibility, and autocomplete ownership.

Built-ins are automatically discovered through deterministic build-time generation from approved locations; validated packaged plugins use their static catalog. One immutable registry supplies runtime routing, autocomplete, Help, `list:commands`, and `deploy:commands`. Collisions and invalid metadata fail before Discord connection. A deterministic hash detects deployment drift. Runtime discovery never recursively scans arbitrary directories, and deployment remains an explicit operator action. Existing 3.2.3 names, options, permissions, and scopes remain stable.

## Consequences
One source of truth improves reproducibility and permission consistency; autocomplete and Help share ownership metadata. Descriptor/handler indirection and generated output add tooling, invalid commands can block readiness, and changes require intentional regeneration/deployment.

## Alternatives Considered
Runtime recursive scanning: rejected as implicit and unsuitable for locked packages. Let plugins deploy commands: rejected because credentials, rate limits, collisions, and rollback remain centralized. Keep separate indexes: rejected due to drift. Automatically deploy at startup: rejected because startup should not mutate Discord registration. Omit permission/autocomplete metadata: rejected because runtime and Help would diverge.

## Related ADRs
ADR-011 Plugin System, ADR-012 Configuration, ADR-013 Dashboard. Legacy ADR-001 and ADR-004 are archived under `docs/archive/legacy-architecture/adr/`.
