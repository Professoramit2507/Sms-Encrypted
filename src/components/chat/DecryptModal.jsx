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

  useEffect(() => {
    if (isOpen) {
      setError('');
      setDecryptedText('');
      setSuccess(false);

      // Pre-fill public key if available from the message or receiver
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
      const spki = await loadPublicKeySpki();
      if (spki) {
        setPublicKey(spki);
      } else if (message.receiverKey) {
        setPublicKey(message.receiverKey);
      }

      const jwkStr = await loadPrivateKeyJwk();
      if (jwkStr) {
        setPrivateKey(jwkStr);
      } else {
        setError('No private key found on this device keystore.');
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

    let result = null;

    // 1. Try parsing privateKey as JWK JSON
    try {
      const cleanKey = privateKey.trim();
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

    // 2. Try using the loaded device private key
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

    // 3. Try decrypting encrypted private key with privateKey as password/secret
    if (!result) {
      try {
        const myKeyRes = await keyService.getMyKeys();
        if (myKeyRes?.key?.encryptedPrivateKey) {
          const decryptedPrivKey = await decryptPrivateKeyFromDatabase(myKeyRes.key, privateKey.trim());
          if (wrappedKey) {
            const sessionRaw = await decryptAsymmetric(wrappedKey, decryptedPrivKey);
            const sessionKey = await importSymmetricKey(sessionRaw);
            result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
          }
        }
      } catch {
        // Continue to next method
      }
    }

    // 4. Try symmetric fallback if wrappedKey was raw session key
    if (!result && wrappedKey) {
      try {
        const sessionKey = await importSymmetricKey(wrappedKey);
        result = await decryptSymmetric({ iv, ciphertext }, sessionKey);
      } catch {
        // Fallback failed
      }
    }

    // 5. Try decrypting directly with privateKey as symmetric key
    if (!result) {
      try {
        const directKey = await importSymmetricKey(privateKey.trim());
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
      setError('❌ Decryption failed! The provided Public Key or Private Key is incorrect or does not match this message.');
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
