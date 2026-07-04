import { AuthGuard } from './auth/AuthGuard.js';
import { AuthProvider } from './auth/AuthContext.js';
import { mockManifests } from './api/mock-data.js';
import { GuildProvider } from './guilds/GuildContext.js';
import { DashboardHome } from './home/DashboardHome.js';
import { DashboardLayout } from './layout/DashboardLayout.js';
import { ThemeProvider } from './layout/ThemeProvider.js';
import { ModulePage } from './modules/ModulePage.js';
import { mockSettings } from './api/mock-data.js';

export function App() {
  const moduleId = getModuleIdFromPath(window.location.pathname);
  const manifest = moduleId
    ? mockManifests.find((candidate) => candidate.id === moduleId)
    : undefined;
  const breadcrumb = manifest ? [{ label: 'Home' }, { label: manifest.name }] : [{ label: 'Home' }];

  return (
    <ThemeProvider>
      <AuthProvider>
        <GuildProvider>
          <AuthGuard>
            <DashboardLayout breadcrumb={breadcrumb} manifests={mockManifests}>
              {manifest ? (
                <ModulePage
                  manifest={manifest}
                  settings={mockSettings.filter((setting) => setting.key.startsWith(`${manifest.id}.`))}
                />
              ) : (
                <DashboardHome manifests={mockManifests} />
              )}
            </DashboardLayout>
          </AuthGuard>
        </GuildProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function getModuleIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/modules\/(.+)$/);
  return match ? decodeURIComponent(match[1] ?? '') : undefined;
}
