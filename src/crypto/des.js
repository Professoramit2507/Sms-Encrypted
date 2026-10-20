/**
 * Symmetric encryption abstraction (filename kept as des.js for the required architecture).
 *
 * SECURITY NOTE:
 * Classic DES is obsolete (56-bit keys, weak against brute force). This module does NOT
 * implement DES. It uses the Web Crypto API with AES-GCM (256-bit), which is appropriate
 * for demonstration and for production-style local encryption.
 *
 * Production deployments should continue to rely on well-reviewed primitives (Web Crypto /
 * established libraries) rather than custom cipher implementations.
 */

const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_BITS = 256;
const IV_BYTES = 12;

function toUint8(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof data === 'string') return new TextEncoder().encode(data);
  throw new Error('Unsupported data type for encryption.');
}

function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
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

export async function importSymmetricKey(rawKey) {
  const keyBytes = typeof rawKey === 'string' ? base64ToBytes(rawKey) : toUint8(rawKey);
  return crypto.subtle.importKey('raw', keyBytes, { name: AES_ALGORITHM, length: AES_KEY_BITS }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function generateSymmetricKey() {
  return crypto.subtle.generateKey({ name: AES_ALGORITHM, length: AES_KEY_BITS }, true, ['encrypt', 'decrypt']);
}

export async function exportSymmetricKey(cryptoKey) {
  const raw = await crypto.subtle.exportKey('raw', cryptoKey);
  return bufferToBase64(raw);
}

/**
 * @param {string|Uint8Array} data plaintext
 * @param {CryptoKey|string} key AES CryptoKey or raw key (base64)
 * @returns {Promise<{ iv: string, ciphertext: string }>}
 */
export async function encrypt(data, key) {
  const cryptoKey = typeof key === 'string' ? await importSymmetricKey(key) : key;
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: AES_ALGORITHM, iv }, cryptoKey, toUint8(data));
  return {
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertext),
  };
}

/**
 * @param {{ iv: string, ciphertext: string }|string} encryptedData
 * @param {CryptoKey|string} key
 * @returns {Promise<string>} plaintext UTF-8
 */
export async function decrypt(encryptedData, key) {
  const payload = typeof encryptedData === 'string' ? JSON.parse(encryptedData) : encryptedData;
  const cryptoKey = typeof key === 'string' ? await importSymmetricKey(key) : key;
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: AES_ALGORITHM, iv }, cryptoKey, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export { bufferToBase64, base64ToBytes };
