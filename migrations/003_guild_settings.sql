CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id   TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT guild_settings_guild_id_key_unique UNIQUE (guild_id, key)
);
