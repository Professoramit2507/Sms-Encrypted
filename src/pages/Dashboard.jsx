import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Shield, Users, UserCircle, Key, ArrowRight, ShieldCheck, Sparkles, Home } from 'lucide-react';
import AppShell from '../components/common/AppShell.jsx';
import KeyStatus from '../components/security/KeyStatus.jsx';
import Loader from '../components/common/Loader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { getContacts } from '../services/authService.js';

export default function Dashboard() {
  const { user, keyStatus, refreshKeyStatus } = useAuth();
  const { conversations, loadConversations, loadingConversations } = useChat();
  const [contacts, setContacts] = useState([]);
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    loadConversations();
    refreshKeyStatus();
    getContacts()
      .then((list) => setContacts(Array.isArray(list) ? list : []))
      .catch((err) => {
        setContacts([]);
        setContactError(err.isNetwork ? 'Contacts will appear when the API is reachable.' : err.message);
      });
  }, [loadConversations, refreshKeyStatus]);

  const name = user?.fullName || user?.username || 'there';
  const status = keyStatus?.status || 'not_configured';

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* ওয়েলকাম হিরো ব্যানার */}
        <div className="relative overflow-hidden rounded-3xl border border-teal-500/20 bg-gradient-to-r from-teal-900/10 via-emerald-900/5 to-transparent p-6 sm:p-8 dark:border-white/10 dark:bg-obsidian-900/80 shadow-premium backdrop-blur-md">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 mb-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${user?.role === 'receiver'
                    ? 'border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'border border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300'
                  }`}>
                  {user?.role === 'receiver' ? '📥 Receiver (প্রাপক)' : '📤 Sender (প্রেরক)'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>DES + ElGamal Protected</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Welcome back, <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-400">{name}</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Logged in as <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{user?.email || user?.username}</span> · Keys active on this device
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
              <Link
                to="/"
                className="btn-secondary py-2.5 px-4 text-xs font-semibold"
              >
                <Home className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Home Page</span>
              </Link>
              <Link
                to="/chat"
                className="btn-primary py-2.5 px-5 text-xs font-semibold shadow-glow"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Launch Chat</span>
              </Link>
            </div>
          </div>
        </div>

        {/* স্ট্যাটস কার্ডস গ্রিড */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-hover group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-white/5 dark:text-teal-400 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{contacts.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">Saved Contacts</p>
          </div>

          <div className="card-hover group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-white/5 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{conversations.length}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-1">Conversations</p>
          </div>

          <div className="card sm:col-span-2">
            <KeyStatus
              status={status}
              label="Device Cryptographic Status"
              detail={
                keyStatus?.createdAt
                  ? `Active keypair generated on ${new Date(keyStatus.createdAt).toLocaleDateString()}`
                  : 'Keys are automatically generated locally for end-to-end encryption.'
              }
            />
          </div>
        </div>

        {contactError && <p className="alert-info">{contactError}</p>}

        {/* রিসেন্ট কনভারসেশন ও কুইক অ্যাকশনস */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* রিসেন্ট চ্যাটস */}
          <section className="card lg:col-span-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Conversations</h2>
                <p className="text-xs text-slate-400">Jump right back into your chats</p>
              </div>
              <Link to="/chat" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition-colors">
                <span>View all</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loadingConversations && <Loader compact label="Loading conversations" />}

            {!loadingConversations && conversations.length === 0 && (
              <p className="py-10 text-center text-xs text-slate-400">No conversations yet. Start one from contacts!</p>
            )}

            <ul className="mt-3 space-y-2">
              {conversations.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/chat/${c.id}`}
                    className="flex items-center justify-between rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200/80 dark:hover:border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100/60 text-xs font-bold text-teal-800 dark:bg-white/10 dark:text-teal-300">
                        {c.participant?.fullName?.[0] || 'C'}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {c.participant?.fullName || c.participant?.username || 'Conversation'}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {c.lastMessage?.content || 'Encrypted session'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">Chat →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* কুইক অ্যাকশনস */}
          <section className="card lg:col-span-2 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Quick Actions</h2>
              <p className="text-xs text-slate-400">Fast shortcuts to main sections</p>
            </div>

            <div className="grid gap-2">
              <Link to="/" className="btn-secondary justify-start">
                <Home className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Home Page</span>
              </Link>
              <Link to="/chat" className="btn-primary justify-start">
                <MessageSquare className="h-4 w-4" />
                <span>Open Messenger</span>
              </Link>
              <Link to="/contacts" className="btn-secondary justify-start">
                <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Manage Contacts & Keys</span>
              </Link>
              <Link to="/security" className="btn-secondary justify-start">
                <Shield className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Security & Receiver Registry</span>
              </Link>
              <Link to="/profile" className="btn-secondary justify-start">
                <UserCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span>Account Profile</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
