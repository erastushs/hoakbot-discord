import { useEffect, useState } from 'react';

import { cx } from '../utils.js';

type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-small',
  lg: 'h-12 w-12 text-body',
};

export interface AvatarProps {
  alt?: string;
  className?: string;
  fallback?: string;
  size?: AvatarSize;
  src?: string;
}

export function Avatar({ alt = '', className, fallback = 'H', size = 'md', src }: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>();

  useEffect(() => {
    setFailedSrc(undefined);
  }, [src]);

  if (src && failedSrc !== src) {
    return (
      <img
        alt={alt}
        className={cx('rounded-full object-cover', sizeClasses[size], className)}
        onError={() => setFailedSrc(src)}
        src={src}
      />
    );
  }

  return (
    <span
      className={cx(
        'inline-grid place-items-center rounded-full bg-dashboard-accent-muted font-semibold text-dashboard-accent-primary',
        sizeClasses[size],
        className,
      )}
    >
      {fallback.slice(0, 2).toUpperCase()}
    </span>
  );
}
