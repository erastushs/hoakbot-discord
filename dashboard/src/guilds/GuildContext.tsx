import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { GuildSummary } from '../contracts.js';

export interface GuildContextValue {
  guilds: GuildSummary[];
  currentGuild?: GuildSummary;
  setCurrentGuild(guildId: string): void;
}

const GuildContext = createContext<GuildContextValue | undefined>(undefined);

export function GuildProvider({ children, guilds = [] }: { children: ReactNode; guilds?: GuildSummary[] }) {
  const [currentGuildId, setCurrentGuildId] = useState(guilds[0]?.id);

  const value = useMemo<GuildContextValue>(
    () => ({
      guilds,
      currentGuild: guilds.find((guild) => guild.id === currentGuildId),
      setCurrentGuild: setCurrentGuildId,
    }),
    [currentGuildId, guilds],
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
