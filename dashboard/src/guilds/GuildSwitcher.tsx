import { ChevronDown } from 'lucide-react';

import { useGuild } from './GuildContext.js';

export function GuildSwitcher() {
  const { guilds, currentGuild, setCurrentGuild } = useGuild();

  return (
    <label className="grid gap-2 text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">
      <span>Guild</span>
      <span className="relative block">
        {currentGuild?.iconUrl ? (
          <img
            alt=""
            className="pointer-events-none absolute left-3 top-2 h-6 w-6 rounded-full"
            src={currentGuild.iconUrl}
          />
        ) : null}
        <select
          aria-label="Current guild"
          className={`h-10 w-full appearance-none rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface pr-9 text-small font-medium text-dashboard-text-primary transition duration-hover ease-dashboard hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated focus:border-dashboard-border-strong focus:outline-none focus:ring-2 focus:ring-dashboard-focus-ring/40 ${
            currentGuild?.iconUrl ? 'pl-11' : 'px-3'
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
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-dashboard-text-tertiary" />
      </span>
    </label>
  );
}
