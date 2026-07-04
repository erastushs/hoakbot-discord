import type { ReactNode } from 'react';

import { useAuth } from './AuthContext.js';

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!auth.authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
        <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-950">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to manage available guilds.</p>
          <button
            className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            onClick={() => auth.signIn()}
            type="button"
          >
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
