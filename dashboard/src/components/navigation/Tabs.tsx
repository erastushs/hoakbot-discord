import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '../utils.js';

export interface TabsItem {
  id: string;
  label: ReactNode;
}

export interface TabsProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  activeId: string;
  items: TabsItem[];
  onValueChange?(id: string): void;
}

export function Tabs({ activeId, className, items, onValueChange, ...props }: TabsProps) {
  return (
    <div className={cx('flex gap-1 rounded-lg border border-dashboard-border-subtle bg-dashboard-bg-surface p-1', className)} role="tablist">
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            aria-selected={selected}
            className={cx(
              'rounded-md px-3 py-2 text-small font-medium transition duration-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-dashboard-focus-ring',
              selected ? 'bg-dashboard-bg-surface-elevated text-dashboard-text-primary shadow-elevation-1' : 'text-dashboard-text-secondary hover:text-dashboard-text-primary',
            )}
            key={item.id}
            onClick={() => onValueChange?.(item.id)}
            role="tab"
            type="button"
            {...props}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
