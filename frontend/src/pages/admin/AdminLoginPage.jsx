import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PasswordInput from '../../components/PasswordInput';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/admin';

  if (isAdmin) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, 'admin');
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Invalid credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <img src="/AtEase.svg" alt="AtEase" className="h-24 w-24 shrink-0 object-contain" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center">Admin Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">Administrators only</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-foreground">Email</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-foreground">Password</label>
            <PasswordInput
              id="admin-password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
            <p className="mt-2 text-right">
              <Link to="/admin/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in to admin'}
          </button>
        </form>
        
        <p className="mt-4 text-center">
          <Link to="/" className="text-sm font-medium text-primary hover:underline">← Back to customer site</Link>
        </p>
      </div>
    </div>
  );
}
