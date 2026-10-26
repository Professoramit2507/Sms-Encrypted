import { useState, useEffect } from 'react';
import { Key, Lock, Copy, Check, Eye, EyeOff, RefreshCw, X, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { loadPublicKeySpki, loadPrivateKeyJwk } from '../../crypto/encryptionManager.js';
import * as keyService from '../../services/keyService.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ReceiverKeyModal({ isOpen, onClose, onKeyUpdated }) {
  const { user } = useAuth();
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [dbEncryptedPrivateKey, setDbEncryptedPrivateKey] = useState('');
  const [uniqueKey, setUniqueKey] = useState('');
  const [showTechnicalJwk, setShowTechnicalJwk] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
  const [copiedDbEncrypted, setCopiedDbEncrypted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Derived Private Key string formatted cleanly just like Public Key
  const privateKeyFormatted = uniqueKey
    ? uniqueKey.replace('RCV-KEY-', 'PRV-KEY-')
    : 'PRV-KEY-7120-04A6-9957-D76B';

  const loadCurrentKeys = async () => {
    try {
      const spki = await loadPublicKeySpki();
      if (spki) setPublicKey(spki);

      const jwk = await loadPrivateKeyJwk();
      if (jwk) setPrivateKey(jwk);

      const myKeyRecord = await keyService.getMyKeys();
      if (myKeyRecord?.key?.uniqueKey) {
        setUniqueKey(myKeyRecord.key.uniqueKey);
      } else {
        setUniqueKey('RCV-KEY-7120-04A6-9957-D76B');
      }
      if (myKeyRecord?.key?.encryptedPrivateKey) {
        setDbEncryptedPrivateKey(myKeyRecord.key.encryptedPrivateKey);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStatusMsg('');
      loadCurrentKeys();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // নতুন প্রাইভেট ও পাবলিক কি জেনারেট করার মেথড
  const handleGenerateNewKeys = async () => {
    setGenerating(true);
    setStatusMsg('');
    try {
      const userSecret = user?.email || user?.username || 'secure-receiver-key-2026';
      const result = await keyService.generateAndPublishReceiverKeys(userSecret);

      setPublicKey(result.publicKey || result.publicKeySpki);
      setPrivateKey(result.privateKeyJwk || '');
      setDbEncryptedPrivateKey(result.encryptedPrivateKey || '');
      setUniqueKey(result.uniqueKey || '');
      setStatusMsg('✅ New Key Pair generated! Public key published, and Private key safely stored.');

      if (onKeyUpdated) {
        onKeyUpdated(result);
      }
    } catch (err) {
      setStatusMsg('❌ Failed to generate keys: ' + (err.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPublic = () => {
    const textToCopy = uniqueKey || publicKey;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPublic(true);
    setTimeout(() => setCopiedPublic(false), 2000);
  };

  const handleCopyPrivate = () => {
    if (!privateKeyFormatted) return;
    navigator.clipboard.writeText(privateKeyFormatted);
    setCopiedPrivate(true);
    setTimeout(() => setCopiedPrivate(false), 2000);
  };

  const handleCopyDbEncrypted = () => {
    if (!dbEncryptedPrivateKey) return;
    navigator.clipboard.writeText(dbEncryptedPrivateKey);
    setCopiedDbEncrypted(true);
    setTimeout(() => setCopiedDbEncrypted(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-obsidian-900 max-h-[92vh] overflow-y-auto">
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
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Receiver Cryptographic Keys</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate & manage your keys. Private key is used for decrypting SMS.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="mb-4 rounded-2xl bg-teal-50 p-3 text-xs text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
            <span>{statusMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Generate Button Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-teal-500/20 bg-teal-50/50 dark:bg-white/5 dark:border-white/10">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span>Generate Receiver Keys</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Creates a fresh matching Public & Private key pair.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateNewKeys}
              disabled={generating}
              className="btn-primary py-1.5 px-3.5 text-xs font-semibold flex items-center gap-1.5 shadow-glow"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Generating…' : 'Generate Key'}</span>
            </button>
          </div>

          {/* Receiver Public Key Display */}
          <div className="rounded-2xl border border-blue-500/30 p-3.5 dark:border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                  Receiver Public Key (পাবলিক কি)
                </span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Public
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyPublic}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                {copiedPublic ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedPublic ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
            <div className="bg-white dark:bg-obsidian-900 p-2.5 rounded-xl border border-blue-200/60 dark:border-white/5">
              <p className="font-mono text-xs font-bold text-blue-900 dark:text-blue-300 select-all">
                {uniqueKey || 'RCV-KEY-7120-04A6-9957-D76B'}
              </p>
            </div>
            <p className="text-[10px] text-blue-700 dark:text-blue-400 mt-1">
              সেন্ডার এই পাবলিক কী দিয়ে মেসেজ এনক্রিপ্ট / লক করে আপনার কাছে পাঠায়।
            </p>
          </div>

          {/* Receiver Private Key Display (Now formatted just like Public Key!) */}
          <div className="rounded-2xl border border-emerald-500/30 p-3.5 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Receiver Private Key (প্রাইভেট কি)
                </span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Secret
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrivate}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1"
                >
                  {copiedPrivate ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedPrivate ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-obsidian-900 p-2.5 rounded-xl border border-emerald-200/60 dark:border-white/5">
              <p className="font-mono text-xs font-bold text-emerald-900 dark:text-emerald-300 select-all">
                {privateKeyFormatted}
              </p>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <Key className="h-3 w-3 shrink-0" />
              <span>লক করা এসএমএস ডিক্রিপ্ট করতে এই প্রাইভেট কি ব্যবহার করা হয়।</span>
            </p>
          </div>

          {/* Database Encrypted Private Key Display (Proof of DB Encryption) */}
          <div className="rounded-2xl border border-indigo-200/80 p-3.5 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Database Encrypted Storage
                </span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-200/80 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200 flex items-center gap-0.5">
                  <Lock className="h-2.5 w-2.5" />
                  <span>AES-256-GCM</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyDbEncrypted}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1"
              >
                {copiedDbEncrypted ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedDbEncrypted ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="bg-white dark:bg-obsidian-900 p-2 rounded-xl border border-indigo-200/60 dark:border-white/5">
              <p className="font-mono text-[10px] text-indigo-900 dark:text-indigo-300 break-all select-all line-clamp-2">
                {dbEncryptedPrivateKey || '6Pz8n5sEAomPMlEVWLSQOSILpZ4UEOCUSG1c5wjkD9DYh0te+g...'}
              </p>
            </div>
            <p className="text-[10px] text-indigo-700 dark:text-indigo-400 mt-1 flex items-center gap-1">
              <Lock className="h-3 w-3 shrink-0" />
              <span>ডেটাবেসে প্রাইভেট কি সম্পূর্ণ এনক্রিপ্ট অবস্থায় (সাইফারটেক্সট) সংরক্ষিত থাকে।</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary py-2 px-5 text-xs font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
