import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-small',
  lg: 'h-12 w-12 text-body',
};

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  src?: string;
}

export function Avatar({ alt = '', className, fallback = 'H', size = 'md', src, ...props }: AvatarProps) {
  if (src) {
    return <img alt={alt} className={cx('rounded-full object-cover', sizeClasses[size], className)} src={src} />;
  }

  return (
    <span
      className={cx(
        'inline-grid place-items-center rounded-full bg-dashboard-accent-muted font-semibold text-dashboard-accent-primary',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {fallback.slice(0, 2).toUpperCase()}
    </span>
  );
}
