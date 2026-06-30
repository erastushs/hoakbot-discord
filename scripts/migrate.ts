import { ConfigService } from '../src/core/config/config.service.js';
import { SupabaseAdapter } from '../src/core/database/supabase.adapter.js';
import { createLogger } from '../src/core/logger/logger.service.js';

async function main(): Promise<void> {
  const configService = new ConfigService();
  const config = configService.load();
  const logger = createLogger(configService);

  logger.info('Connecting to database...');
  const adapter = new SupabaseAdapter(config, logger);
  await adapter.connect();

  const sql = adapter.getClient();

  logger.info('Creating warnings table if not exists...');

  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS warnings (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      guild_id    TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason      TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  logger.info('Creating warnings indexes if not exist...');

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_warnings_guild_user
      ON warnings (guild_id, user_id);
  `);

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_warnings_created_at
      ON warnings (created_at DESC);
  `);

  logger.info('Migration complete.');

  await adapter.disconnect();
  process.exit(0);
}

void main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
