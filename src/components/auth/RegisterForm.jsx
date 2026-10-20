import { useState } from 'react';
import { Eye, EyeOff, Send, Inbox, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
  validateUsername,
} from '../../utils/validation.js';

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('sender'); // 'sender' | 'receiver'
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {
      fullName: validateName(form.fullName),
      username: validateUsername(form.username),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    setFormError('');
    try {
      await register({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
      });
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { id: 'fullName', label: 'Full name', autoComplete: 'name' },
    { id: 'username', label: 'Username', autoComplete: 'username' },
    { id: 'email', label: 'Email', autoComplete: 'email', type: 'email' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError && (
        <p className="alert-error" role="alert">
          {formError}
        </p>
      )}

      {/* Role Selection (Sender vs Receiver) */}
      <div className="space-y-1.5">
        <label className="label flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span>Account Role (আপনি কী হিসেবে রেজিস্ট্রেশন করতে চান?)</span>
          <span className="text-[11px] font-normal text-teal-600 dark:text-teal-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>DES + ElGamal</span>
          </span>
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('sender')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
              role === 'sender'
                ? 'border-teal-500 bg-teal-500/10 text-teal-900 dark:text-teal-100 ring-2 ring-teal-500/30 shadow-sm'
                : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <div className={`p-2 rounded-xl mb-1.5 ${role === 'sender' ? 'bg-teal-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
              <Send className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">Sender (প্রেরক)</span>
            <span className="text-[11px] opacity-80 mt-0.5">Encrypts & sends SMS</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('receiver')}
            className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all ${
              role === 'receiver'
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/30 shadow-sm'
                : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <div className={`p-2 rounded-xl mb-1.5 ${role === 'receiver' ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
              <Inbox className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold">Receiver (প্রাপক)</span>
            <span className="text-[11px] opacity-80 mt-0.5">Generates keys & decrypts</span>
          </button>
        </div>
      </div>

      {fields.map((f) => (
        <div key={f.id}>
          <label htmlFor={f.id} className="label">
            {f.label}
          </label>
          <input
            id={f.id}
            type={f.type || 'text'}
            className="input"
            autoComplete={f.autoComplete}
            value={form[f.id]}
            onChange={update(f.id)}
            aria-invalid={Boolean(errors[f.id])}
          />
          {errors[f.id] && <p className="mt-1 text-xs text-rose-600">{errors[f.id]}</p>}
        </div>
      ))}

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={show ? 'text' : 'password'}
            className="input pr-12"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
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
        {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="label">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type={show ? 'text' : 'password'}
          className="input"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>}
      </div>

      <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
        {loading ? 'Creating account…' : `Register as ${role === 'receiver' ? 'Receiver (প্রাপক)' : 'Sender (প্রেরক)'}`}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-700 dark:text-accent-400">
          Sign in
        </Link>
      </p>
    </form>
  );
}
