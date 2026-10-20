import { ShieldCheck, AlertTriangle, ShieldAlert, KeyRound } from 'lucide-react';

const STYLES = {
  secure: {
    bg: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent text-emerald-900 dark:text-emerald-200 dark:border-emerald-500/20',
    badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: ShieldCheck,
    label: 'Verified & Secure',
  },
  warning: {
    bg: 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent text-amber-900 dark:text-amber-200 dark:border-amber-500/20',
    badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: AlertTriangle,
    label: 'Attention Needed',
  },
  not_configured: {
    bg: 'border-slate-200/80 bg-slate-50/70 text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
    badge: 'bg-slate-200/70 text-slate-700 dark:bg-white/10 dark:text-slate-300 border-slate-300/60',
    icon: KeyRound,
    label: 'Auto Generating',
  },
  unavailable: {
    bg: 'border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent text-rose-900 dark:text-rose-200 dark:border-rose-500/20',
    badge: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
    icon: ShieldAlert,
    label: 'Key Unavailable',
  },
};

export default function KeyStatus({ status = 'not_configured', label, detail }) {
  const conf = STYLES[status] || STYLES.not_configured;
  const Icon = conf.icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4.5 transition-all shadow-card ${conf.bg}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{label || 'Cryptographic Status'}</p>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tight ${conf.badge}`}>
          <Icon className="h-3 w-3" />
          <span>{conf.label}</span>
        </span>
      </div>

      <p className="mt-2 text-lg font-bold tracking-tight leading-snug">
        {status === 'secure' ? 'RSA-2048 + AES-GCM' : conf.label}
      </p>

      {detail && <p className="mt-1 text-xs opacity-75 leading-relaxed">{detail}</p>}
    </div>
  );
}
