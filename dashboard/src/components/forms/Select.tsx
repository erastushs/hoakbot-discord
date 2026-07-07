import type { ReactNode, SelectHTMLAttributes } from 'react';

import { cx } from '../utils.js';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  description?: ReactNode;
  error?: ReactNode;
  label?: ReactNode;
  options: SelectOption[];
}

export function Select({ className, description, error, id, label, options, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <label className="grid gap-2 text-small font-medium text-dashboard-text-primary" htmlFor={selectId}>
      {label ? <span>{label}</span> : null}
      {description ? <span className="text-caption font-normal text-dashboard-text-secondary">{description}</span> : null}
      <select
        aria-invalid={Boolean(error) || undefined}
        className={cx(
          'h-10 rounded-md border border-dashboard-border-subtle bg-dashboard-bg-app px-3 text-small text-dashboard-text-primary transition duration-hover hover:border-dashboard-border-strong focus:border-dashboard-border-strong disabled:cursor-not-allowed disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled',
          className,
        )}
        id={selectId}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-caption font-normal text-dashboard-danger">{error}</span> : null}
    </label>
  );
}
