import { Check, CheckCheck, Lock, Unlock, Key } from 'lucide-react';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, outgoing, onDecryptClick }) {
  const status = message.status || 'delivered';
  const receiverKey = message.receiverKey || message.payload?.receiverKey;
  const isDecrypted = outgoing || message.isDecrypted;
  const displayText = message.plaintext || message.content;

  return (
    <div className={`flex w-full my-1.5 ${outgoing ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 text-sm shadow-sm transition-all ${
          outgoing
            ? 'rounded-2xl rounded-tr-xs bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] border border-[#baf0b0]/50 dark:border-none'
            : 'rounded-2xl rounded-tl-xs bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] border border-slate-200/80 dark:border-none'
        }`}
      >
        {/* মেসেজ বডি */}
        {isDecrypted ? (
          <div>
            <p className="whitespace-pre-wrap break-words leading-relaxed">{displayText}</p>
            {!outgoing && (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <Unlock className="h-3 w-3" />
                <span>Decrypted original SMS</span>
              </div>
            )}
          </div>
        ) : (
          /* রিসিভারের কাছে আসা এনক্রিপ্টেড মেসেজ কার্ড */
          <div className="space-y-2 py-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span>Encrypted SMS (লক করা মেসেজ)</span>
            </div>
            
            <div className="rounded-xl bg-slate-100/90 dark:bg-black/30 p-2 border border-slate-200/60 dark:border-white/5">
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                Ciphertext (এনক্রিপ্টেড কোড):
              </span>
              <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all select-all line-clamp-2">
                {message.ciphertext || message.content || '🔒 Encrypted Payload'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onDecryptClick?.(message)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Key className="h-3.5 w-3.5" />
              <span>Decrypt SMS (পাবলিক ও প্রাইভেট কি দিন)</span>
            </button>
          </div>
        )}

        {/* ফুটার: এনক্রিপশন স্ট্যাটাস, রিসিভারের ইউনিক কী ও টাইমস্ট্যাম্প */}
        <div
          className={`mt-1.5 flex flex-wrap items-center justify-end gap-1.5 text-[10px] select-none ${
            outgoing ? 'text-slate-600 dark:text-emerald-200/90' : 'text-slate-400 dark:text-slate-400'
          }`}
        >
          {/* রিসিভারের ইউনিক কী ব্যাজ */}
          {receiverKey && (
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-mono font-medium ${
                outgoing
                  ? 'bg-emerald-600/10 text-emerald-800 dark:bg-emerald-300/15 dark:text-emerald-200'
                  : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
              }`}
              title={`Encrypted for Receiver with Key: ${receiverKey}`}
            >
              <Key className="h-2.5 w-2.5" />
              <span>{receiverKey.length > 18 ? `${receiverKey.slice(0, 15)}…` : receiverKey}</span>
            </span>
          )}

          {/* এনক্রিপশন লক আইকন */}
          <span className="inline-flex items-center gap-0.5" title={isDecrypted ? 'Decrypted' : 'End-to-End Encrypted'}>
            {isDecrypted ? <Unlock className="h-2.5 w-2.5 text-emerald-600" /> : <Lock className="h-2.5 w-2.5 text-amber-500" />}
          </span>

          {/* টাইম */}
          <span>{formatTime(message.createdAt)}</span>

          {/* আউটগোয়িং মেসেজের জন্য হোয়াটসঅ্যাপ স্টাইল টিক চিহ্ন */}
          {outgoing && (
            <span
              className="inline-flex items-center"
              aria-label={status === 'read' ? 'Read' : status === 'delivered' ? 'Delivered' : 'Sent'}
            >
              {status === 'read' ? (
                <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
              ) : status === 'delivered' ? (
                <CheckCheck className="h-3.5 w-3.5 text-slate-500 dark:text-emerald-300" />
              ) : (
                <Check className="h-3.5 w-3.5 text-slate-400 dark:text-emerald-300" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
