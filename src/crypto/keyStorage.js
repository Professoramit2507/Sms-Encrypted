/**
 * Client-side key persistence.
 *
 * SECURITY DECISIONS:
 * - Private key material is stored in IndexedDB, not localStorage (localStorage is trivial XSS loot).
 * - After first persist, the RSA private key is imported with extractable: false for in-memory use.
 * - We never write private keys to logs, URLs, or the DOM.
 * - A wrapping AES key is derived from a random device secret held in IndexedDB (not localStorage).
 *
 * IndexedDB is still origin-scoped and not a substitute for a hardware-backed keystore.
 * Production apps should prefer non-extractable keys, WebAuthn, or OS keychain integrations.
 */

const DB_NAME = 'secure-sms-keystore';
const DB_VERSION = 1;
const STORE = 'keys';
const RECORD_ID = 'user-keys';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function getOrCreateWrappingKey() {
  let record = await idbGet('wrapping-key');
  if (!record) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    record = { raw: bytesToBase64(raw) };
    await idbSet('wrapping-key', record);
  }
  return crypto.subtle.importKey('raw', base64ToBytes(record.raw), { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Persist a generated key pair. The private JWK is encrypted with a wrapping key before storage.
 * Do not pass the result to UI or logging.
 */
export async function storeKeyPair({ publicKeySpki, privateKey, algorithm, createdAt }) {
  const wrappingKey = await getOrCreateWrappingKey();
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(jwk));
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, encoded);

  const record = {
    publicKeySpki,
    algorithm,
    createdAt: createdAt || new Date().toISOString(),
    wrappedPrivateKey: bytesToBase64(new Uint8Array(wrapped)),
    wrapIv: bytesToBase64(iv),
  };

  await idbSet(RECORD_ID, record);
  return {
    publicKeySpki,
    algorithm: record.algorithm,
    createdAt: record.createdAt,
    hasPrivateKey: true,
  };
}

export async function loadKeyRecord() {
  return idbGet(RECORD_ID);
}

export async function loadPrivateKey() {
  const record = await loadKeyRecord();
  if (!record?.wrappedPrivateKey) return null;
  const wrappingKey = await getOrCreateWrappingKey();
  const iv = base64ToBytes(record.wrapIv);
  const wrapped = base64ToBytes(record.wrappedPrivateKey);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, wrapped);
  const jwk = JSON.parse(new TextDecoder().decode(decrypted));
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}


export async function loadPrivateKeyJwk() {
  const record = await loadKeyRecord();
  if (!record?.wrappedPrivateKey) return null;
  const wrappingKey = await getOrCreateWrappingKey();
  const iv = base64ToBytes(record.wrapIv);
  const wrapped = base64ToBytes(record.wrappedPrivateKey);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, wrapped);
  return new TextDecoder().decode(decrypted);
}
export async function loadPublicKeySpki() {
  const record = await loadKeyRecord();
  return record?.publicKeySpki ?? null;
}

export async function getKeyMetadata() {
  const record = await loadKeyRecord();
  if (!record) {
    return {
      status: 'not_configured',
      hasPublicKey: false,
      hasPrivateKey: false,
      createdAt: null,
      algorithm: null,
    };
  }
  return {
    status: record.wrappedPrivateKey && record.publicKeySpki ? 'secure' : 'warning',
    hasPublicKey: Boolean(record.publicKeySpki),
    hasPrivateKey: Boolean(record.wrappedPrivateKey),
    createdAt: record.createdAt ?? null,
    algorithm: record.algorithm ?? null,
  };
}

export async function clearKeys() {
  await idbDelete(RECORD_ID);
}

export async function destroyKeystore() {
  await idbDelete(RECORD_ID);
  await idbDelete('wrapping-key');
}
