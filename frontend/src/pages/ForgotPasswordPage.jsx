import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as authApi from '../api/auth';
import PasswordInput from '../components/PasswordInput';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setResetLink('');
    
    if (isAdmin && !password) {
      setError('Please enter your current password for verification.');
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.forgotPassword(email, isAdmin ? 'admin' : 'customer', isAdmin ? password : null);
      setMessage(data.message || 'If an account exists with that email, you will receive a reset link.');
      if (data.resetLink) setResetLink(data.resetLink);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err?.data?.error || err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loginPath = isAdmin ? '/admin/login' : '/login';
  const loginLabel = isAdmin ? 'Back to admin sign in' : 'Back to sign in';

  return (
    <div className={isAdmin ? 'flex min-h-screen items-center justify-center bg-background px-4' : 'mx-auto max-w-md px-4 py-12'}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 shadow-lg">
        {isAdmin && (
          <div className="mb-6 flex items-center gap-0">
            <img src="/AtEase.svg" alt="" className="h-20 w-20 shrink-0 object-contain" aria-hidden />
            <span className="font-bold text-primary text-xl">AtEase Admin</span>
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">
          {isAdmin ? 'Admin' : 'Customer'} – Forgot password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin ? 'Enter your email and current password for verification. We\'ll send you a link to reset your password.' : 'Enter your email and we\'ll send you a link to reset your password.'}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
              {message}
              {resetLink && (
                <p className="mt-2 break-all">
                  <span className="text-muted-foreground">Use this link (if you don’t receive an email): </span>
                  <a href={resetLink} className="font-medium text-primary hover:underline">{resetLink}</a>
                </p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground">Email</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder={isAdmin ? 'admin@atease.com' : 'you@example.com'}
            />
          </div>
          {isAdmin && (
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-foreground">Current password (for verification)</label>
              <PasswordInput
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your current password"
                required={isAdmin}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link to={loginPath} className="font-medium text-primary hover:underline">{loginLabel}</Link>
        </p>
      </div>
    </div>
  );
}
