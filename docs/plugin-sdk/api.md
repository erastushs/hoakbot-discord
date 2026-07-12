# Plugin SDK API 4.0.0-next.0

Supported exports are exact; all other paths are internal and unavailable.

## `@hoakbot/plugin-sdk`

- `pluginManifestSchema`: canonical runtime schema object.
- `defineManifest(value)`: parses and freezes a manifest.
- `parseManifest(value)`: parses a manifest.
- `definePlugin(factory)`: side-effect-free typed factory identity builder.
- Types: `CapabilityKind`, `PluginContext`, `PluginDiagnostic`, `PluginFactory`, `PluginInstance`, `PluginLogger`, `PluginManifest`.

## `@hoakbot/plugin-sdk/manifest-schema`

- `pluginManifestSchema`.

## `@hoakbot/plugin-sdk/testing`

- `createPluginTestHarness(manifest, config?)`.
- Types: `PluginTestHarness`, `TestRegistration`.

## CLI diagnostics and exits

Commands: `create`, `validate`, `inspect`, `preflight`, `check`, `pack`; all accept the documented positional arguments, and read-only commands accept `--json`. Exit 0 means success, 1 means validation/operation failure, 2 means usage failure. Stable codes include `USAGE`, `INVALID_PLUGIN_NAME`, `DESTINATION_EXISTS`, `MANIFEST_READ_ERROR`, `INVALID_MANIFEST`, `DUPLICATE_PLUGIN_ID`, `MISSING_DEPENDENCY`, `CAPABILITY_COLLISION`, `INVALID_PACKAGE`, and `COMMAND_FAILED`.
