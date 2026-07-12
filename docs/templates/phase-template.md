# Phase NN — Title

## Goal
State one measurable outcome, its user/platform value, and the baseline/target versions.

## Background
Record repository findings, current behavior, applicable ADRs, dependencies on prior phases, and why this phase is needed.

## Scope
Enumerate named capabilities, affected user flows, implementation artifacts, migrations, and documentation included.

## Out of Scope
List adjacent features, breaking changes, and future work explicitly deferred.

## Requirements
Use testable MUST-style constraints for compatibility, security, API/dashboard, data, ownership, ordering, lifecycle, failure handling, observability, performance, and operations. Distinguish approved ADR behavior from exact interfaces still requiring review.

## Technical Design
Describe current-to-target flow; discovery/validation/registration/runtime/shutdown sequence; schemas and trust boundaries; state and ownership; dependency/collision rules; failure and retry behavior; feature flags; compatibility adapters; migration/cutover steps. Provide candidate concepts without claiming unapproved exact signatures.

## Folder Changes
For each expected area, identify existing directories to inspect, proposed responsibility, generated versus maintained artifacts, compatibility paths retained, and forbidden moves. Mark exact filenames as implementation decisions unless already approved.

## Acceptance Criteria
Provide independently executable checks covering each scoped capability, unchanged baseline behavior, negative/security paths, observability, documentation, and phase exit gate.

## Deliverables
List contracts/schemas, runtime code, adapters, generated artifacts, migrations, tests/fixtures, tooling, operational material, and contributor documentation.

## Testing
Specify unit, compile-time, schema/property, contract, integration, end-to-end, security, migration, rollback, failure-injection, resource-leak, and coverage checks as applicable. Include `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` unless repository scripts change intentionally.

## Rollback Plan
Name rollback triggers, controlling feature flags/artifacts, order of deactivation, duplicate-registration prevention, persistent-data treatment, cache/generated-artifact handling, and concrete post-rollback verification.

## Notes
Record terminology, risks, unresolved decisions/owners, compatibility expiry, and constraints inherited by later phases.
