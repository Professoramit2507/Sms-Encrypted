import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Shield,
  UserCircle,
  ShieldCheck,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/security', label: 'Security', icon: Shield },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-obsidian-950/90 shadow-2xs">
      {/* লোগো ও ব্র্যান্ড হেডার */}
      <button
        type="button"
        className="flex items-center gap-3 px-5 py-5 text-left border-b border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5"
        onClick={() => {
          navigate('/dashboard');
          onNavigate?.();
        }}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 p-0.5 shadow-md shadow-teal-500/20">
          <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-white dark:bg-obsidian-900">
            <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Secure<span className="text-teal-600 dark:text-teal-400">SMS</span>
          </p>
          <p className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            End-to-End Encrypted
          </p>
        </div>
      </button>

      {/* নেভিগেশন লিংকস */}
      <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4" aria-label="Main">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
          Menu
        </p>
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/10 to-emerald-500/10 text-teal-700 dark:from-teal-400/15 dark:to-emerald-400/15 dark:text-teal-300 font-semibold shadow-2xs border border-teal-500/20'
                  : 'text-slate-600 hover:bg-slate-100/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                  }`}
                  aria-hidden
                />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-500 shadow-glow" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* বটম ইউজার আইডি কার্ড */}
      <div className="p-3 border-t border-slate-100 dark:border-white/5">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-obsidian-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-xs font-bold">
              {user?.fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                {user?.fullName || user?.username || 'User'}
              </p>
              <p className="truncate text-[10px] font-mono text-slate-400">
                @{user?.username || 'secure'}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[10px] text-slate-500 dark:border-white/5">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Key className="h-3 w-3" />
              Keys Active
            </span>
            <span className="rounded bg-emerald-100/80 px-1.5 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {user?.id === 'c1' ? 'Receiver' : 'Sender'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
