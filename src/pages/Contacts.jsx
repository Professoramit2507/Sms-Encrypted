import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Trash2, MessageSquare, ShieldCheck, Key, Copy, Check, RefreshCw } from 'lucide-react';
import AppShell from '../components/common/AppShell.jsx';
import Loader from '../components/common/Loader.jsx';
import { addContact, getContacts, removeContact } from '../services/authService.js';
import { getUserPublicKey, getReceiverUniqueKey, regenerateReceiverUniqueKey } from '../services/keyService.js';
import { useChat } from '../context/ChatContext.jsx';
import { validateIdentifier } from '../utils/validation.js';

export default function Contacts() {
  const navigate = useNavigate();
  const { startChatWith } = useChat();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [keyInfo, setKeyInfo] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getContacts();
      setContacts(Array.isArray(list) ? list : []);
    } catch (err) {
      setContacts([]);
      setError(err.message || 'Could not load contacts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [copied, setCopied] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  useEffect(() => {
    if (!selected?.id) {
      setKeyInfo(null);
      return;
    }
    getReceiverUniqueKey(selected.id)
      .then((key) => setKeyInfo(key))
      .catch(() => setKeyInfo(null));
  }, [selected]);

  const handleCopyKey = () => {
    if (!keyInfo?.uniqueKey) return;
    navigator.clipboard.writeText(keyInfo.uniqueKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateKey = async () => {
    if (!selected?.id || regeneratingKey) return;
    setRegeneratingKey(true);
    try {
      const fresh = await regenerateReceiverUniqueKey(selected.id);
      setKeyInfo(fresh);
    } catch {
      // ignore
    } finally {
      setRegeneratingKey(false);
    }
  };

  const onAdd = async (e) => {
    e.preventDefault();
    const invalid = validateIdentifier(identifier);
    if (invalid) {
      setError(invalid);
      return;
    }
    setAdding(true);
    setError('');
    try {
      const created = await addContact(identifier.trim());
      setContacts((prev) => [created, ...prev]);
      setIdentifier('');
    } catch (err) {
      setError(err.message || 'Could not add contact.');
    } finally {
      setAdding(false);
    }
  };

  const onRemove = async (contact) => {
    if (!window.confirm(`Remove ${contact.fullName || contact.username || 'this contact'}?`)) return;
    try {
      await removeContact(contact.id);
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      if (selected?.id === contact.id) setSelected(null);
    } catch (err) {
      setError(err.message || 'Could not remove contact.');
    }
  };

  const onStartChat = async (contact) => {
    const id = await startChatWith(contact);
    navigate(`/chat/${id}`);
  };

  const filtered = contacts.filter((c) => {
    const hay = `${c.fullName || ''} ${c.username || ''} ${c.email || ''}`.toLowerCase();
    return hay.includes(search.toLowerCase());
  });

  return (
    <AppShell>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <form onSubmit={onAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="add-contact" className="sr-only">
              Add contact by username or email
            </label>
            <input
              id="add-contact"
              className="input"
              placeholder="Username or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={adding}>
              <UserPlus className="h-4 w-4" />
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {error && <p className="mt-3 alert-error">{error}</p>}
          {loading && <Loader label="Loading contacts" />}
          {!loading && filtered.length === 0 && (
            <div className="card mt-4 text-sm text-slate-500">No contacts yet. Add someone by username or email.</div>
          )}
          <ul className="mt-4 space-y-2.5">
            {filtered.map((c) => (
              <li key={c.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(c)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(c)}
                  className={`card flex cursor-pointer items-center justify-between p-3.5 transition-all ${
                    selected?.id === c.id
                      ? 'border-teal-500/80 bg-teal-50/30 dark:border-teal-400/60 dark:bg-teal-950/20 shadow-md ring-1 ring-teal-500/30'
                      : 'hover:border-slate-300 dark:hover:border-white/15 hover:bg-slate-50/50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-xs font-bold text-teal-800 dark:from-teal-400/25 dark:to-emerald-400/25 dark:text-teal-200 border border-teal-500/20 shadow-sm">
                      {(c.fullName?.[0] || c.username?.[0] || '?').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{c.fullName || c.username}</p>
                      <p className="truncate text-xs text-slate-400">@{c.username || 'unknown'} · {c.email || 'encrypted contact'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200/80 bg-teal-50/80 text-teal-700 hover:bg-teal-100 dark:border-teal-800/60 dark:bg-teal-950/60 dark:text-teal-300 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartChat(c);
                      }}
                      title="Open Chat"
                      aria-label="Start chat"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(c);
                      }}
                      title="Remove contact"
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <aside className="card h-fit">
          <h2 className="font-semibold">Contact profile</h2>
          {!selected && <p className="mt-3 text-sm text-slate-500">Select a contact to view details.</p>}
          {selected && (
            <div className="mt-4 space-y-3 text-sm">
              <p className="text-lg font-medium">{selected.fullName || selected.username}</p>
              <p className="text-slate-500">@{selected.username}</p>
              {selected.email && <p>{selected.email}</p>}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-900 dark:text-emerald-300">
                    <Key className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Receiver Unique Key
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="rounded p-1 text-emerald-700 hover:bg-emerald-200/60 dark:text-emerald-300 dark:hover:bg-emerald-800/60 transition-colors"
                      title="Copy Receiver Key"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenerateKey}
                      disabled={regeneratingKey}
                      className="rounded p-1 text-emerald-700 hover:bg-emerald-200/60 dark:text-emerald-300 dark:hover:bg-emerald-800/60 transition-colors"
                      title="Regenerate Unique Key for Receiver"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${regeneratingKey ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="rounded bg-white/80 px-2.5 py-1.5 font-mono text-xs font-semibold text-emerald-950 dark:bg-[#111b21] dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 break-all select-all">
                    {keyInfo?.uniqueKey || 'Generating Unique Key…'}
                  </div>
                  {keyInfo?.fingerprint && (
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Fingerprint: {keyInfo.fingerprint}
                    </p>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Messages sent to this contact are encrypted specifically using this unique key.
                  </p>
                </div>
              </div>
              <button type="button" className="btn-primary w-full" onClick={() => onStartChat(selected)}>
                Start chat
              </button>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
