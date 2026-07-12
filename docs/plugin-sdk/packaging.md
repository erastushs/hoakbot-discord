# Packaging, compatibility, and release

The SDK is ESM-only and supports maintained Node 22, 24, and 26 lines. CommonJS and Node below 22 are unsupported. CI tests the oldest and newest supported lines; prereleases use `4.0.0-next.N` and remain pinned. Promotion to `4.0.0` requires generator consumer, schema identity, docs, example, Node matrix, and pack gates. A defective release is deprecated, not overwritten; publish a corrected version and document migration.

`check` verifies ESM exports and computes an inventory. `pack` runs build then `npm pack --ignore-scripts`; package consumers must verify exports, declared assets, tarball inventory, and SHA-256 integrity.
