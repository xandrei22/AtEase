import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
  const navigate = useNavigate();
  const { user, isCustomer, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to log out?')) return;
    logout();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  const headerContent = (
    <header
      className="border-b border-border bg-background shadow-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', zIndex: 9999 }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 md:px-6">
        {/* Left: logo - fixed width so it never shifts */}
        <div className="flex w-[180px] shrink-0 items-center md:w-[200px]">
          <Link to="/" className="flex items-center gap-0 font-bold text-primary text-xl">
            <img src="/AtEase.svg" alt="" className="h-10 w-10 shrink-0 object-contain md:h-12 md:w-12" aria-hidden />
            <span className="ml-1">AtEase</span>
          </Link>
        </div>
        {/* Center: nav - takes remaining space, content centered */}
        <nav className="hidden flex-1 md:flex md:items-center md:justify-center md:gap-6">
          <Link to="/" className="text-foreground hover:text-primary hover:underline">
            Home
          </Link>
          <Link to="/rooms" className="text-foreground hover:text-primary hover:underline">
            Rooms
          </Link>
          {isCustomer && (
            <Link to="/favorites" className="text-foreground hover:text-primary hover:underline">
              Favorites
            </Link>
          )}
          <Link to="/bookings" className="text-foreground hover:text-primary hover:underline">
            My Bookings
          </Link>
          {!isCustomer && (
            <Link to="/admin" className="text-muted-foreground hover:text-primary hover:underline">
              Admin
            </Link>
          )}
        </nav>
        {/* Right: actions - fixed width so it never shifts */}
        <div className="flex w-[180px] shrink-0 items-center justify-end gap-2 md:w-[220px]">
          {isCustomer ? (
            <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-primary/10 text-primary font-semibold text-sm hover:bg-primary/20 transition-colors"
                  aria-label="Account menu"
                  title={user?.name?.trim() || user?.email || 'Account'}
                >
                  <span className="leading-none">
                    {(user?.name?.trim()?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-border bg-background py-1 text-sm shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/bookings#profile');
                      }}
                      className="block w-full px-3 py-2 text-left text-foreground hover:bg-muted"
                    >
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
            {isCustomer && (
              <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
                Favorites
              </Link>
            )}
            <Link to="/bookings" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
              My Bookings
            </Link>
            {!isCustomer && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">
                Admin
              </Link>
            )}
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

  return createPortal(headerContent, document.body);
}
