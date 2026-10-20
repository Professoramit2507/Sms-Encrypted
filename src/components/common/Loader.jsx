export default function Loader({ label = 'Loading', compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${compact ? 'py-6' : 'py-16'}`}
      role="status"
      aria-live="polite"
    >
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700 dark:border-slate-700 dark:border-t-accent-400" />
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}…</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800 ${className}`} />;
}
