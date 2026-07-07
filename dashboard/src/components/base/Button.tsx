import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'border-dashboard-accent-primary bg-dashboard-accent-primary text-dashboard-text-primary shadow-elevation-0 hover:border-dashboard-accent-hover hover:bg-dashboard-accent-hover active:border-dashboard-accent-primary active:bg-dashboard-accent-primary',
  secondary:
    'border-dashboard-border-subtle bg-dashboard-bg-surface/68 text-dashboard-text-primary shadow-elevation-0 backdrop-blur-xl hover:border-dashboard-border-strong hover:bg-dashboard-bg-surface-elevated/72 active:bg-dashboard-bg-muted',
  tertiary:
    'border-transparent bg-dashboard-bg-muted/58 text-dashboard-text-primary backdrop-blur-xl hover:bg-dashboard-bg-surface-elevated active:bg-dashboard-bg-muted',
  ghost: 'border-transparent bg-transparent text-dashboard-text-secondary hover:bg-dashboard-bg-muted/58 hover:text-dashboard-text-primary active:bg-dashboard-bg-surface',
  danger: 'border-dashboard-danger bg-dashboard-danger text-dashboard-text-primary shadow-elevation-1 hover:opacity-90 hover:shadow-elevation-2 active:opacity-80',
  link: 'border-transparent bg-transparent px-0 text-dashboard-accent-primary hover:text-dashboard-accent-hover active:text-dashboard-accent-primary',
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
      aria-busy={isLoading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-lg border font-medium transition duration-hover ease-dashboard motion-safe:active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-dashboard-border-subtle disabled:bg-dashboard-bg-muted disabled:text-dashboard-text-disabled disabled:opacity-70 disabled:shadow-elevation-0',
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
