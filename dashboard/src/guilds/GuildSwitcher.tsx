import { ChevronDown } from 'lucide-react';

import { useOptionalAuth } from '../auth/AuthContext.js';
import { Avatar, Skeleton } from '../components/index.js';
import { useGuild } from './GuildContext.js';

export function GuildSwitcher() {
  const { guilds, currentGuild, setCurrentGuild } = useGuild();
  const auth = useOptionalAuth();
  const hasMultipleGuilds = guilds.length > 1;

  if (auth?.status === 'loading') {
    return (
      <div className="grid gap-1.5" aria-hidden>
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!currentGuild) {
    return null;
  }

  return (
    <label className="grid gap-1.5 text-caption font-medium uppercase tracking-[0.17em] text-dashboard-text-tertiary">
      <span>Guild</span>
      <span className="relative block">
        {hasMultipleGuilds ? (
          <>
            <select
              aria-label="Current guild"
              className={`h-10 w-full cursor-pointer appearance-none rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/62 pr-8 text-small font-medium text-dashboard-text-primary shadow-elevation-0 backdrop-blur-xl transition duration-hover ease-dashboard hover:border-dashboard-accent-primary/50 hover:bg-dashboard-bg-control/82 focus:border-dashboard-accent-primary focus:outline-none focus:ring-2 focus:ring-dashboard-focus-ring/24 ${
                'pl-11'
              }`}
              onChange={(event) => setCurrentGuild(event.target.value)}
              value={currentGuild?.id ?? ''}
            >
              {guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
            {currentGuild ? <Avatar alt={currentGuild.name} className="pointer-events-none absolute left-3 top-2 z-sticky h-6 w-6 shadow-elevation-1" fallback={guildInitial(currentGuild.name)} size="sm" src={currentGuild.iconUrl} /> : null}
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-dashboard-text-tertiary" />
          </>
        ) : (
          <>
            <span
              aria-label="Current guild"
              className={`flex h-10 w-full items-center rounded-lg border border-white/5 bg-dashboard-bg-page/48 pr-3 text-small font-medium text-dashboard-text-primary shadow-elevation-0 backdrop-blur-xl ${
                'pl-11'
              }`}
            >
              <span className="truncate">{currentGuild.name}</span>
            </span>
            {currentGuild ? <Avatar alt={currentGuild.name} className="pointer-events-none absolute left-3 top-2 z-sticky h-6 w-6 shadow-elevation-1" fallback={guildInitial(currentGuild.name)} size="sm" src={currentGuild.iconUrl} /> : null}
          </>
        )}
      </span>
    </label>
  );
}

function guildInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || 'G';
}
