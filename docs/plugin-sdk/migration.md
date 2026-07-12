# Module migration

1. Preserve the module ID as the plugin manifest `id`.
2. Convert settings to `capabilities.settings` and access them through `context.config.get`.
3. Convert commands and autocomplete handlers to declared `capabilities.commands` and `context.commands.register`.
4. Convert events and priority to declared `capabilities.events` and `context.events.on`.
5. Convert API endpoints to `capabilities.routes` and `context.api.register`.
6. Keep dashboard UI/configuration compatible through the existing module projection; Phase 10 does not remove module compatibility or introduce plugin dashboard architecture.
7. Move initialization/disposal into `start`/`stop`, test through the public harness, then validate and preflight.
