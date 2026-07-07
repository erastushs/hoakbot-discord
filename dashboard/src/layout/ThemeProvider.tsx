import { useEffect, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';

const DEFAULT_THEME: ThemeMode = 'dark';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = DEFAULT_THEME;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.add('dark');
  }, [theme]);

  return (
    <div data-theme="dark" className="dark">
      {children}
    </div>
  );
}
