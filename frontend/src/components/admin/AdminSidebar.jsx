import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const links = [
  { to: '/admin', end: true, label: 'Dashboard', icon: '📊' },
  { to: '/admin/rooms', end: false, label: 'Rooms', icon: '🚪' },
  { to: '/admin/bookings', end: false, label: 'Bookings', icon: '📅' },
  { to: '/admin/reports', end: false, label: 'Reports', icon: '📈' },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-muted/50 flex flex-col">
      <div className="p-4 border-b border-border">
        <span className="font-bold text-primary text-lg">AtEase Admin</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {links.map(({ to, end, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 font-medium ${isActive ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'}`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-4 space-y-2">
        <p className="text-sm font-medium text-foreground truncate" title={user?.email}>{user?.name || user?.email}</p>
        <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
