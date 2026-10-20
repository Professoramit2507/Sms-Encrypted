/**
 * Asymmetric encryption abstraction (filename kept as elgamal.js for the required architecture).
 *
 * SECURITY NOTE:
 * Classic ElGamal over custom parameters is easy to implement incorrectly and is not a
 * first-class Web Crypto algorithm. This module exposes an ElGamal-style API
 * (generateKeyPair / encrypt / decrypt) backed by RSA-OAEP (2048-bit) via the Web Crypto API.
 *
 * Do not treat a from-scratch ElGamal implementation as production-grade. Prefer Web Crypto
 * or audited libraries in real deployments.
 */

const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateKeyPair() {
  const pair = await crypto.subtle.generateKey(RSA_ALGORITHM, true, ['encrypt', 'decrypt']);
  return pair;
}

export async function exportPublicKey(publicKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  return bufferToBase64(spki);
}

export async function exportPrivateKeyJwk(privateKey) {
  // Used only for wrapping into IndexedDB via Web Crypto wrapKey — callers must not log this.
  return crypto.subtle.exportKey('jwk', privateKey);
}

export async function importPublicKey(spkiBase64) {
  return crypto.subtle.importKey('spki', base64ToBytes(spkiBase64), { name: 'RSA-OAEP', hash: 'SHA-256' }, true, [
    'encrypt',
  ]);
}

export async function importPrivateKeyJwk(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
}

/**
 * Encrypt small payloads (e.g. a wrapped AES session key) with a recipient public key.
 */
export async function encrypt(plaintextBytes, publicKey) {
  const key =
    typeof publicKey === 'string' ? await importPublicKey(publicKey) : publicKey;
  const data = typeof plaintextBytes === 'string' ? new TextEncoder().encode(plaintextBytes) : plaintextBytes;
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data);
  return bufferToBase64(cipher);
}

export async function decrypt(ciphertextBase64, privateKey) {
  const cipherBytes = base64ToBytes(ciphertextBase64);
  const plain = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, cipherBytes);
  return new Uint8Array(plain);
}

export { bufferToBase64, base64ToBytes };
