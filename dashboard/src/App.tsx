import { AuthGuard } from './auth/AuthGuard.js';
import { AuthProvider } from './auth/AuthContext.js';
import { mockManifests } from './api/mock-data.js';
import { GuildProvider } from './guilds/GuildContext.js';
import { DashboardHome } from './home/DashboardHome.js';
import { DashboardLayout } from './layout/DashboardLayout.js';
import { ThemeProvider } from './layout/ThemeProvider.js';

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GuildProvider>
          <AuthGuard>
            <DashboardLayout breadcrumb={[{ label: 'Home' }]} manifests={mockManifests}>
              <DashboardHome manifests={mockManifests} />
            </DashboardLayout>
          </AuthGuard>
        </GuildProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
