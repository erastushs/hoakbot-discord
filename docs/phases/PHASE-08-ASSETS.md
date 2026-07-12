# Phase 08 — Assets

## Goal
Provide deterministic organization and safe resolution for shared assets and plugin-owned textures, fonts, and sounds.

## Background
Shrine uses textures and voice functionality uses sounds/native audio; duplicated or arbitrary paths make plugin packaging unreliable.

## Scope
Explicit **shared assets, plugin assets, textures, fonts, and sounds**; ownership, descriptors, generated maps, build copying, validation, resolution, caching/disposal, licensing metadata, and compatibility adapters.

## Out of Scope
CDN, runtime remote download, user uploads, artwork/audio redesign, media transcoding service, or executable plugin bundles.

## Requirements
Shared assets are platform-owned and used only when truly cross-plugin; plugin assets remain under their owner. Logical names are namespaced. Textures validate supported image type/dimensions/size; fonts validate format/family/style/weight and register once with cleanup where possible; sounds validate format/size/duration metadata and use existing volume/voice safety. Resolver prevents traversal and undeclared access. Build output and hashes are deterministic; licenses/attribution are recorded.

## Technical Design
Inventory every current asset and consumer, classify shared versus plugin-owned, and record golden output/audio behavior. Define a candidate descriptor schema and logical-ID resolver, then approve exact API during implementation. Generator resolves package-relative declarations, verifies path containment/type/hash/licensing metadata, and emits an explicit map copied into build output. Runtime returns typed read-only handles: buffers/paths appropriate to existing canvas/audio libraries, with bounded cache and disposal. No arbitrary filesystem scan or remote fallback.

## Folder Changes
Expected locations: a platform shared-assets directory only for proven common resources; each plugin’s existing `assets/` for owned files; descriptor/map/resolver/build tooling near plugin core; Shrine texture declarations, font registration consumers, voice/sound consumers, and tests. Do not move files until inventory maps every reference.

## Acceptance Criteria
All existing assets have owner, logical ID, type, source, license, and consumer; generated maps are reproducible; undeclared/traversal/missing/tampered/oversized assets fail safely; Shrine image snapshots match approved baseline; fonts register deterministically; sounds play through existing controls and release resources; one plugin cannot resolve another’s private assets.

## Deliverables
Asset inventory, ownership/licensing manifest, descriptor schema, generator/map, resolver/cache/disposal, migrated textures/fonts/sounds, compatibility adapters, and tests.

## Testing
Generator determinism; path traversal/symlink containment; hash/MIME/size/dimension/duration fixtures; missing/corrupt assets; font duplicate/cleanup tests; Shrine canvas snapshots; mocked sound decode/playback/volume/cleanup; package/build integration; all quality commands.

## Rollback Plan
Retain original files and direct-path adapters until acceptance. Feature-flag the resolver, restore old paths, clear only generated caches, and verify Shrine/voice behavior without deleting source assets.

## Notes
Binary assets require repository size and licensing review. New remote asset sources require a separate ADR.
