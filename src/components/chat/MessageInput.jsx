import { useState } from 'react';
import { Send, Shield, Smile } from 'lucide-react';
import { validateMessage } from '../../utils/validation.js';

export default function MessageInput({ disabled, sending, onSend }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const err = validateMessage(text);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    await onSend(text.trim());
    setText('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !sending) submit();
    }
  };

  return (
    <div className="p-3">
      <label htmlFor="message" className="sr-only">
        Message
      </label>
      <div className="flex items-center gap-2">
        {/* ইমোজি / সিকিউরিটি ডেকোরেশন */}
        <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-teal-600 transition-colors">
          <Shield className="h-4 w-4" />
        </div>

        {/* টেক্সট ইনপুট */}
        <div className="relative flex-1">
          <textarea
            id="message"
            rows={1}
            className="w-full rounded-2xl border border-slate-200/90 bg-slate-100/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-obsidian-850 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400 dark:focus:bg-obsidian-800 resize-none transition-all"
            placeholder="Type an encrypted message…"
            value={text}
            disabled={disabled || sending}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        {/* সেন্ড বাটন */}
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/20 hover:from-teal-700 hover:to-emerald-700 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
          onClick={submit}
          disabled={disabled || sending || !text.trim()}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Encrypted before sending
        </span>
        <span className="hidden sm:inline text-[10px]">Enter to send · Shift+Enter for new line</span>
      </div>

      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
}
