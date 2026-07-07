import type { DialogHTMLAttributes, ReactNode } from 'react';

import { Button } from '../base/Button.js';
import { cx } from '../utils.js';

export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, 'title'> {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}

export function Dialog({ actions, children, className, description, title, ...props }: DialogProps) {
  return (
    <dialog className={cx('rounded-xl border border-dashboard-border-subtle bg-dashboard-bg-surface-elevated p-0 text-dashboard-text-primary shadow-elevation-3 backdrop:bg-black/60', className)} {...props}>
      <div className="grid gap-4 p-6">
        <div>
          <h2 className="text-heading-m">{title}</h2>
          {description ? <p className="mt-1 text-small text-dashboard-text-secondary">{description}</p> : null}
        </div>
        {children}
        {actions ? <div className="flex justify-end gap-2">{actions}</div> : <form className="flex justify-end" method="dialog"><Button>Close</Button></form>}
      </div>
    </dialog>
  );
}
