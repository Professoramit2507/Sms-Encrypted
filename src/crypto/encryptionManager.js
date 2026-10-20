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

export async function initializeUserKeys() {
  const generated = await generateUserKeyPair();
  const meta = await storeKeyPair(generated);
  return {
    publicKeySpki: generated.publicKeySpki,
    algorithm: generated.algorithm,
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

export async function regenerateKeys() {
  await clearKeys();
  return initializeUserKeys();
}

export async function clearLocalCryptoState() {
  await destroyKeystore();
}

export function isEncryptedEnvelope(value) {
  return Boolean(value && typeof value === 'object' && value.ciphertext && value.wrappedKey && value.algorithm);
}
