import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import * as authApi from '../api/auth';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const isAdmin = window.location.pathname.startsWith('/admin');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate(isAdmin ? '/admin/login' : '/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Failed to reset password. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const loginPath = isAdmin ? '/admin/login' : '/login';
  const loginLabel = isAdmin ? 'Back to admin sign in' : 'Back to sign in';

  if (!token) {
    return (
      <div className={isAdmin ? 'flex min-h-screen items-center justify-center bg-muted/30 px-4' : 'mx-auto max-w-md px-4 py-12'}>
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground">Invalid reset link</h1>
          <p className="mt-2 text-sm text-muted-foreground">This link is missing a token. Please use the link from your email or request a new one.</p>
          <p className="mt-6 text-center text-sm">
            <Link to={isAdmin ? '/admin/forgot-password' : '/forgot-password'} className="font-medium text-primary hover:underline">Request new link</Link>
            {' · '}
            <Link to={loginPath} className="font-medium text-primary hover:underline">{loginLabel}</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={isAdmin ? 'flex min-h-screen items-center justify-center bg-muted/30 px-4' : 'mx-auto max-w-md px-4 py-12'}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-lg">
        {isAdmin && (
          <div className="mb-6 flex items-center gap-0">
            <img src="/AtEase.svg" alt="" className="h-20 w-20 shrink-0 object-contain" aria-hidden />
            <span className="font-bold text-primary text-xl">AtEase Admin</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">
          {isAdmin ? 'Admin' : 'Customer'} – Set new password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your new password below.
        </p>
        {success ? (
          <div className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            Password has been reset. Redirecting you to sign in…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-foreground">New password</label>
              <PasswordInput
                id="reset-password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-foreground">Confirm new password</label>
              <PasswordInput
                id="reset-confirm"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to={loginPath} className="font-medium text-primary hover:underline">{loginLabel}</Link>
        </p>
      </div>
    </div>
  );
}
