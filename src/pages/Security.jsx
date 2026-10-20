import { useEffect, useState } from 'react';
import { Key } from 'lucide-react';
import AppShell from '../components/common/AppShell.jsx';
import KeyStatus from '../components/security/KeyStatus.jsx';
import SecurityInfo from '../components/security/SecurityInfo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { regenerateKeys } from '../crypto/encryptionManager.js';
import { updatePublicKey, getStoredKeys } from '../services/keyService.js';

export default function Security() {
  const { keyStatus, refreshKeyStatus, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiverKeys, setReceiverKeys] = useState({});

  useEffect(() => {
    refreshKeyStatus();
    setReceiverKeys(getStoredKeys());
  }, [refreshKeyStatus]);

  const status = keyStatus?.status || 'not_configured';

  const onRegenerate = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const keys = await regenerateKeys();
      try {
        await updatePublicKey({
          publicKey: keys.publicKeySpki,
          algorithm: keys.algorithm,
          createdAt: keys.createdAt,
        });
      } catch {
        setError('Keys were regenerated locally, but the server could not be updated. Contacts may not be able to encrypt to this device until the public key is published.');
      }
      await refreshKeyStatus();
      setMessage('New keys were generated on this device. Previous messages may no longer decrypt here.');
      setConfirmOpen(false);
    } catch {
      setError('Key regeneration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-semibold">Security</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <KeyStatus
            status={status}
            label="Overall encryption"
            detail="Messages are encrypted on-device using AES-GCM session keys wrapped with RSA-OAEP."
          />
          <KeyStatus
            status={keyStatus?.hasPublicKey ? 'secure' : 'not_configured'}
            label="Public key"
            detail="Registered locally. The raw private key is never shown."
          />
          <KeyStatus
            status={keyStatus?.hasPrivateKey ? 'secure' : 'unavailable'}
            label="Private key"
            detail={keyStatus?.hasPrivateKey ? 'Present on this device (not displayed).' : 'Not available on this device.'}
          />
          <KeyStatus
            status={keyStatus?.createdAt ? 'secure' : 'warning'}
            label="Key generation"
            detail={keyStatus?.createdAt ? new Date(keyStatus.createdAt).toLocaleString() : 'No generation date stored.'}
          />
        </div>
        <section className="card">
          <h2 className="font-semibold">This device / session</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Account</dt>
              <dd>{user?.email || user?.username || 'Signed in'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">User agent</dt>
              <dd className="truncate">{navigator.userAgent}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Token storage</dt>
              <dd>sessionStorage (not localStorage)</dd>
            </div>
            <div>
              <dt className="text-slate-500">Private key storage</dt>
              <dd>IndexedDB, wrapped with AES-GCM</dd>
            </div>
          </dl>
        </section>

        {/* রিসিভারের ইউনিক কী ডেটাবেস সেকশন */}
        <section className="card">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">Receiver Unique Keys Registry</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Every receiver in the system has a uniquely generated key for end-to-end encrypted messaging.
          </p>

          <div className="mt-4 space-y-3">
            {Object.entries(receiverKeys).map(([userId, data]) => {
              const uKey = typeof data === 'object' ? data.uniqueKey : data;
              const fp = typeof data === 'object' ? data.fingerprint : null;
              const date = typeof data === 'object' && data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Active';

              return (
                <div
                  key={userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-navy-800/60"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      User: <span className="font-mono text-brand-600 dark:text-accent-400">{userId}</span>
                      {userId === 'c1' && ' (Alice - Receiver)'}
                      {userId === 'demo-user-1' && ' (Sender Demo)'}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                      Unique Key: <span className="font-bold select-all">{uKey}</span>
                    </p>
                    {fp && <p className="font-mono text-[10px] text-slate-400">Fingerprint: {fp}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {date}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <SecurityInfo />
        {message && <p className="alert-info">{message}</p>}
        {error && <p className="alert-error">{error}</p>}
        <section className="card">
          <h2 className="font-semibold text-rose-700 dark:text-rose-300">Regenerate keys</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            This deletes the encryption keys stored on this device and creates a new pair. You may lose the ability to
            decrypt older messages. Other devices will need the new public key.
          </p>
          <button type="button" className="btn-danger mt-4" onClick={() => setConfirmOpen(true)}>
            Regenerate keys
          </button>
        </section>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="regen-title">
          <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Close dialog" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-900">
            <h3 id="regen-title" className="text-lg font-semibold">
              Replace encryption keys?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This cannot be undone on this device. Old ciphertext may become unreadable.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn-danger" disabled={busy} onClick={onRegenerate}>
                {busy ? 'Regenerating…' : 'Yes, regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
