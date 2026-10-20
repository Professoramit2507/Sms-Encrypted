import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
      // AuthContext generates keys after registration and sends only the public key.
      await register({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
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
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
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
