import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { signup, isCustomer } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isCustomer) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (phone && phone.replace(/\D/g, '').length !== 11) {
      setError('Phone number must be exactly 11 digits.');
      return;
    }
    setLoading(true);
    try {
      const result = await signup({
        firstName,
        lastName,
        email,
        password,
        age: age || undefined,
        phone: phone || undefined,
        address: address || undefined,
        gender: gender || undefined,
      });
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        setError(result.error || 'Sign up failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'mt-1 w-full rounded-lg border border-border px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  const labelClass = 'block text-sm font-medium text-foreground';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-border bg-background p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <img src="/AtEase.svg" alt="AtEase" className="h-24 w-24 shrink-0 object-contain" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-foreground text-center">Create account</h1>
        <p className="mt-1 text-sm text-muted-foreground text-center">Sign up to book rooms and manage your reservations</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </div>
          )}
          {/* 1. Identity */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className={labelClass}>First name</label>
              <input id="firstName" type="text" autoComplete="given-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="First Name" />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>Last name</label>
              <input id="lastName" type="text" autoComplete="family-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} placeholder="Last Name" />
            </div>
          </div>
          {/* 2. Contact */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label htmlFor="phone" className={labelClass}>Phone number</label>
              <input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} className={inputClass} placeholder="09XXXXXXXXX" />
            </div>
          </div>
          {/* 3. Profile */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="age" className={labelClass}>Age</label>
              <input id="age" type="number" min={18} max={120} value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} placeholder="18+ and above" />
            </div>
            <div>
              <label htmlFor="gender" className={labelClass}>Gender</label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className={`${inputClass} pr-12`}>
                <option value="">Select gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>
          {/* 4. Address */}
          <div>
            <label htmlFor="address" className={labelClass}>Address</label>
            <input id="address" type="text" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="Street, city, country" />
          </div>
          {/* 5. Password */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className={labelClass}>Password</label>
              <PasswordInput id="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
              <p className="mt-1 text-xs text-muted-foreground">8+ chars, uppercase, lowercase, number, symbol</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className={labelClass}>Confirm password</label>
              <PasswordInput id="confirmPassword" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-3 font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
