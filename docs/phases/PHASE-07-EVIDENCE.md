# Phase 07 — Evidence

## Acceptance Evidence

- **Inventory and ownership:** `src/core/event-bus/event-inventory.ts` records active and dormant events with owner, source, publishers, subscribers, dependencies, priority, and compatibility aliases; generated catalog validation rejects drift before bootstrap.
- **Aliases and ordering:** focused unit coverage dispatches a legacy alias and verifies dependency-first, descending-priority deterministic delivery independent of registration order.
- **Lifecycle and sources:** integration coverage verifies automatic plugin registration, stopped-owner gating, exact unregistration without listener leaks, and shared Discord source listeners.
- **Failure boundaries:** focused coverage verifies malformed payload diagnostics, missing-dependency pre-start rejection, handler stop policy, bounded timeout diagnostics, and no delivery after cleanup.
- **Rollback:** `pluginEventsRollback` selects legacy registration instead of declarative registration; integration coverage verifies the modes are disjoint, preventing duplicate delivery.

## Validation

The required implementation pipeline passed. Node 26 was executed locally; the declared executable Node 22 and 24 matrix entries remain unavailable locally and are still required before prerelease promotion.

No Phase 07 commit has been created.
