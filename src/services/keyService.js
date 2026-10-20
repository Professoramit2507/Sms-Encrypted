import { generateReceiverKeySet } from '../crypto/encryptionManager.js';
// src/services/keyService.js
import api, { ENDPOINTS } from './api.js';
import { generateReceiverKeyRecord, generateUniqueKeyId, generateKeyFingerprint } from '../crypto/keyGenerator.js';

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
const KEYS_STORAGE_KEY = 'mock_user_keys_db';

export const getStoredKeys = () => {
  const saved = localStorage.getItem(KEYS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // JSON parse error fallback
    }
  }

  const defaultKeys = {
    c1: {
      userId: 'c1',
      uniqueKey: 'RCV-KEY-A92B-4F10-7CE3-89D2',
      fingerprint: 'SHA256:7B:3E:91:02:4A:8C:F1:D0',
      publicKey: 'spki-rsa2048-RCV-KEY-A92B-4F10',
      algorithm: 'RSA-OAEP-2048',
      createdAt: new Date().toISOString(),
    },
  };
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(defaultKeys));
  return defaultKeys;
};

const getCurrentUserId = () => {
  try {
    const raw = sessionStorage.getItem('secure-sms-user') || localStorage.getItem('mock_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return parsed.id;
    }
  } catch {
    // fallback
  }
  return 'demo-user-1';
};

// রিসিভারের জন্য ইউনিক কী পাওয়ার মেথড (API + Fallback)
export async function getReceiverUniqueKey(receiverId) {
  try {
    const { data } = await api.get(ENDPOINTS.keys.byUser(receiverId));
    if (data?.key) return data.key;
  } catch {
    // fallback to local storage
  }

  const keys = getStoredKeys();
  const existing = keys[receiverId];
  if (existing && typeof existing === 'object' && existing.uniqueKey) {
    return existing;
  }

  const newKeyRecord = await generateReceiverKeyRecord(receiverId);
  keys[receiverId] = newKeyRecord;
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  return newKeyRecord;
}

export function getReceiverUniqueKeySync(receiverId) {
  const keys = getStoredKeys();
  const existing = keys[receiverId];
  if (existing && typeof existing === 'object' && existing.uniqueKey) {
    return existing;
  }
  const newKey = {
    userId: receiverId,
    uniqueKey: generateUniqueKeyId('RCV-KEY'),
    fingerprint: `SHA256:${generateKeyFingerprint()}`,
    publicKey: `spki-rsa2048-${generateUniqueKeyId('KEY')}`,
    algorithm: 'RSA-OAEP-2048',
    createdAt: new Date().toISOString(),
  };
  keys[receiverId] = newKey;
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  return newKey;
}

export async function regenerateReceiverUniqueKey(receiverId) {
  const keys = getStoredKeys();
  const newKeyRecord = await generateReceiverKeyRecord(receiverId);
  keys[receiverId] = newKeyRecord;
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));

  try {
    await api.post(ENDPOINTS.keys.register, newKeyRecord);
  } catch {
    // local fallback
  }

  return newKeyRecord;
}

export async function registerPublicKey(keyData) {
  const payload = typeof keyData === 'string'
    ? {
        uniqueKey: generateUniqueKeyId('RCV-KEY'),
        fingerprint: `SHA256:${generateKeyFingerprint()}`,
        publicKey: keyData,
        algorithm: 'RSA-OAEP-2048',
      }
    : {
        uniqueKey: keyData.uniqueKey || generateUniqueKeyId('RCV-KEY'),
        fingerprint: keyData.fingerprint || `SHA256:${generateKeyFingerprint()}`,
        publicKey: keyData.publicKey || keyData.publicKeySpki,
        encryptedPrivateKey: keyData.encryptedPrivateKey || '',
        privateKeyIv: keyData.privateKeyIv || '',
        algorithm: keyData.algorithm || 'RSA-OAEP-2048',
      };

  try {
    const { data } = await api.post(ENDPOINTS.keys.register, payload);
    return data;
  } catch {
    // fallback
    const keys = getStoredKeys();
    keys[getCurrentUserId()] = payload;
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
    return { data: { success: true, ...payload } };
  }
}

export const uploadPublicKey = registerPublicKey;
export const updatePublicKey = registerPublicKey;

export async function getPublicKey(userId) {
  try {
    const { data } = await api.get(ENDPOINTS.keys.byUser(userId));
    if (data?.key) {
      return {
        data: data.key,
        ...data.key,
      };
    }
  } catch {
    // fallback
  }

  const keyRecord = await getReceiverUniqueKey(userId);
  return {
    data: {
      userId,
      uniqueKey: keyRecord.uniqueKey,
      publicKey: keyRecord.publicKey,
      fingerprint: keyRecord.fingerprint,
    },
    uniqueKey: keyRecord.uniqueKey,
    publicKey: keyRecord.publicKey,
    fingerprint: keyRecord.fingerprint,
    algorithm: keyRecord.algorithm,
    createdAt: keyRecord.createdAt,
  };
}

export const getUserPublicKey = getPublicKey;

export async function getMyKeys() {
  try {
    const { data } = await api.get(ENDPOINTS.keys.me);
    return data;
  } catch {
    return { key: getStoredKeys()[getCurrentUserId()] || null };
  }
}

export async function getKeyStatus() {
  try {
    const { data } = await api.get(ENDPOINTS.keys.status);
    return data;
  } catch {
    return { hasKey: false, key: null };
  }
}


export async function generateAndPublishReceiverKeys(secret = 'secure-receiver-key-2026') {
  const keySet = await generateReceiverKeySet(secret);
  const uniqueKey = generateUniqueKeyId('RCV-KEY');
  const fingerprint = 'SHA256:' + generateKeyFingerprint();
  const payload = {
    uniqueKey,
    fingerprint,
    publicKey: keySet.publicKeySpki,
    encryptedPrivateKey: keySet.encryptedPrivateKey,
    privateKeyIv: keySet.privateKeyIv,
    privateKeySalt: keySet.privateKeySalt,
    algorithm: keySet.algorithm,
  };
  try {
    await registerPublicKey(payload);
  } catch {}
  const keys = getStoredKeys();
  const currentUserId = getCurrentUserId();
  keys[currentUserId] = {
    userId: currentUserId,
    ...payload,
    privateKeyJwk: keySet.privateKeyJwk,
  };
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  return {
    ...payload,
    publicKeySpki: keySet.publicKeySpki,
    privateKeyJwk: keySet.privateKeyJwk,
  };
}

export default {
  getStoredKeys,
  getReceiverUniqueKey,
  getReceiverUniqueKeySync,
  regenerateReceiverUniqueKey,
  registerPublicKey,
  uploadPublicKey,
  updatePublicKey,
  getPublicKey,
  getUserPublicKey,
  getMyKeys,
  getKeyStatus,
};
