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
  const descriptionId = description && selectId ? `${selectId}-description` : undefined;
  const errorId = error && selectId ? `${selectId}-error` : undefined;

  return (
    <label className="grid gap-2 text-small font-medium text-dashboard-text-primary" htmlFor={selectId}>
      {label ? <span>{label}</span> : null}
      {description ? <span className="text-caption font-normal text-dashboard-text-secondary" id={descriptionId}>{description}</span> : null}
      <select
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={Boolean(error) || undefined}
        className={cx(
          'h-11 rounded-xl border border-dashboard-border-subtle bg-dashboard-bg-surface/62 px-3.5 text-small text-dashboard-text-primary shadow-elevation-0 backdrop-blur-xl transition duration-hover ease-dashboard hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated/72 focus:border-dashboard-border-strong focus:bg-dashboard-bg-surface-elevated/78 focus:outline-none focus:ring-2 focus:ring-dashboard-focus-ring/30 disabled:cursor-not-allowed disabled:border-dashboard-border-subtle disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled disabled:opacity-70',
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
      {error ? <span className="text-caption font-normal text-dashboard-danger" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}
