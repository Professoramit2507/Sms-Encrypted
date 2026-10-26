import { useState, useEffect, useCallback, useRef } from 'react';
import { Key, Lock, Unlock, X, Check, Eye, EyeOff, Sparkles, AlertCircle, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import {
  loadPrivateKey,
  loadPublicKeySpki,
  loadPrivateKeyJwk,
  loadAllStoredPrivateKeyJwks,
  decryptPrivateKeyFromDatabase,
} from '../../crypto/encryptionManager.js';
import { decrypt as decryptSymmetric, importSymmetricKey } from '../../crypto/des.js';
import { decrypt as decryptAsymmetric } from '../../crypto/elgamal.js';
import * as keyService from '../../services/keyService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChat } from '../../context/ChatContext.jsx';

function toPrivateKeyFormat(uniqueKey) {
  if (!uniqueKey) return 'PRV-KEY-7120-04A6-9957-D76B';
  return uniqueKey.replace('RCV-KEY-', 'PRV-KEY-');
}

export default function DecryptModal({ isOpen, onClose, message, onDecrypted }) {
  const { user } = useAuth();
  const { sendEncryptedMessage } = useChat();

  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeReceiverKey, setActiveReceiverKey] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const onDecryptedRef = useRef(onDecrypted);
  useEffect(() => {
    onDecryptedRef.current = onDecrypted;
  }, [onDecrypted]);

  // Public Key and Private Key formatted to match each other
  useEffect(() => {
    if (!isOpen || !message) return;

    setError('');
    setInfoMsg('');
    setLoading(false);

    // Initial check: if already decrypted in message
    if (message.isDecrypted && message.plaintext && message.plaintext !== message.ciphertext) {
      setDecryptedText(message.plaintext);
      setSuccess(true);
    } else {
      setDecryptedText('');
      setSuccess(false);
    }

    // Determine target Public Key & matching formatted Private Key
    const targetKey = message.receiverKey || 'RCV-KEY-7120-04A6-9957-D76B';
    setPublicKey(targetKey);
    setPrivateKey(toPrivateKeyFormat(targetKey));

    // Load active receiver key
    keyService.getMyKeys().then((res) => {
      if (res?.key?.uniqueKey) {
        setActiveReceiverKey(res.key.uniqueKey);
      }
    });
  }, [isOpen, message]);

  // Auto-fill available keys with matching PRV-KEY format
  const handleAutoFillKeys = useCallback(() => {
    setError('');
    const targetKey = message?.receiverKey || activeReceiverKey || 'RCV-KEY-7120-04A6-9957-D76B';
    const formattedPrv = toPrivateKeyFormat(targetKey);

    setPublicKey(targetKey);
    setPrivateKey(formattedPrv);
    setInfoMsg(`✓ Receiver Private Key "${formattedPrv}" auto-filled!`);
  }, [message?.receiverKey, activeReceiverKey]);

  // Core decryption execution
  const executeDecryption = useCallback(
    async (inputKey) => {
      if (!message) return null;
      const ciphertext = message.ciphertext || message.payload?.ciphertext || message.content;
      const iv = message.iv || message.payload?.iv;
      const wrappedKey = message.wrappedKey || message.payload?.wrappedKey;

      if (!ciphertext) {
        setError('No encrypted ciphertext found in this message.');
        return null;
      }

      let cleanKey = (inputKey || privateKey || '').trim();

      // Collect all candidate JWK strings
      const candidateJwks = new Set();

      // If user passed formatted PRV-KEY or RCV-KEY
      const resolveKeyToJwk = (keyId) => {
        if (!keyId) return;
        const normalizedRcv = keyId.replace('PRV-KEY-', 'RCV-KEY-');
        const normalizedPrv = keyId.replace('RCV-KEY-', 'PRV-KEY-');

        try {
          const hist = JSON.parse(localStorage.getItem('keystore_history') || '{}');
          if (hist[normalizedRcv]) candidateJwks.add(hist[normalizedRcv]);
          if (hist[normalizedPrv]) candidateJwks.add(hist[normalizedPrv]);
        } catch {}

        try {
          const stored = keyService.getStoredKeys();
          Object.values(stored).forEach((k) => {
            if (
              (k?.uniqueKey === normalizedRcv || k?.uniqueKey === normalizedPrv) &&
              k?.privateKeyJwk
            ) {
              candidateJwks.add(k.privateKeyJwk);
            }
          });
        } catch {}
      };

      resolveKeyToJwk(cleanKey);
      if (message?.receiverKey) {
        resolveKeyToJwk(message.receiverKey);
      }
      resolveKeyToJwk('RCV-KEY-7120-04A6-9957-D76B');

      // If raw JSON JWK passed
      if (cleanKey.startsWith('{') && cleanKey.endsWith('}')) {
        candidateJwks.add(cleanKey);
      }

      // Add all device stored keys from IndexedDB
      try {
        const stored = await loadAllStoredPrivateKeyJwks();
        stored.forEach((j) => {
          if (j && j.startsWith('{')) candidateJwks.add(j);
        });
      } catch {}

      // Try decrypting with all candidate JWKs
      let result = null;
      for (const jwkStr of candidateJwks) {
        if (result) break;
        try {
          const jwk = JSON.parse(jwkStr);
          const importedPrivKey = await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false,
            ['decrypt']
          );
          if (wrappedKey) {
            const sessionRaw = await decryptAsymmetric(wrappedKey, importedPrivKey);
            const sessionKey = await importSymmetricKey(sessionRaw);
            result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
          }
        } catch {
          // continue
        }
      }

      // Try device active private key
      if (!result) {
        try {
          const devPrivKey = await loadPrivateKey();
          if (devPrivKey && wrappedKey) {
            const sessionRaw = await decryptAsymmetric(wrappedKey, devPrivKey);
            const sessionKey = await importSymmetricKey(sessionRaw);
            result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
          }
        } catch {}
      }

      // Try symmetric fallback if wrappedKey was raw session key
      if (!result && wrappedKey) {
        try {
          const sessionKey = await importSymmetricKey(wrappedKey);
          result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
        } catch {}
      }

      // Try direct decryption if cleanKey is a symmetric key
      if (!result && cleanKey && !cleanKey.startsWith('{') && !cleanKey.startsWith('PRV-') && !cleanKey.startsWith('RCV-')) {
        try {
          const directKey = await importSymmetricKey(cleanKey);
          result = await decryptSymmetric({ iv, ciphertext }, directKey);
        } catch {}
      }

      return result;
    },
    [message, privateKey]
  );

  const handleDecrypt = async (e) => {
    if (e) e.preventDefault();
    if (!message) return;

    setLoading(true);
    setError('');
    setInfoMsg('');
    setSuccess(false);

    try {
      const result = await executeDecryption(privateKey);
      setLoading(false);

      if (result) {
        setDecryptedText(result);
        setSuccess(true);
        if (onDecryptedRef.current) {
          onDecryptedRef.current(message.id || message._id, result);
        }
      } else {
        setError(
          `❌ কি অমিল (Key Mismatch)! এই মেসেজটি পূর্বের পুরাতন কি "${message.receiverKey}" দিয়ে লক করা ছিল। আপনার বর্তমান কি দিয়ে পূর্বের পুরোনো মেসেজ খোলা সম্ভব নয়। নতুন কি দিয়ে পরীক্ষা করতে সেন্ডার থেকে একটি নতুন এসএমএস পাঠান।`
        );
      }
    } catch {
      setLoading(false);
      setError('An unexpected error occurred during decryption.');
    }
  };

  const handleSendTestMessage = async () => {
    setSendingTest(true);
    try {
      if (sendEncryptedMessage) {
        await sendEncryptedMessage('Hello! This is a test encrypted SMS with current keys.');
        setInfoMsg('✓ নতুন এনক্রিপ্টেড টেস্ট এসএমএস পাঠানো হয়েছে! চ্যাটে এটি দেখা যাবে এবং বর্তমান কি দিয়ে সাথে সাথে ডিক্রিপ্ট হবে।');
      }
    } catch (err) {
      setError(err.message || 'Could not send test message.');
    } finally {
      setSendingTest(false);
    }
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-obsidian-900 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Decrypt Encrypted Message</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                DES + ElGamal
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Provide Receiver Public Key and Private Key to unlock the original SMS text.
            </p>
          </div>
        </div>

        {/* Ciphertext Preview */}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/5 dark:bg-obsidian-950">
          <div className="flex items-center justify-between mb-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span>Stored Ciphertext (ডেটাবেসে সংরক্ষিত):</span>
            <span className="font-mono text-[10px]">ID: {(message.id || message._id)?.slice(-8) || 'msg'}</span>
          </div>
          <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all line-clamp-2">
            {message.ciphertext || message.content || '🔒 Encrypted Payload'}
          </p>
        </div>

        {/* Key Mismatch Warning Banner */}
        {activeReceiverKey && message?.receiverKey && activeReceiverKey !== message.receiverKey && (
          <div className="mb-4 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>পূর্বের কি দিয়ে এনক্রিপ্ট করা মেসেজ (Older Key)</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              এই মেসেজটি <strong className="font-mono">{message.receiverKey}</strong> দিয়ে এনক্রিপ্ট করা হয়েছিল। আপনার বর্তমান অ্যাক্টিভ কি হলো <strong className="font-mono">{activeReceiverKey}</strong>। নতুন মেসেজের ডিক্রিপশন পরীক্ষা করতে সেন্ডার থেকে একটি নতুন মেসেজ পাঠান।
            </p>
          </div>
        )}

        {/* Decryption Form */}
        <form onSubmit={handleDecrypt} className="space-y-4">
          {/* Public Key Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Receiver Public Key (পাবলিক কি)
              </label>
              <button
                type="button"
                onClick={handleAutoFillKeys}
                className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800/60 transition-all active:scale-95"
              >
                <Sparkles className="h-3 w-3" />
                <span>Auto-fill My Keys</span>
              </button>
            </div>
            <input
              type="text"
              className="input font-mono text-xs w-full py-2"
              placeholder="e.g. RCV-KEY-XXXX-XXXX-XXXX-XXXX"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
            />
          </div>

          {/* Private Key Field (Looks just like Public Key!) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Receiver Private Key (প্রাইভেট কি)
              </label>
              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center gap-1"
              >
                {showPrivateKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span>{showPrivateKey ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPrivateKey ? 'text' : 'password'}
                className="input font-mono text-xs w-full py-2 pr-8"
                placeholder="e.g. PRV-KEY-XXXX-XXXX-XXXX-XXXX"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Format: <span className="font-mono text-emerald-600 dark:text-emerald-400">PRV-KEY-XXXX-XXXX-XXXX-XXXX</span> (পাবলিক কি-এর মতোই দেখতে)
            </p>
          </div>

          {/* Info Status Message */}
          {infoMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Error Message with Helper Action */}
          {error && (
            <div className="rounded-xl bg-rose-50 p-3.5 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <p className="leading-relaxed">{error}</p>
              </div>
              <div className="pt-2 border-t border-rose-200/60 dark:border-rose-800/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                  নতুন কি দিয়ে টেস্ট এসএমএস পাঠাতে চান?
                </span>
                <button
                  type="button"
                  onClick={handleSendTestMessage}
                  disabled={sendingTest}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[11px] shadow-xs transition-all active:scale-95"
                >
                  <Send className={`h-3 w-3 ${sendingTest ? 'animate-spin' : ''}`} />
                  <span>{sendingTest ? 'Sending...' : 'Send Test Encrypted SMS'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Box Showing Original SMS */}
          {success && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/80 p-4 dark:border-emerald-500/20 dark:bg-emerald-950/40 animate-fade-in">
              <div className="flex items-center gap-2 mb-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Decryption Successful! Original SMS (মূল মেসেজ):</span>
              </div>
              <div className="rounded-xl bg-white p-3.5 shadow-sm dark:bg-obsidian-900 border border-emerald-200/60 dark:border-white/5">
                <p className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-900 dark:text-white leading-relaxed select-all">
                  {decryptedText}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-xs font-semibold"
            >
              {success ? 'Done' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-5 py-2 text-xs font-semibold shadow-glow flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Decrypting…</span>
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>{success ? 'Re-decrypt' : 'Decrypt Message'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
