import { Badge, type BadgeProps } from '../base/Badge.js';

type StatusVariant = 'online' | 'offline' | 'enabled' | 'disabled' | 'warning' | 'error' | 'pending' | 'unknown';

const variantMap: Record<StatusVariant, BadgeProps['variant']> = {
  online: 'success',
  offline: 'danger',
  enabled: 'success',
  disabled: 'neutral',
  warning: 'warning',
  error: 'danger',
  pending: 'info',
  unknown: 'neutral',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusVariant;
}

export function StatusBadge({ children, status, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={variantMap[status]} {...props}>
      {children ?? status}
    </Badge>
  );
}
