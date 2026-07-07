CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id       TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL,
  username         TEXT,
  global_name      TEXT,
  avatar           TEXT,
  provider         TEXT NOT NULL DEFAULT 'discord',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at       TIMESTAMPTZ NOT NULL,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at       TIMESTAMPTZ,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions (expires_at);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_revoked_at
  ON auth_sessions (revoked_at);
