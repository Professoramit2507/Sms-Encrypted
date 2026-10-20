import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { validateIdentifier } from '../../utils/validation.js';

export default function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // মূল লগইন হ্যান্ডলার
  const executeLogin = async (idValue, passValue) => {
    setLoading(true);
    setFormError('');
    try {
      await login({ identifier: idValue.trim(), password: passValue });
      navigate('/dashboard');
    } catch (err) {
      setFormError(
        err.status === 401
          ? 'Invalid credentials. Check your email/username and password.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {
      identifier: validateIdentifier(identifier),
      password: password ? '' : 'Password is required.',
    };
    setErrors(next);
    if (next.identifier || next.password) return;

    await executeLogin(identifier, password);
  };

  // ডেমো সেন্ডার লগইন
  const handleSenderLogin = async () => {
    const demoUser = 'sender@gmail.com';
    const demoPass = 'demo12345';
    setIdentifier(demoUser);
    setPassword(demoPass);
    setErrors({});
    await executeLogin(demoUser, demoPass);
  };

  // ডেমো রিসিভার লগইন
  const handleReceiverLogin = async () => {
    const demoUser = 'alice@gmail.com';
    const demoPass = 'demo12345';
    setIdentifier(demoUser);
    setPassword(demoPass);
    setErrors({});
    await executeLogin(demoUser, demoPass);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <p className="alert-error" role="alert">
          {formError}
        </p>
      )}

      <div>
        <label htmlFor="identifier" className="label">
          Email or username
        </label>
        <input
          id="identifier"
          className="input"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          aria-invalid={Boolean(errors.identifier)}
        />
        {errors.identifier && (
          <p className="mt-1 text-xs text-rose-600">{errors.identifier}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            className="input pr-12"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.password)}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
        )}
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      {/* ডেমো কুইক লগইন অপশন (Sender ও Receiver টেস্ট করার জন্য) */}
      <div className="space-y-2 pt-1">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
          Quick Demo Accounts
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleSenderLogin}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/70 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100/80 transition-colors dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-brand-300"
            disabled={loading}
          >
            <span>🚀 Sign in as <strong>Sender</strong></span>
          </button>

          <button
            type="button"
            onClick={handleReceiverLogin}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100/80 transition-colors dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
            disabled={loading}
          >
            <span>📥 Sign in as <strong>Receiver</strong></span>
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-slate-500">
        New here?{' '}
        <Link to="/register" className="font-medium text-brand-700 dark:text-accent-400">
          Create an account
        </Link>
      </p>
    </form>
  );
}