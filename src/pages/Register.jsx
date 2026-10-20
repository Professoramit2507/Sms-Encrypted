import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Navbar from '../components/common/Navbar.jsx';
import RegisterForm from '../components/auth/RegisterForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';

export default function Register() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader label="Checking session" />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-800 dark:bg-obsidian-950 dark:text-slate-100 overflow-hidden">
      {/* ব্যাকগ্রাউন্ড অ্যাম্পলিফায়ার */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-500/8" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
          <div className="card shadow-2xl border-slate-200/90 dark:border-white/10 dark:bg-obsidian-900/90 backdrop-blur-xl p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/25">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-obsidian-900">
                  <ShieldCheck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Create Account
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your device will automatically generate your private/public keypair
              </p>
            </div>

            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
}
