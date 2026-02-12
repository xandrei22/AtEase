import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminCalendar from './AdminCalendar';
import AdminNotifications from './AdminNotifications';

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/rooms': 'Room management',
  '/admin/bookings': 'Bookings management',
  '/admin/reports': 'Reports & analytics',
  '/admin/settings': 'Settings',
};

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/admin/rooms')) return 'Room management';
  if (pathname.startsWith('/admin/bookings')) return 'Bookings management';
  if (pathname.startsWith('/admin/reports')) return 'Reports & analytics';
  if (pathname.startsWith('/admin/settings')) return 'Settings';
  return 'Dashboard';
}

export default function AdminLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ease-in-out ${sidebarCollapsed ? 'pl-16' : 'pl-64'}`}>
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 18l6-6-6-6" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
              )}
            </button>
            <h1 className="font-bold text-primary text-lg truncate">{pageTitle}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AdminCalendar />
            <AdminNotifications />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
