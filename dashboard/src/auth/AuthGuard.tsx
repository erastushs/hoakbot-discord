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
            className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            href={auth.loginUrl}
          >
            Discord Login
          </a>
        }
        message={auth.error ?? 'Sign in with Discord to manage Hoak Bot dashboard settings.'}
        title="Sign in to Hoak Dashboard"
      />
    );
  }

  return <>{children}</>;
}

function AuthStatePanel({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">Hoak Dashboard</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </section>
    </main>
  );
}
