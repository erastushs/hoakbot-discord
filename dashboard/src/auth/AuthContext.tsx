import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { mockUser } from '../api/mock-data.js';
import type { DashboardUser } from '../contracts.js';

export interface AuthState {
  user?: DashboardUser;
  authenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  signIn(user?: DashboardUser): void;
  signOut(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children, initialUser = mockUser }: { children: ReactNode; initialUser?: DashboardUser }) {
  const [user, setUser] = useState<DashboardUser | undefined>(initialUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authenticated: Boolean(user),
      signIn: (nextUser = mockUser) => setUser(nextUser),
      signOut: () => setUser(undefined),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
