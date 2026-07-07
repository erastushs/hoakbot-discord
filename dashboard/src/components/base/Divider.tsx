import type { HTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function Divider({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cx('border-0 border-t border-dashboard-border-subtle', className)} {...props} />;
}
