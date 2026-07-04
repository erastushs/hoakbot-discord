import { ChevronDown } from 'lucide-react';

import { useGuild } from './GuildContext.js';

export function GuildSwitcher() {
  const { guilds, currentGuild, setCurrentGuild } = useGuild();

  return (
    <label className="grid gap-1 text-xs font-medium text-slate-500">
      <span>Current guild</span>
      <span className="relative">
        <select
          aria-label="Current guild"
          className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-9 text-sm font-medium text-slate-900"
          onChange={(event) => setCurrentGuild(event.target.value)}
          value={currentGuild?.id ?? ''}
        >
          {guilds.map((guild) => (
            <option key={guild.id} value={guild.id}>
              {guild.name}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
      </span>
    </label>
  );
}
