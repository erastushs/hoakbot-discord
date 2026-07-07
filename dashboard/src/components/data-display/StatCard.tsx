import type { HTMLAttributes, ReactNode } from 'react';

import { Card } from '../base/Card.js';
import { cx } from '../utils.js';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  description?: ReactNode;
  label: ReactNode;
  trend?: ReactNode;
  value: ReactNode;
}

export function StatCard({ className, description, label, trend, value, ...props }: StatCardProps) {
  return (
    <Card className={cx('grid gap-2', className)} {...props}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption font-medium uppercase tracking-[0.16em] text-dashboard-text-tertiary">{label}</p>
        {trend ? <span className="text-caption text-dashboard-text-secondary">{trend}</span> : null}
      </div>
      <p className="text-heading-l text-dashboard-text-primary">{value}</p>
      {description ? <p className="text-small text-dashboard-text-secondary">{description}</p> : null}
    </Card>
  );
}
