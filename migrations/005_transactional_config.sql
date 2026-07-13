CREATE TABLE IF NOT EXISTS guild_config_versions (
  guild_id   TEXT PRIMARY KEY,
  version    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config_audit_log (
  id          BIGSERIAL PRIMARY KEY,
  guild_id    TEXT NOT NULL,
  module_id   TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  changed_by  TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'api',
  version     INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_config_audit_guild
  ON config_audit_log (guild_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_config_audit_module
  ON config_audit_log (module_id, setting_key);
