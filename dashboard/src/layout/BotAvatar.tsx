import { useState } from 'react';

import { cx } from '../components/utils.js';

const sizeClasses = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-small',
  lg: 'h-12 w-12 text-body',
};

export function BotAvatar({ className, size = 'sm' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={cx('inline-grid place-items-center rounded-full bg-dashboard-accent-muted font-semibold text-dashboard-accent-primary', sizeClasses[size], className)}>
        HD
      </span>
    );
  }

  return (
    <img
      alt="Hoak Bot"
      className={cx('rounded-full object-cover', sizeClasses[size], className)}
      onError={() => setFailed(true)}
      src="/favicon.png"
    />
  );
}
