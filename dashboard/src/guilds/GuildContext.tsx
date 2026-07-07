import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { useOptionalAuth } from '../auth/AuthContext.js';
import type { GuildSummary } from '../contracts.js';

export interface GuildContextValue {
  guilds: GuildSummary[];
  currentGuild?: GuildSummary;
  setCurrentGuild(guildId: string): void;
}

const GuildContext = createContext<GuildContextValue | undefined>(undefined);

export function GuildProvider({ children, guilds = [] }: { children: ReactNode; guilds?: GuildSummary[] }) {
  const auth = useOptionalAuth();
  const [localGuildId, setLocalGuildId] = useState(guilds[0]?.id);
  const sourceGuilds = auth && auth.guilds.length > 0 ? auth.guilds : guilds;
  const selectedGuild = auth?.selectedGuild ?? sourceGuilds.find((guild) => guild.id === localGuildId) ?? sourceGuilds[0];

  const value = useMemo<GuildContextValue>(
    () => ({
      guilds: sourceGuilds,
      currentGuild: selectedGuild,
      setCurrentGuild: auth?.setSelectedGuild ?? setLocalGuildId,
    }),
    [auth?.setSelectedGuild, selectedGuild, sourceGuilds],
  );

  return <GuildContext.Provider value={value}>{children}</GuildContext.Provider>;
}

export function useGuild(): GuildContextValue {
  const context = useContext(GuildContext);
  if (!context) {
    throw new Error('useGuild must be used within GuildProvider.');
  }

  return context;
}
