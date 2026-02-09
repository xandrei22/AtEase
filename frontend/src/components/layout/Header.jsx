import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const { user, isCustomer, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-0 font-bold text-primary text-xl">
          <img src="/AtEase.svg" alt="" className="h-16 w-16 shrink-0 object-contain" aria-hidden />
          AtEase
        </Link>
        <nav className="hidden md:flex md:items-center md:gap-6">
          <Link to="/" className="text-foreground hover:text-primary hover:underline">
            Home
          </Link>
          <Link to="/rooms" className="text-foreground hover:text-primary hover:underline">
            Rooms
          </Link>
          <Link to="/bookings" className="text-foreground hover:text-primary hover:underline">
            My Bookings
          </Link>
          <Link to="/admin" className="text-muted-foreground hover:text-primary hover:underline">
            Admin
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {isCustomer ? (
            <>
              <span className="hidden text-sm text-muted-foreground md:inline">{user?.name || user?.email}</span>
              <button
                type="button"
                onClick={() => navigate('/bookings')}
                className="rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-border"
              >
                My Bookings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-4 py-2 text-sm font-medium text-primary hover:underline"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-border"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 md:hidden"
            aria-label="Toggle menu"
          >
            <span className="text-2xl">{mobileMenuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
              Home
            </Link>
            <Link to="/rooms" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
              Rooms
            </Link>
            <Link to="/bookings" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
              My Bookings
            </Link>
            <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
              Admin
            </Link>
            {isCustomer ? (
              <button type="button" onClick={handleLogout} className="py-2 text-left font-medium text-primary">
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
                  Login
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
