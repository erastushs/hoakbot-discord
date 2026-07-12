# Recipes

## Configuration
Declare the key under `capabilities.settings`, then call `context.config.get`.

## Commands and autocomplete
Declare command and autocomplete identifiers, then register each through `context.commands`.

## Events and priority
Declare the prioritized event identifier and register it through `context.events`.

## Lifecycle and dependencies
Declare dependencies statically; acquire registrations in `start` and release resources in `stop`.
