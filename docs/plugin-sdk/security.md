# Security and operations

Plugins execute with the host process permissions; the SDK makes no sandbox claim. Review source and package inventory before installation. Do not place tokens, passwords, authorization values, or API keys in manifests, generated files, logs, or assets. `inspect` redaction is diagnostic defense, not secret storage.

Operators should run static validation, inspect, preflight, and check before pack; pin versions; retain pack hashes; monitor lifecycle failures; and roll back to the previously pinned package.
