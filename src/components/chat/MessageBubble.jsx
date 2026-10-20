import { Check, CheckCheck, Lock, Key } from 'lucide-react';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageBubble({ message, outgoing }) {
  const status = message.status || 'delivered';
  const receiverKey = message.receiverKey || message.payload?.receiverKey;

  return (
    <div className={`flex w-full my-1 ${outgoing ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[82%] sm:max-w-[70%] px-3.5 py-2 text-sm shadow-sm transition-all ${
          outgoing
            ? 'rounded-2xl rounded-tr-xs bg-[#d9fdd3] text-[#111b21] dark:bg-[#005c4b] dark:text-[#e9edef] border border-[#baf0b0]/50 dark:border-none'
            : 'rounded-2xl rounded-tl-xs bg-white text-[#111b21] dark:bg-[#202c33] dark:text-[#e9edef] border border-slate-200/80 dark:border-none'
        }`}
      >
        {/* মেসেজ টেক্সট */}
        {message.decryptError ? (
          <p className="italic opacity-80 text-rose-500">This message could not be decrypted on this device.</p>
        ) : (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.plaintext || message.content}</p>
        )}

        {/* ফুটার: এনক্রিপশন স্ট্যাটাস, রিসিভারের ইউনিক কী ও টাইমস্ট্যাম্প */}
        <div
          className={`mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[10px] select-none ${
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
          {message.encrypted && !message.decryptError && (
            <span className="inline-flex items-center gap-0.5" title="End-to-End Encrypted">
              <Lock className="h-2.5 w-2.5" aria-hidden />
            </span>
          )}

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
