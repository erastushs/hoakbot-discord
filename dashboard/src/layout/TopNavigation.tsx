import { LogOut, Moon, Search } from 'lucide-react';

import { useAuth } from '../auth/AuthContext.js';
import { useTheme } from './ThemeProvider.js';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb.js';

export function TopNavigation({ breadcrumb }: { breadcrumb: BreadcrumbItem[] }) {
  const auth = useAuth();
  const theme = useTheme();

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="grid gap-1">
        <Breadcrumb items={breadcrumb} />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <span>Search modules and settings</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Toggle theme"
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700"
          onClick={theme.toggleTheme}
          type="button"
        >
          <Moon className="h-4 w-4" />
        </button>
        {auth.user?.avatarUrl ? <img alt="" className="h-8 w-8 rounded-full" src={auth.user.avatarUrl} /> : null}
        <span className="text-sm font-medium text-slate-700">
          {auth.user?.displayName ?? auth.user?.username ?? 'Authenticated user'}
        </span>
        <button
          aria-label="Sign out"
          className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-700"
          onClick={() => void auth.signOut()}
          type="button"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
