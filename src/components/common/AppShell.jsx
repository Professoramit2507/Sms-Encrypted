import { useState } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

export default function AppShell({ children }) {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-800 dark:bg-obsidian-950 dark:text-slate-100 overflow-x-hidden">
      {/* ব্যাকগ্রাউন্ড অ্যাম্পলিফায়ার ও প্রিমিয়াম গ্রেডিয়েন্ট ব্লাশ */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/5" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5" />
      </div>

      <div className="relative z-10 lg:hidden">
        <Navbar variant="app" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen">
            <Sidebar />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-md lg:hidden dark:border-white/10 dark:bg-obsidian-900/80">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="btn-ghost h-9 w-9 p-0"
                aria-label="Open navigation"
                onClick={() => setMobileNav(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="text-sm font-bold tracking-tight">SecureSMS</span>
              </div>
            </div>
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>

      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
          <div className="relative h-full w-72 shadow-2xl">
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
