import type { ReactNode, TextareaHTMLAttributes } from 'react';

import { cx } from '../utils.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  description?: ReactNode;
  error?: ReactNode;
  label?: ReactNode;
}

export function Textarea({ className, description, error, id, label, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;
  const descriptionId = description && textareaId ? `${textareaId}-description` : undefined;
  const errorId = error && textareaId ? `${textareaId}-error` : undefined;

  return (
    <label className="grid gap-1.5 text-small font-medium text-dashboard-text-primary" htmlFor={textareaId}>
      {label ? <span>{label}</span> : null}
      {description ? <span className="text-caption font-normal text-dashboard-text-secondary" id={descriptionId}>{description}</span> : null}
      <textarea
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        aria-invalid={Boolean(error) || undefined}
        className={cx(
          'min-h-24 w-full rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-control/62 px-3 py-2.5 text-small text-dashboard-text-primary shadow-elevation-0 backdrop-blur-xl transition duration-hover ease-dashboard placeholder:text-dashboard-text-disabled hover:border-dashboard-accent-primary/50 hover:bg-dashboard-bg-control/82 focus:border-dashboard-accent-primary focus:bg-dashboard-bg-control/90 focus:outline-none focus:ring-2 focus:ring-dashboard-focus-ring/24 disabled:cursor-not-allowed disabled:border-dashboard-border-subtle disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled disabled:opacity-70',
          className,
        )}
        id={textareaId}
        {...props}
      />
      {error ? <span className="text-caption font-normal text-dashboard-danger" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}
