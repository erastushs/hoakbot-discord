# Concepts and recipes

A plugin has a static schema-versioned manifest and an ESM factory. The manifest declares dependencies and capabilities before lifecycle execution. Context access is limited to logger, config, commands, events, API routes, health, and config-change lifecycle registration.

Recipes: declare a setting before `config.get`; pair command autocomplete with a declared command capability; encode event priority in the declared event identifier; list assets in manifest metadata; release registrations during stop.
