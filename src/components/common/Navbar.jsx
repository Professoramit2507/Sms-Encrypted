import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, User, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../main.jsx';

function LogoMark() {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 p-0.5 shadow-md shadow-teal-500/25 transition-transform group-hover:scale-105">
        <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-obsidian-900">
          <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
      </div>
      <div>
        <span className="block text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
          Secure<span className="text-teal-600 dark:text-teal-400">SMS</span>
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          End-to-End
        </span>
      </div>
    </Link>
  );
}

export default function Navbar({ variant = 'marketing' }) {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links =
    variant === 'app'
      ? [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/chat', label: 'Chat' },
          { to: '/contacts', label: 'Contacts' },
          { to: '/security', label: 'Security' },
        ]
      : [
          { to: '/', label: 'Home' },
          { to: '/login', label: 'Login' },
        ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-white/10 dark:bg-obsidian-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <LogoMark />

        <nav className="hidden items-center gap-1.5 md:flex rounded-full border border-slate-200/80 bg-slate-100/50 p-1 dark:border-white/10 dark:bg-obsidian-900/60" aria-label="Primary">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-white text-teal-700 shadow-xs dark:bg-white/10 dark:text-teal-300'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-obsidian-900/80 dark:text-slate-300 dark:hover:bg-white/5 transition-all"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-obsidian-900/80 dark:text-slate-200 dark:hover:bg-white/5 transition-all"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span className="max-w-[120px] truncate">{user?.fullName || user?.username || 'Account'}</span>
              </Link>
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5 text-rose-500" />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <div className="hidden gap-2 md:flex">
              <Link to="/login" className="btn-secondary h-9 px-3.5 text-xs">
                Login
              </Link>
              <Link to="/register" className="btn-primary h-9 px-3.5 text-xs">
                Get started
              </Link>
            </div>
          )}

          <button
            type="button"
            className="btn-ghost h-9 w-9 p-0 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200/80 bg-white/95 px-4 py-3 md:hidden dark:border-white/10 dark:bg-obsidian-950/95 backdrop-blur-xl">
          <div className="flex flex-col gap-1.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' : 'text-slate-600 dark:text-slate-300'
                  }`
                }
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
            {isAuthenticated ? (
              <button type="button" className="btn-secondary mt-2 w-full justify-start" onClick={handleLogout}>
                <LogOut className="h-4 w-4 text-rose-500" />
                <span>Log out</span>
              </button>
            ) : (
              <Link to="/register" className="btn-primary mt-2 text-center" onClick={() => setOpen(false)}>
                Get started
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
