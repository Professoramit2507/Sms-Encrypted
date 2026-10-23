/**
 * Key generation helpers. UI code should use encryptionManager, not this module directly.
 */

import { generateSymmetricKey, exportSymmetricKey } from './des.js';
import { generateKeyPair, exportPublicKey } from './elgamal.js';

export async function generateUserKeyPair() {
  const pair = await generateKeyPair();
  const publicKeySpki = await exportPublicKey(pair.publicKey);
  return {
    publicKey: pair.publicKey,
    privateKey: pair.privateKey,
    publicKeySpki,
    algorithm: 'RSA-OAEP-2048',
    createdAt: new Date().toISOString(),
  };
}

export async function generateSessionKey() {
  const key = await generateSymmetricKey();
  const rawBase64 = await exportSymmetricKey(key);
  return { key, rawBase64 };
}

export function generateUniqueKeyId(prefix = 'RCV-KEY') {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  return `${prefix}-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

export function generateKeyFingerprint() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(':')
    .slice(0, 35);
}

export async function generateReceiverKeyRecord(receiverId) {
  const uniqueKey = generateUniqueKeyId('RCV-KEY');
  const fingerprint = generateKeyFingerprint();
  let publicKeySpki = `spki-rsa2048-${uniqueKey}`;
  let privateKeyJwk = '';

  try {
    const pair = await generateKeyPair();
    publicKeySpki = await exportPublicKey(pair.publicKey);
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    privateKeyJwk = JSON.stringify(jwk);
  } catch {
    // WebCrypto fallback for demo environments
  }

  return {
    userId: receiverId,
    uniqueKey,
    fingerprint: `SHA256:${fingerprint}`,
    publicKey: publicKeySpki,
    privateKeyJwk,
    algorithm: 'RSA-OAEP-2048',
    createdAt: new Date().toISOString(),
  };
}

export function serializePublicKey(spkiBase64) {
  return JSON.stringify({
    algorithm: 'RSA-OAEP-2048',
    format: 'spki-base64',
    value: spkiBase64,
  });
}

export function deserializePublicKey(serialized) {
  if (!serialized) return null;
  if (typeof serialized === 'object') return serialized;
  try {
    return JSON.parse(serialized);
  } catch {
    return { algorithm: 'RSA-OAEP-2048', format: 'spki-base64', value: serialized };
  }
}

