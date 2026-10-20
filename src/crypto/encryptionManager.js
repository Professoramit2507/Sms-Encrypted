/**
 * High-level encryption API for the UI and services.
 * Components should call this module instead of des.js / elgamal.js.
 */

import { encrypt as encryptSymmetric, decrypt as decryptSymmetric, importSymmetricKey } from './des.js';
import { encrypt as encryptAsymmetric, decrypt as decryptAsymmetric, importPublicKey } from './elgamal.js';
import { generateUserKeyPair, generateSessionKey, deserializePublicKey } from './keyGenerator.js';
import {
  storeKeyPair,
  loadPrivateKey,
  loadPrivateKeyJwk,
  loadPublicKeySpki,
  getKeyMetadata,
  clearKeys,
  destroyKeystore,
} from './keyStorage.js';

export const ENCRYPTION_VERSION = 1;
export const ENCRYPTION_SUITE = 'RSA-OAEP+AES-GCM';

function friendlyError(code) {
  const map = {
    missing_recipient_key: 'This contact has not published an encryption key yet.',
    missing_local_key: 'Your encryption keys are not set up on this device.',
    encrypt_failed: 'The message could not be encrypted.',
    decrypt_failed: 'This message could not be decrypted on this device.',
    invalid_payload: 'The message payload is not in a recognized encrypted format.',
  };
  const error = new Error(map[code] || 'Encryption could not be completed.');
  error.code = code;
  return error;
}

/**
 * Encrypt a private key for secure database storage.
 * The private key is encrypted with AES-GCM (256-bit) using a PBKDF2-derived key
 * from the receiver's secret/credentials. Only the receiver can decrypt it!
 */
export async function encryptPrivateKeyForDatabase(privateKey, secret = 'secure-receiver-key-2026') {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const data = new TextEncoder().encode(JSON.stringify(jwk));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const encKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encKey, data);

  const bufferToBase64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  };

  return {
    encryptedPrivateKey: bufferToBase64(ciphertext),
    privateKeyIv: bufferToBase64(iv),
    privateKeySalt: bufferToBase64(salt),
  };
}

/**
 * Decrypt an encrypted private key loaded from the database using receiver's secret.
 */
export async function decryptPrivateKeyFromDatabase({ encryptedPrivateKey, privateKeyIv, privateKeySalt }, secret = 'secure-receiver-key-2026') {
  const base64ToBytes = (str) => {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const salt = base64ToBytes(privateKeySalt);
  const iv = base64ToBytes(privateKeyIv);
  const ciphertext = base64ToBytes(encryptedPrivateKey);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const decKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, decKey, ciphertext);
  const jwk = JSON.parse(new TextDecoder().decode(decrypted));
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}

export async function initializeUserKeys(secret = 'secure-receiver-key-2026') {
  const generated = await generateUserKeyPair();
  const meta = await storeKeyPair(generated);

  let encryptedDbKey = { encryptedPrivateKey: '', privateKeyIv: '', privateKeySalt: '' };
  try {
    encryptedDbKey = await encryptPrivateKeyForDatabase(generated.privateKey, secret);
  } catch {
    // fallback
  }

  return {
    publicKeySpki: generated.publicKeySpki,
    algorithm: generated.algorithm,
    createdAt: generated.createdAt,
    ...meta,
    ...encryptedDbKey,
  };
}


export async function generateReceiverKeySet(secret = 'secure-receiver-key-2026') {
  const generated = await generateUserKeyPair();
  const jwk = await crypto.subtle.exportKey('jwk', generated.privateKey);
  const privateKeyJwk = JSON.stringify(jwk);
  const meta = await storeKeyPair(generated);
  const encryptedDbKey = await encryptPrivateKeyForDatabase(generated.privateKey, secret);
  return {
    publicKey: generated.publicKeySpki,
    publicKeySpki: generated.publicKeySpki,
    privateKeyJwk,
    encryptedPrivateKey: encryptedDbKey.encryptedPrivateKey,
    privateKeyIv: encryptedDbKey.privateKeyIv,
    privateKeySalt: encryptedDbKey.privateKeySalt,
    algorithm: generated.algorithm || 'RSA-OAEP-2048',
    createdAt: generated.createdAt,
    ...meta,
  };
}
export async function getEncryptionStatus() {
  return getKeyMetadata();
}

export async function getLocalPublicKey() {
  return loadPublicKeySpki();
}

/**
 * Encrypt a plaintext message for a recipient.
 * Only the ciphertext envelope should be sent to the backend.
 */
export async function encryptForRecipient(plaintext, recipientPublicKey) {
  const parsed = deserializePublicKey(recipientPublicKey);
  const spki = parsed?.value || recipientPublicKey;
  if (!spki) throw friendlyError('missing_recipient_key');

  try {
    const publicKey = await importPublicKey(spki);
    const session = await generateSessionKey();
    const symmetric = await encryptSymmetric(plaintext, session.key);
    const sessionRaw = Uint8Array.from(atob(session.rawBase64), (c) => c.charCodeAt(0));
    const wrappedKey = await encryptAsymmetric(sessionRaw, publicKey);
    const senderPublicKey = await loadPublicKeySpki();

    return {
      version: ENCRYPTION_VERSION,
      algorithm: ENCRYPTION_SUITE,
      wrappedKey,
      iv: symmetric.iv,
      ciphertext: symmetric.ciphertext,
      senderPublicKey,
    };
  } catch (err) {
    if (err.code) throw err;
    throw friendlyError('encrypt_failed');
  }
}

export async function encryptMessage(plaintext, recipientPublicKey) {
  return encryptForRecipient(plaintext, recipientPublicKey);
}

export async function decryptReceivedMessage(payload) {
  if (!payload || typeof payload !== 'object' || !payload.ciphertext || !payload.wrappedKey) {
    throw friendlyError('invalid_payload');
  }

  const privateKey = await loadPrivateKey();
  if (!privateKey) throw friendlyError('missing_local_key');

  try {
    const sessionRaw = await decryptAsymmetric(payload.wrappedKey, privateKey);
    const sessionKey = await importSymmetricKey(sessionRaw);
    return decryptSymmetric({ iv: payload.iv, ciphertext: payload.ciphertext }, sessionKey);
  } catch (err) {
    if (err.code) throw err;
    throw friendlyError('decrypt_failed');
  }
}

export async function decryptMessage(payload) {
  return decryptReceivedMessage(payload);
}

export async function regenerateKeys(secret = 'secure-receiver-key-2026') {
  await clearKeys();
  return initializeUserKeys(secret);
}

export async function clearLocalCryptoState() {
  await destroyKeystore();
}

export function isEncryptedEnvelope(value) {
  return Boolean(value && typeof value === 'object' && value.ciphertext && value.wrappedKey && value.algorithm);
}

export { loadPrivateKey, loadPublicKeySpki, loadPrivateKeyJwk } from './keyStorage.js';
