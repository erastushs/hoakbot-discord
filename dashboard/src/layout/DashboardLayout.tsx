import { useEffect, useRef, useState, type ReactNode } from 'react';

import type { ModuleManifest } from '../contracts.js';
import { Sidebar } from './Sidebar.js';
import { TopNavigation } from './TopNavigation.js';
import type { BreadcrumbItem } from './Breadcrumb.js';

export function DashboardLayout({
  children,
  isLoading = false,
  manifests,
  breadcrumb,
}: {
  children: ReactNode;
  isLoading?: boolean;
  manifests: ModuleManifest[];
  breadcrumb: BreadcrumbItem[];
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => !window.matchMedia);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarId = 'dashboard-sidebar';

  useEffect(() => {
    if (!window.matchMedia) {
      setIsDesktop(true);
      return;
    }

    const media = window.matchMedia('(min-width: 80rem)');

    function syncDesktopState() {
      setIsDesktop(media.matches);
      if (media.matches) {
        setIsSidebarOpen(false);
      }
    }

    syncDesktopState();
    media.addEventListener('change', syncDesktopState);

    return () => media.removeEventListener('change', syncDesktopState);
  }, []);

  useEffect(() => {
    if (!isSidebarOpen || isDesktop) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDesktop, isSidebarOpen]);

  function closeSidebar() {
    setIsSidebarOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className="dashboard-shell-background min-h-screen text-dashboard-text-primary">
      <div className="min-h-screen wide:flex">
        <Sidebar
          drawerId={sidebarId}
          isDesktop={isDesktop}
          isDrawerOpen={isSidebarOpen}
          isLoading={isLoading}
          manifests={manifests}
          onClose={closeSidebar}
          onNavigate={() => {
            if (!isDesktop) {
              setIsSidebarOpen(false);
            }
          }}
        />
        {isSidebarOpen && !isDesktop ? (
          <button
            aria-label="Close navigation menu"
            className="fixed inset-0 z-dropdown cursor-default bg-black/60 backdrop-blur-xl motion-safe:animate-[dashboard-overlay-in_var(--duration-hover)_var(--ease-dashboard)] wide:hidden"
            onClick={closeSidebar}
            type="button"
          />
        ) : null}
        <div className="dashboard-main-surface min-w-0 flex-1 wide:pl-sidebar">
          <TopNavigation
            breadcrumb={breadcrumb}
            isSidebarOpen={isSidebarOpen}
            menuButtonRef={menuButtonRef}
            onToggleSidebar={() => setIsSidebarOpen((current) => !current)}
            sidebarId={sidebarId}
          />
          <main className="min-h-[calc(100vh-var(--header-height))] overflow-y-auto bg-dashboard-bg-page/86 px-3 py-5 tablet:px-6 tablet:py-8 wide:px-10 wide:py-12">
            <div className="mx-auto w-full max-w-page motion-safe:animate-[dashboard-page-in_var(--duration-page)_var(--ease-dashboard)]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
