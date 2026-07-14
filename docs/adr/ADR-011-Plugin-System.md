# ADR-011 — Plugin System

## Status
Accepted for the 4.0.0 implementation plan. Supersedes legacy ADR-001 Module Manifest, ADR-007 Plugin System & Module Loading, and plugin portions of ADR-010 Configuration Lifecycle while retaining documented compatibility surfaces.

## Context
Hoak Bot 3.2.3 has manifest-driven modules and lifecycle infrastructure, but contributors need a stable contract, deterministic ownership, dependency semantics, and safe failure behavior. Renaming every persisted/public “module” contract would create unnecessary breakage.

## Decision
V4 defines a plugin as a static validated manifest plus a factory producing a lifecycle instance. Core validates the complete catalog before factory execution, resolves semantic dependencies, atomically registers capabilities, starts dependency-first, and stops reverse dependency-first. Required plugin failures block readiness; partial initialization records cleanup. Context grants only declared capabilities.

`Plugin*` is the new public terminology. Existing `IModule*` contracts, `hoak:<name>` IDs, `src/modules`, `module_states`, `/api/v1/modules`, and dashboard module URLs remain deprecated compatibility surfaces in 4.0. Exact TypeScript signatures are approved during implementation; this ADR fixes behavior and boundaries, not every identifier. External JavaScript is administrator-trusted and is not a secure sandbox.

## Consequences
Positive: stable extension boundary, deterministic behavior, clear ownership, testable lifecycle, and incremental migration. Negative: adapters add temporary complexity; strict validation can fail startup; third-party packages remain supply-chain risk; authors cannot use unrestricted core internals.

## Alternatives Considered
Keep modules internal only: rejected because it does not meet platform goals. Rename all module artifacts immediately: rejected due to compatibility risk. Pass the unrestricted DI container: rejected for coupling and privilege. Run every plugin in a worker/process: deferred because Discord objects, performance, and RPC complexity require separate design.

## Related ADRs
ADR-012 Configuration, ADR-013 Dashboard, ADR-014 Command Discovery. Legacy ADR-001, ADR-007, and ADR-010 are archived under `docs/archive/legacy-architecture/adr/`.
