import type { TableHTMLAttributes } from 'react';

import { cx } from '../utils.js';

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-dashboard-border-subtle">
      <table className={cx('min-w-full divide-y divide-dashboard-border-subtle text-left text-small', className)} {...props} />
    </div>
  );
}

export function VirtualTable({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <Table className={cx('table-fixed', className)} {...props} />;
}
