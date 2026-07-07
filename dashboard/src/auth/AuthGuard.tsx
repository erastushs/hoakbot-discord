import { ArrowRight, Boxes, ShieldCheck } from 'lucide-react';
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
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashboard-accent-primary bg-dashboard-accent-primary px-4 text-small font-medium text-dashboard-text-primary shadow-elevation-0 transition duration-hover ease-dashboard hover:border-dashboard-accent-hover hover:bg-dashboard-accent-hover hover:shadow-elevation-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dashboard-focus-ring"
            href={auth.loginUrl}
          >
            Continue with Discord
            <ArrowRight aria-hidden className="h-4 w-4" />
          </a>
        }
        message={auth.error ?? 'Use your authorized Discord account to access guild configuration and module settings.'}
        title="Manage Hoak Bot with confidence"
      />
    );
  }

  return <>{children}</>;
}

function AuthStatePanel({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-dashboard-bg-app px-6 text-dashboard-text-primary">
      <section className="w-full max-w-sm py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-dashboard-border-subtle bg-dashboard-bg-surface text-dashboard-text-secondary shadow-elevation-0">
          <Boxes className="h-5 w-5" />
        </div>
        <p className="mt-8 text-caption font-semibold uppercase tracking-[0.2em] text-dashboard-text-tertiary">Hoak Dashboard</p>
        <h1 className="mt-3 text-heading-l text-dashboard-text-primary">{title}</h1>
        <p className="mt-3 text-small leading-6 text-dashboard-text-secondary">{message}</p>
        {action ? <div className="mt-7">{action}</div> : null}
        <div className="mt-6 flex items-center justify-center gap-2 text-caption text-dashboard-text-tertiary">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
          <span>Protected by server-side sessions and CSRF controls.</span>
        </div>
      </section>
    </main>
  );
}
