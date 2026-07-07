import type { InputHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  description?: ReactNode;
  label: ReactNode;
}

export function Checkbox({ className, description, label, ...props }: CheckboxProps) {
  return (
    <label className={cx('flex items-start gap-3 rounded-md border border-dashboard-border-subtle bg-dashboard-bg-surface p-4 transition duration-hover hover:border-dashboard-border-strong', className)}>
      <input
        className="mt-1 h-4 w-4 rounded border-dashboard-border-strong bg-dashboard-bg-app text-dashboard-accent-primary"
        type="checkbox"
        {...props}
      />
      <span className="grid gap-1">
        <span className="text-small font-medium text-dashboard-text-primary">{label}</span>
        {description ? <span className="text-caption text-dashboard-text-secondary">{description}</span> : null}
      </span>
    </label>
  );
}
