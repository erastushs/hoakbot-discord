import type { InputHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  description?: ReactNode;
  error?: ReactNode;
  label?: ReactNode;
}

export function Input({ className, description, error, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const descriptionId = description && inputId ? `${inputId}-description` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <label className="grid gap-2 text-small font-medium text-dashboard-text-primary" htmlFor={inputId}>
      {label ? <span>{label}</span> : null}
      {description ? <span className="text-caption font-normal text-dashboard-text-secondary" id={descriptionId}>{description}</span> : null}
      <input
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={Boolean(error) || undefined}
        className={cx(
          'h-11 rounded-xl border border-dashboard-border-subtle bg-dashboard-bg-surface/62 px-3.5 text-small text-dashboard-text-primary shadow-elevation-0 backdrop-blur-xl transition duration-hover ease-dashboard placeholder:text-dashboard-text-disabled hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated/72 focus:border-dashboard-border-strong focus:bg-dashboard-bg-surface-elevated/78 focus:outline-none focus:ring-2 focus:ring-dashboard-focus-ring/30 disabled:cursor-not-allowed disabled:border-dashboard-border-subtle disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled disabled:opacity-70',
          className,
        )}
        id={inputId}
        {...props}
      />
      {error ? <span className="text-caption font-normal text-dashboard-danger" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}
