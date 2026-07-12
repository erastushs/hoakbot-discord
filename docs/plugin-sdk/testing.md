# Testing and assets

`@hoakbot/plugin-sdk/testing` is framework-neutral and depends only on platform assertions in generated tests. `createPluginTestHarness` starts and stops a factory, records registrations/logs, and accepts test config. It has no Vitest runtime dependency.

Assets must be declared in manifest metadata, included by package `files`, and addressed package-relatively. `check` inventories files with SHA-256 hashes.
