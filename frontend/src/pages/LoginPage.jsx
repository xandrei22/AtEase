import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isCustomer } = useAuth();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  if (isCustomer) {
    navigate(from || '/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password, 'customer');
      if (result.success) {
        navigate(from || '/', { replace: true });
      } else {
        setError(result.error || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) return;
    setError('');
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(credentialResponse.credential);
      if (result.success) {
        navigate(from || '/', { replace: true });
      } else {
        setError(result.error || 'Google sign-in failed.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed.');
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border border-border bg-background p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <img src="/AtEase.svg" alt="AtEase" className="h-24 w-24 shrink-0 object-contain" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center">Customer Login</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">Sign in to access your bookings</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground">Password</label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
            <p className="mt-2 text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <>
            <div className="relative my-4">
              <span className="absolute inset-0 flex items-center" aria-hidden>
                <span className="w-full border-t border-border" />
              </span>
              <span className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
                or
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              {googleClientId ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="320"
                  disabled={googleLoading}
                />
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="w-full max-w-[320px] cursor-not-allowed rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground opacity-70"
                    title="Set VITE_GOOGLE_CLIENT_ID in frontend/.env to enable"
                  >
                    Sign in with Google
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Google sign-in isn’t configured yet (set <code className="font-mono">VITE_GOOGLE_CLIENT_ID</code>).
                  </p>
                </>
              )}
            </div>
          </>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">Sign up</Link>
        </p>
        
      </div>
    </div>
  );
}
