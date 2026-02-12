import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import dashboardIcon from '../../assets/dashboard.svg?url';
import roomIcon from '../../assets/room.svg?url';
import bookingsIcon from '../../assets/bookings.svg?url';
import reportsIcon from '../../assets/reports.svg?url';
import exitIcon from '../../assets/exit.svg?url';
import settingIcon from '../../assets/setting.svg?url';

const links = [
  { to: '/admin', end: true, label: 'Dashboard', icon: dashboardIcon },
  { to: '/admin/rooms', end: false, label: 'Rooms', icon: roomIcon },
  { to: '/admin/bookings', end: false, label: 'Bookings', icon: bookingsIcon },
  { to: '/admin/requests', end: false, label: 'Requests', icon: bookingsIcon },
  { to: '/admin/reports', end: false, label: 'Reports', icon: reportsIcon },
];

export default function AdminSidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to log out?')) return;
    logout();
    navigate('/admin/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-border bg-muted/50 transition-[width] duration-200 ease-in-out ${collapsed ? 'w-16' : 'w-64'}`}
    >
      <div className={`flex h-14 shrink-0 items-center border-b border-border ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
        <img src="/AtEase.svg" alt="" className="h-9 w-9 shrink-0 rounded-full object-cover object-center" aria-hidden />
        {!collapsed && <span className="ml-2 font-bold text-primary text-lg truncate">AtEase</span>}
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {links.map(({ to, end, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg font-medium ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-3'} ${isActive ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'}`
            }
          >
            <img src={icon} alt="" className="h-5 w-5 shrink-0 object-contain" aria-hidden />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-2 space-y-1">
        {collapsed ? (
          <>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm mx-auto"
              title={user?.name || user?.email}
            >
              {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <NavLink
              to="/admin/settings"
              end={false}
              title="Settings"
              className={({ isActive }) =>
                `flex items-center justify-center rounded-lg py-2 font-medium ${isActive ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'}`
              }
            >
              <img src={settingIcon} alt="" className="h-5 w-5 shrink-0 object-contain" aria-hidden />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:bg-muted"
              title="Log out"
            >
              <img src={exitIcon} alt="" className="h-5 w-5 shrink-0 object-contain" aria-hidden />
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground truncate px-2" title={user?.email}>{user?.name || user?.email}</p>
            <p className="text-xs text-muted-foreground truncate px-2">{user?.email}</p>
            <NavLink
              to="/admin/settings"
              end={false}
              className={({ isActive }) =>
                `mt-2 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium ${isActive ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'}`
              }
            >
              <img src={settingIcon} alt="" className="h-5 w-5 shrink-0 object-contain" aria-hidden />
              Settings
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted"
            >
              <img src={exitIcon} alt="" className="h-5 w-5 shrink-0 object-contain" aria-hidden />
              Logout
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
