import { ArrowRight, Boxes } from 'lucide-react';
import type { ReactNode } from 'react';

import { useAuth } from './AuthContext.js';

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return <AuthStatePanel message="Checking your dashboard session." title="Loading session" />;
  }

  if (!auth.authenticated) {
    return (
      <AuthStatePanel
        action={
          <a
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashboard-accent-primary bg-dashboard-accent-primary px-5 text-small font-semibold text-dashboard-text-primary shadow-elevation-2 transition duration-hover ease-dashboard hover:border-dashboard-accent-hover hover:bg-dashboard-accent-hover hover:shadow-elevation-3 motion-safe:hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
            href={auth.loginUrl}
          >
            Continue with Discord
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        }
        message={auth.error ?? 'Configure guild modules from a focused, secure developer workspace.'}
        title="Manage Hoak Bot with confidence"
      />
    );
  }

  return <>{children}</>;
}

function AuthStatePanel({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <main className="dashboard-auth-background grid min-h-screen place-items-center px-6 py-10 text-dashboard-text-primary">
      <section className="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-dashboard-bg-surface/72 p-7 text-center shadow-elevation-2 backdrop-blur-2xl tablet:p-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-dashboard-border-subtle bg-dashboard-bg-surface-elevated/90 text-dashboard-text-primary shadow-elevation-1">
          <Boxes className="h-6 w-6" />
        </div>
        <p className="mt-6 text-caption font-semibold uppercase tracking-[0.22em] text-dashboard-text-tertiary">Hoak Dashboard</p>
        <h1 className="mt-3 text-heading-l text-dashboard-text-primary">{title}</h1>
        <p className="mx-auto mt-3 max-w-xs text-small leading-6 text-dashboard-text-secondary">{message}</p>
        {action ? <div className="mt-7">{action}</div> : null}
      </section>
    </main>
  );
}
