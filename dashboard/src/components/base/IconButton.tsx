import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

type IconButtonVariant = 'secondary' | 'ghost' | 'danger';
type IconButtonSize = 'sm' | 'md';

const variantClasses: Record<IconButtonVariant, string> = {
  secondary:
    'border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-secondary hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated hover:text-dashboard-text-primary',
  ghost: 'border-transparent bg-transparent text-dashboard-text-tertiary hover:bg-dashboard-bg-muted hover:text-dashboard-text-primary',
  danger: 'border-dashboard-danger bg-dashboard-danger text-dashboard-text-primary hover:opacity-90',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

export function IconButton({ children, className, label, size = 'md', type = 'button', variant = 'secondary', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cx(
        'inline-grid place-items-center rounded-md border transition duration-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      type={type}
      {...props}
    >
      {children as ReactNode}
    </button>
  );
}
