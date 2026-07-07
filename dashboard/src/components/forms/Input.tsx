import type { InputHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  description?: ReactNode;
  error?: ReactNode;
  label?: ReactNode;
}

export function Input({ className, description, error, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="grid gap-2 text-small font-medium text-dashboard-text-primary" htmlFor={inputId}>
      {label ? <span>{label}</span> : null}
      {description ? <span className="text-caption font-normal text-dashboard-text-secondary">{description}</span> : null}
      <input
        aria-invalid={Boolean(error) || undefined}
        className={cx(
          'h-10 rounded-md border border-dashboard-border-subtle bg-dashboard-bg-app px-3 text-small text-dashboard-text-primary transition duration-hover placeholder:text-dashboard-text-disabled hover:border-dashboard-border-strong focus:border-dashboard-border-strong disabled:cursor-not-allowed disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled',
          className,
        )}
        id={inputId}
        {...props}
      />
      {error ? <span className="text-caption font-normal text-dashboard-danger">{error}</span> : null}
    </label>
  );
}
