import type { ReactNode, TextareaHTMLAttributes } from 'react';

import { cx } from '../utils.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  description?: ReactNode;
  error?: ReactNode;
  label?: ReactNode;
}

export function Textarea({ className, description, error, id, label, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="grid gap-2 text-small font-medium text-dashboard-text-primary" htmlFor={textareaId}>
      {label ? <span>{label}</span> : null}
      {description ? <span className="text-caption font-normal text-dashboard-text-secondary">{description}</span> : null}
      <textarea
        aria-invalid={Boolean(error) || undefined}
        className={cx(
          'min-h-24 rounded-md border border-dashboard-border-subtle bg-dashboard-bg-app px-3 py-2 text-small text-dashboard-text-primary transition duration-hover placeholder:text-dashboard-text-disabled hover:border-dashboard-border-strong focus:border-dashboard-border-strong disabled:cursor-not-allowed disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled',
          className,
        )}
        id={textareaId}
        {...props}
      />
      {error ? <span className="text-caption font-normal text-dashboard-danger">{error}</span> : null}
    </label>
  );
}
