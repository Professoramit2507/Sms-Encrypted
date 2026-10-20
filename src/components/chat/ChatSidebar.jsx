import { Trash2, Plus, MessageSquarePlus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatSidebar({
  conversations,
  activeId,
  search,
  onSearch,
  onSelect,
  onDelete,
  loading,
}) {
  const filtered = conversations.filter((c) => {
    const name = c.participant?.fullName || c.participant?.username || c.title || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleDelete = (e, conv) => {
    e.stopPropagation();
    const name = conv.participant?.fullName || conv.participant?.username || 'this contact';
    if (window.confirm(`Delete conversation with ${name}? All messages will be permanently removed.`)) {
      if (onDelete) {
        onDelete(conv.id);
      }
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-slate-200/80 bg-white dark:border-white/10 dark:bg-obsidian-900/90">
      {/* হেডার */}
      <div className="p-4 border-b border-slate-100 dark:border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Messages</h2>
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {conversations.length} active conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            to="/contacts"
            className="inline-flex items-center gap-1 rounded-xl bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100/80 transition-all dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60 shadow-2xs"
            title="Start new conversation from Contacts"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </Link>
        </div>

        {/* সার্চ বার */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            id="chat-search"
            className="input pl-9 h-9 text-xs rounded-xl"
            placeholder="Search chats…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      {/* চ্যাট লিস্ট */}
      <div className="chat-scroll flex-1 overflow-y-auto divide-y divide-slate-100/70 dark:divide-white/5">
        {loading && <p className="px-4 py-8 text-center text-xs text-slate-400">Loading conversations…</p>}

        {!loading && filtered.length === 0 && (
          <div className="px-4 py-16 text-center text-sm text-slate-500 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400">
              <MessageSquarePlus className="h-6 w-6" />
            </div>
            <p className="text-xs">No conversations found.</p>
            <Link to="/contacts" className="btn-primary text-xs py-2 inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              <span>Start from Contacts</span>
            </Link>
          </div>
        )}

        {filtered.map((c) => {
          const name = c.participant?.fullName || c.participant?.username || 'Conversation';
          const preview = c.lastMessage?.preview || c.lastMessage?.content || 'No messages yet';
          const unread = c.unreadCount || 0;
          const online = Boolean(c.participant?.online ?? true);
          const isActive = activeId === c.id;

          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(c)}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(c)}
              className={`group relative flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent dark:from-teal-400/15 dark:via-emerald-400/5 dark:to-transparent'
                  : 'hover:bg-slate-50/80 dark:hover:bg-white/5'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-teal-600 dark:bg-teal-400" />
              )}

              {/* অ্যাভাটার */}
              <span className="relative shrink-0">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-xs font-bold text-teal-800 dark:from-teal-400/25 dark:to-emerald-400/25 dark:text-teal-200 border border-teal-500/20 shadow-2xs">
                  {initials(name)}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-obsidian-900 ${
                    online ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                  aria-label={online ? 'Online' : 'Offline'}
                />
              </span>

              {/* কনভারসেশন তথ্য */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`truncate text-sm ${isActive ? 'font-bold text-teal-900 dark:text-teal-200' : 'font-semibold text-slate-800 dark:text-slate-100'}`}>
                    {name}
                  </span>
                  <span className="shrink-0 text-[10px] font-mono text-slate-400">
                    {formatTime(c.lastMessage?.createdAt || c.updatedAt)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400 font-normal">
                    {preview}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    {unread > 0 && (
                      <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        {unread}
                      </span>
                    )}

                    {/* ডিলিট চ্যাট বাটন */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, c)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete conversation"
                      aria-label={`Delete conversation with ${name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
