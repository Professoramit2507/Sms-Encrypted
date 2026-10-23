import { useState, useEffect } from 'react';
import { Key, Lock, Unlock, X, Check, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import {
  loadPrivateKey,
  loadPublicKeySpki,
  loadPrivateKeyJwk,
  decryptReceivedMessage,
  decryptPrivateKeyFromDatabase,
} from '../../crypto/encryptionManager.js';
import { decrypt as decryptSymmetric, importSymmetricKey } from '../../crypto/des.js';
import { decrypt as decryptAsymmetric } from '../../crypto/elgamal.js';
import * as keyService from '../../services/keyService.js';

export default function DecryptModal({ isOpen, onClose, message, onDecrypted }) {
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [decryptedText, setDecryptedText] = useState('');
  const [success, setSuccess] = useState(false);

  const [activeReceiverKey, setActiveReceiverKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setDecryptedText('');
      setSuccess(false);

      keyService.getMyKeys().then((res) => {
        if (res?.key?.uniqueKey) setActiveReceiverKey(res.key.uniqueKey);
      });

      if (message?.receiverKey) {
        setPublicKey(message.receiverKey);
      } else {
        loadPublicKeySpki().then((spki) => {
          if (spki) setPublicKey(spki);
        });
      }
    }
  }, [isOpen, message]);

  if (!isOpen || !message) return null;

  const handleAutoFillKeys = async () => {
    setError('');
    try {
      let spki = await loadPublicKeySpki();
      let jwkStr = await loadPrivateKeyJwk();

      // Check localStorage mock keys if indexedDB didn't have it
      if (!jwkStr || !spki) {
        const myKeys = await keyService.getMyKeys();
        if (myKeys?.key?.privateKeyJwk) {
          jwkStr = myKeys.key.privateKeyJwk;
          if (myKeys.key.publicKey) spki = myKeys.key.publicKey;
        }
      }

      // Check if message.receiverKey matches any stored key
      if (!jwkStr && message?.receiverKey) {
        const stored = keyService.getStoredKeys();
        const found = Object.values(stored).find(
          (k) => k?.uniqueKey === message.receiverKey || k?.publicKey === message.receiverKey
        );
        if (found?.privateKeyJwk) {
          jwkStr = found.privateKeyJwk;
          if (found.publicKey) spki = found.publicKey;
        }
      }

      if (spki) {
        setPublicKey(spki);
      } else if (message?.receiverKey) {
        setPublicKey(message.receiverKey);
      }

      if (jwkStr) {
        setPrivateKey(jwkStr);
      } else {
        setError('No private key found on this device keystore. Please open "Receiver Keys" and click "Generate Key" first.');
      }
    } catch {
      setError('Could not auto-load device keys.');
    }
  };

  const handleDecrypt = async (e) => {
    e.preventDefault();
    if (!privateKey.trim()) {
      setError('Please provide the Receiver Private Key to decrypt this SMS.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    const ciphertext = message.ciphertext || message.payload?.ciphertext || message.content;
    const iv = message.iv || message.payload?.iv;
    const wrappedKey = message.wrappedKey || message.payload?.wrappedKey;

    if (!ciphertext) {
      setError('No encrypted ciphertext found in this message.');
      setLoading(false);
      return;
    }

    let cleanKey = privateKey.trim();

    // Check if user accidentally entered the Unique Key ID (RCV-KEY-...) or Public Key
    if (cleanKey.startsWith('RCV-KEY') || cleanKey.startsWith('spki-')) {
      const stored = keyService.getStoredKeys();
      const match = Object.values(stored).find(
        (k) => k?.uniqueKey === cleanKey || k?.publicKey === cleanKey || k?.userId === cleanKey
      );
      if (match?.privateKeyJwk) {
        cleanKey = match.privateKeyJwk;
        setPrivateKey(cleanKey);
      } else {
        setError(`⚠️ "${cleanKey}" is a Public Key / Unique Key ID, not a Private Key. The Private Key is the JSON string (JWK) from the "Receiver Keys" modal. Please paste the Private Key or click "Auto-fill My Keys".`);
        setLoading(false);
        return;
      }
    }

    // Handle quoted strings
    if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
      try {
        cleanKey = JSON.parse(cleanKey);
      } catch {
        cleanKey = cleanKey.slice(1, -1);
      }
    }

    let result = null;

    // 1. Try parsing cleanKey as JWK JSON
    try {
      if (cleanKey.startsWith('{') && cleanKey.endsWith('}')) {
        const jwk = JSON.parse(cleanKey);
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
      }
    } catch {
      // Continue to next method
    }

    // 2. Try using the loaded device private key from keystore
    if (!result) {
      try {
        const devPrivKey = await loadPrivateKey();
        if (devPrivKey && wrappedKey) {
          const sessionRaw = await decryptAsymmetric(wrappedKey, devPrivKey);
          const sessionKey = await importSymmetricKey(sessionRaw);
          result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
        }
      } catch {
        // Continue to next method
      }
    }

    // 3. Try stored key matching message.receiverKey
    if (!result && message?.receiverKey) {
      try {
        const stored = keyService.getStoredKeys();
        const match = Object.values(stored).find(
          (k) => k?.uniqueKey === message.receiverKey || k?.publicKey === message.receiverKey
        );
        if (match?.privateKeyJwk) {
          const jwk = JSON.parse(match.privateKeyJwk);
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
        }
      } catch {
        // Continue
      }
    }

    // 4. Try decrypting encrypted private key with cleanKey as password/secret
    if (!result) {
      try {
        const myKeyRes = await keyService.getMyKeys();
        if (myKeyRes?.key?.encryptedPrivateKey) {
          const decryptedPrivKey = await decryptPrivateKeyFromDatabase(myKeyRes.key, cleanKey);
          if (wrappedKey) {
            const sessionRaw = await decryptAsymmetric(wrappedKey, decryptedPrivKey);
            const sessionKey = await importSymmetricKey(sessionRaw);
            result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
          }
        }
      } catch {
        // Continue
      }
    }

    // 5. Try symmetric fallback if wrappedKey was raw session key
    if (!result && wrappedKey) {
      try {
        const sessionKey = await importSymmetricKey(wrappedKey);
        result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
      } catch {
        // Fallback failed
      }
    }

    // 6. Try decrypting directly with cleanKey as symmetric key
    if (!result) {
      try {
        const directKey = await importSymmetricKey(cleanKey);
        result = await decryptSymmetric({ iv, ciphertext }, directKey);
      } catch {
        // Failed
      }
    }

    setLoading(false);

    if (result) {
      setDecryptedText(result);
      setSuccess(true);
      if (onDecrypted) {
        onDecrypted(message.id, result);
      }
    } else {
      // Diagnostic error message to guide the user
      const isLikelyCiphertext = cleanKey.length > 30 && !cleanKey.startsWith('{') && /^[A-Za-z0-9+/=:]+$/.test(cleanKey);
      if (isLikelyCiphertext) {
        setError('❌ You pasted the Database Encrypted Private Key (সাইফারটেক্সট) instead of the actual Private Key. Please copy the "Receiver Decryption Key" (JWK format) or click "Auto-fill My Keys".');
      } else if (message?.receiverKey) {
        setError(`❌ Decryption failed! Key mismatch: This message was encrypted for Receiver Key "${message.receiverKey}". If your keys were regenerated after this message was sent, the new private key cannot decrypt older messages. Please send a new message with the current keys.`);
      } else {
        setError('❌ Decryption failed! The provided Public Key or Private Key is incorrect or does not match this message.');
      }
    }
  };

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
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400 border border-teal-500/20">
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
            <span className="font-mono text-[10px]">ID: {message.id?.slice(-8) || 'msg'}</span>
          </div>
          <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all select-all line-clamp-3">
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
                className="text-[11px] font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                <span>Auto-fill My Keys</span>
              </button>
            </div>
            <textarea
              rows={2}
              className="input font-mono text-xs w-full resize-none"
              placeholder="Paste Receiver Public Key or Unique Key (e.g. RCV-KEY-...)"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
            />
          </div>

          {/* Private Key Field */}
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
              <textarea
                rows={3}
                className="input font-mono text-xs w-full resize-none pr-8"
                placeholder='Paste Receiver Private Key JWK string, private key secret, or click "Auto-fill My Keys"'
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                type={showPrivateKey ? 'text' : 'password'}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Only the receiver possessing this private key can decrypt this message.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
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
                <span>Decrypting…</span>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  <span>Decrypt Message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
