import { useEffect, useRef, useState } from 'react';
import { Lock, ArrowLeft, Key, Copy, Check, RefreshCw, ArrowLeftRight, ShieldCheck, KeyRound } from 'lucide-react';
import MessageBubble from './MessageBubble.jsx';
import MessageInput from './MessageInput.jsx';
import DecryptModal from './DecryptModal.jsx';
import ReceiverKeyModal from './ReceiverKeyModal.jsx';
import Loader from '../common/Loader.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChat } from '../../context/ChatContext.jsx';
import { getReceiverUniqueKey, regenerateReceiverUniqueKey } from '../../services/keyService.js';
import { notifySync } from '../../services/messageService.js';

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export default function ChatWindow({
  contact,
  messages,
  loading,
  sending,
  error,
  onSend,
  onBack,
}) {
  const { user, updateUser } = useAuth();
  const { markMessageDecrypted } = useChat();
  const bottomRef = useRef(null);
  const [receiverKey, setReceiverKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // ডিক্রিপ্ট পপআপ মোডাল স্টেট
  const [activeDecryptMessage, setActiveDecryptMessage] = useState(null);
  const [decryptModalOpen, setDecryptModalOpen] = useState(false);

  // রিসিভার কি-ম্যানেজমেন্ট মোডাল স্টেট
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  // রিসিভারের আইডি বের করা
  const contactId = contact?.id || contact?.userId || (user?.id === 'c1' ? 'demo-user-1' : 'c1');

  // রিসিভারের ইউনিক কী লোড করা
  useEffect(() => {
    if (!contactId) return;
    let active = true;

    getReceiverUniqueKey(contactId).then((keyData) => {
      if (active) setReceiverKey(keyData);
    });

    const handleSync = () => {
      getReceiverUniqueKey(contactId).then((keyData) => {
        if (active) setReceiverKey(keyData);
      });
    };

    window.addEventListener('secure-sms-sync', handleSync);
    return () => {
      active = false;
      window.removeEventListener('secure-sms-sync', handleSync);
    };
  }, [contactId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ইউনিক কী কপি করার হ্যান্ডলার
  const handleCopyKey = () => {
    if (!receiverKey?.uniqueKey) return;
    navigator.clipboard.writeText(receiverKey.uniqueKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // রিসিভারের জন্য নতুন ইউনিক কী জেনারেট করার হ্যান্ডলার
  const handleRegenerateKey = async () => {
    if (regenerating || !contactId) return;
    setRegenerating(true);
    try {
      const freshKey = await regenerateReceiverUniqueKey(contactId);
      setReceiverKey(freshKey);
      notifySync();
    } catch {
      // ignore
    } finally {
      setRegenerating(false);
    }
  };

  // টেস্টের সুবিধার্থে সেন্ডার ও রিসিভার ভিউ সুইচ করার হ্যান্ডলার
  const handleSwitchUserRole = () => {
    if (user?.id === 'c1') {
      const senderUser = {
        id: 'demo-user-1',
        fullName: 'Sender Demo',
        username: 'sender',
        email: 'sender@gmail.com',
      };
      localStorage.setItem('mock_current_user', JSON.stringify(senderUser));
      updateUser(senderUser);
    } else {
      const receiverUser = {
        id: 'c1',
        fullName: 'Alice Johnson (Receiver)',
        username: 'alice',
        email: 'alice@gmail.com',
      };
      localStorage.setItem('mock_current_user', JSON.stringify(receiverUser));
      updateUser(receiverUser);
    }
    notifySync();
  };

  // ডিক্রিপ্ট পপআপ ওপেন করার হ্যান্ডলার
  const handleOpenDecryptModal = (msg) => {
    setActiveDecryptMessage(msg);
    setDecryptModalOpen(true);
  };

  // সফলভাবে মেসেজ ডিক্রিপ্ট হওয়ার পর চ্যাটে আপডেট করার হ্যান্ডলার
  const handleDecryptedSuccess = (messageId, decryptedText) => {
    markMessageDecrypted(messageId, decryptedText);
  };

  if (!contact) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#f8fafc] p-6 text-center dark:bg-obsidian-950">
        <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-teal-500/20 via-emerald-500/10 to-transparent p-0.5 shadow-xl shadow-teal-500/10">
          <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-white dark:bg-obsidian-900 border border-teal-500/20">
            <ShieldCheck className="h-10 w-10 text-teal-600 dark:text-teal-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">Secure SMS Messenger</h2>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Select a conversation from the sidebar to start chatting. Every session is protected with unique cryptographic receiver keys.
        </p>
      </div>
    );
  }

  const name = contact.fullName || contact.username || 'Contact';
  const isCurrentUserSender = user?.id !== 'c1';

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 dark:bg-obsidian-950">
      {/* গ্লাস হেডার */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-obsidian-900/90 shadow-2xs z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              className="btn-ghost h-9 w-9 p-0 lg:hidden"
              onClick={onBack}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-xs font-bold text-teal-800 dark:from-teal-400/25 dark:to-emerald-400/25 dark:text-teal-200 border border-teal-500/20">
            {initials(name)}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-obsidian-900" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white leading-tight">{name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {contact.username ? `@${contact.username}` : 'online'} · End-to-end encrypted
            </p>
          </div>
        </div>

        {/* ডান পাশের ইউনিক কী এবং রোল টগল */}
        <div className="flex flex-wrap items-center gap-2">
          {/* রিসিভারের নিজস্ব কি জেনারেট ও দেখার বাটন */}
          <button
            type="button"
            onClick={() => setKeyModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-500/20 transition-all shadow-2xs active:scale-95"
            title="Generate & View Receiver Keys (Private Key is stored encrypted in DB)"
          >
            <KeyRound className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>Generate & View Keys</span>
          </button>

          {/* রিসিভারের ইউনিক কী ব্যাজ */}
          <div
            className="flex items-center gap-1.5 rounded-full border border-teal-300/80 bg-gradient-to-r from-teal-50 to-emerald-50/80 px-3 py-1 text-xs font-mono font-medium text-teal-900 dark:border-teal-700/60 dark:from-teal-950/70 dark:to-emerald-950/70 dark:text-teal-300 shadow-2xs"
            title={`Receiver Unique Key: ${receiverKey?.uniqueKey || 'Generating...'}`}
          >
            <Key className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 hidden sm:inline">
              Receiver Key:
            </span>
            <span className="font-bold tracking-tight font-mono text-[11px]">
              {receiverKey?.uniqueKey
                ? receiverKey.uniqueKey.slice(0, 16) + '…'
                : 'Generating…'}
            </span>
            <button
              type="button"
              onClick={handleCopyKey}
              className="ml-0.5 rounded-md p-1 hover:bg-teal-200/60 dark:hover:bg-teal-800/60 transition-colors"
              title="Copy Unique Key"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="rounded-md p-1 hover:bg-teal-200/60 dark:hover:bg-teal-800/60 transition-colors"
              title="Generate New Unique Key for Receiver"
            >
              <RefreshCw className={`h-3 w-3 ${regenerating ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* রোল সুইচার */}
          <button
            type="button"
            onClick={handleSwitchUserRole}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all dark:border-white/10 dark:bg-obsidian-900 dark:text-slate-200 dark:hover:bg-obsidian-850 shadow-2xs active:scale-95"
            title="Toggle between Sender and Receiver view to verify bubble positions"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
            <span>
              View as: <strong className="font-bold text-teal-700 dark:text-teal-300">{isCurrentUserSender ? 'Sender' : 'Receiver'}</strong>
            </span>
          </button>
        </div>
      </header>

      {/* চ্যাট স্ক্রিন (WhatsApp ওয়ালপেপার ব্যাকগ্রাউন্ড) */}
      <div className="whatsapp-wallpaper chat-scroll flex-1 space-y-1.5 overflow-y-auto px-4 sm:px-6 py-4">
        {/* এনক্রিপশন নোটিশ */}
        <div className="my-2 flex justify-center">
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50/90 px-3.5 py-1.5 text-center text-xs text-amber-900 shadow-2xs dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800/50 max-w-md backdrop-blur-xs">
            <Lock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Messages are secured. Receiver holds unique key{' '}
              <span className="font-mono font-bold text-amber-950 dark:text-amber-100">{receiverKey?.uniqueKey ? receiverKey.uniqueKey.slice(0, 16) + '…' : 'Generating...'}</span>
            </span>
          </div>
        </div>

        {loading && <Loader compact label="Loading messages" />}

        {!loading && messages.length === 0 && (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-100/50 dark:bg-white/5 text-teal-600">
              <Lock className="h-5 w-5" />
            </div>
            <p>No messages yet. Send a message to start this encrypted conversation!</p>
          </div>
        )}

        {/* মেসেজ বাবলস */}
        {messages.map((m) => {
          const outgoing = m.senderId === user?.id;
          return (
            <MessageBubble
              key={m.id}
              message={m}
              outgoing={outgoing}
              onDecryptClick={handleOpenDecryptModal}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-4 mb-2 alert-error" role="alert">
          {error}
        </p>
      )}

      {/* মেসেজ ইনপুট বার */}
      <div className="border-t border-slate-200/80 bg-white/90 p-2 backdrop-blur-md dark:border-white/10 dark:bg-obsidian-900/90 z-10">
        <MessageInput disabled={!contact} sending={sending} onSend={onSend} />
      </div>

      {/* ডিক্রিপ্ট পপআপ মোডাল */}
      <DecryptModal
        isOpen={decryptModalOpen}
        onClose={() => setDecryptModalOpen(false)}
        message={activeDecryptMessage}
        onDecrypted={handleDecryptedSuccess}
      />

      {/* রিসিভার কি-ম্যানেজমেন্ট ও জেনারেশন মোডাল */}
      <ReceiverKeyModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onKeyUpdated={(newKey) => {
          setReceiverKey(newKey);
          notifySync();
        }}
      />
    </div>
  );
}
