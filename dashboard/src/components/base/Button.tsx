import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-dashboard-accent-primary bg-dashboard-accent-primary text-dashboard-text-primary hover:border-dashboard-accent-hover hover:bg-dashboard-accent-hover',
  secondary:
    'border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-primary hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated',
  tertiary:
    'border-transparent bg-dashboard-bg-muted text-dashboard-text-primary hover:bg-dashboard-bg-surface-elevated',
  ghost: 'border-transparent bg-transparent text-dashboard-text-secondary hover:bg-dashboard-bg-muted hover:text-dashboard-text-primary',
  danger: 'border-dashboard-danger bg-dashboard-danger text-dashboard-text-primary hover:opacity-90',
  link: 'border-transparent bg-transparent px-0 text-dashboard-accent-primary hover:text-dashboard-accent-hover',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-2 px-3 text-caption',
  md: 'h-10 gap-2 px-4 text-small',
  lg: 'h-12 gap-2 px-5 text-body',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  isLoading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export function Button({
  children,
  className,
  disabled,
  icon,
  isLoading = false,
  size = 'md',
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center rounded-md border font-medium shadow-elevation-0 transition duration-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring disabled:cursor-not-allowed disabled:border-dashboard-border-subtle disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
}
