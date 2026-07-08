import { Avatar } from '../components/index.js';

const configuredApplicationAvatarUrl = import.meta.env.VITE_DISCORD_APPLICATION_AVATAR_URL?.trim();

export function BotAvatar({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Avatar
      alt="Hoak Bot"
      className={className}
      fallback="H"
      size={size}
      src={configuredApplicationAvatarUrl || undefined}
    />
  );
}
