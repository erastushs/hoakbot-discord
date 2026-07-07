import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cx('grid gap-4', className)} {...props} />;
}
