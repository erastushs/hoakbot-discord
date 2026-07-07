import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  description?: ReactNode;
  label: ReactNode;
  onCheckedChange?(checked: boolean): void;
}

export function Switch({ checked = false, className, description, label, onCheckedChange, type = 'button', ...props }: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      className={cx('flex w-full items-center justify-between gap-4 rounded-md border border-dashboard-border-subtle bg-dashboard-bg-surface p-4 text-left shadow-elevation-0 transition duration-hover ease-dashboard hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated hover:shadow-elevation-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring disabled:cursor-not-allowed disabled:bg-dashboard-bg-muted disabled:opacity-60 disabled:shadow-elevation-0', className)}
      onClick={() => onCheckedChange?.(!checked)}
      role="switch"
      type={type}
      {...props}
    >
      <span className="grid gap-1">
        <span className="text-small font-medium text-dashboard-text-primary">{label}</span>
        {description ? <span className="text-caption text-dashboard-text-secondary">{description}</span> : null}
      </span>
      <span
        aria-hidden
        className={cx(
          'relative h-6 w-11 rounded-full border transition duration-hover',
          checked ? 'border-dashboard-accent-primary bg-dashboard-accent-primary' : 'border-dashboard-border-strong bg-dashboard-bg-muted',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-dashboard-text-primary shadow-elevation-1 transition duration-hover ease-dashboard',
            checked ? 'left-5.5' : 'left-0.5',
          )}
        />
      </span>
    </button>
  );
}
