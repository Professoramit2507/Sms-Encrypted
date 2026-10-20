// src/services/keyService.js
import { generateReceiverKeyRecord, generateUniqueKeyId, generateKeyFingerprint } from '../crypto/keyGenerator.js';

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

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

  // Initial default keys with unique receiver key format
  const defaultKeys = {
    c1: {
      userId: 'c1',
      uniqueKey: 'RCV-KEY-A92B-4F10-7CE3-89D2',
      fingerprint: 'SHA256:7B:3E:91:02:4A:8C:F1:D0',
      publicKey: 'spki-rsa2048-RCV-KEY-A92B-4F10',
      algorithm: 'RSA-OAEP-2048',
      createdAt: new Date().toISOString(),
    },
    c2: {
      userId: 'c2',
      uniqueKey: 'RCV-KEY-C54D-9E11-2B88-12A7',
      fingerprint: 'SHA256:3C:99:A1:88:DF:01:22:BE',
      publicKey: 'spki-rsa2048-RCV-KEY-C54D-9E11',
      algorithm: 'RSA-OAEP-2048',
      createdAt: new Date().toISOString(),
    },
    'demo-user-1': {
      userId: 'demo-user-1',
      uniqueKey: 'SND-KEY-E810-77AC-391D-4560',
      fingerprint: 'SHA256:5E:21:BC:90:3F:4D:11:09',
      publicKey: 'spki-rsa2048-SND-KEY-E810-77AC',
      algorithm: 'RSA-OAEP-2048',
      createdAt: new Date().toISOString(),
    },
  };
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(defaultKeys));
  return defaultKeys;
};

// বর্তমান ইউজারের আইডি খোঁজার হেল্পার
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

// নির্দিষ্ট ইউজারের কী সেভ করার ফাংশন
export const saveKeyForUser = (userId, keyData) => {
  const keys = getStoredKeys();
  const uid = userId || getCurrentUserId();
  
  let record;
  if (typeof keyData === 'object' && keyData !== null) {
    record = {
      userId: uid,
      uniqueKey: keyData.uniqueKey || generateUniqueKeyId(uid === 'demo-user-1' ? 'SND-KEY' : 'RCV-KEY'),
      fingerprint: keyData.fingerprint || `SHA256:${generateKeyFingerprint()}`,
      publicKey: keyData.publicKey || keyData.publicKeySpki || JSON.stringify(keyData),
      algorithm: keyData.algorithm || 'RSA-OAEP-2048',
      createdAt: keyData.createdAt || new Date().toISOString(),
    };
  } else {
    record = {
      userId: uid,
      uniqueKey: generateUniqueKeyId('RCV-KEY'),
      fingerprint: `SHA256:${generateKeyFingerprint()}`,
      publicKey: String(keyData),
      algorithm: 'RSA-OAEP-2048',
      createdAt: new Date().toISOString(),
    };
  }

  keys[uid] = record;
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  return { data: { success: true, ...record } };
};

// রিসিভারের জন্য ইউনিক কী পাওয়ার অথবা নতুন জেনারেট করার মেথড
export async function getReceiverUniqueKey(receiverId) {
  await delay(100);
  const keys = getStoredKeys();
  const existing = keys[receiverId];

  // যদি অলরেডি ইউনিক কী থাকে এবং অবজেক্ট হয়
  if (existing && typeof existing === 'object' && existing.uniqueKey) {
    return existing;
  }

  // যদি স্ট্রিং হিসেবে থাকে বা না থাকে, তবে নতুন ইউনিক কী জেনারেট হবে
  const newKeyRecord = await generateReceiverKeyRecord(receiverId);
  keys[receiverId] = newKeyRecord;
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  return newKeyRecord;
}

// সিঙ্ক ভার্সন (কখনো সিঙ্ক ডাকার প্রয়োজন হলে)
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

// রিসিভারের ইউনিক কী রিজেনারেট করার মেথড
export async function regenerateReceiverUniqueKey(receiverId) {
  await delay(150);
  const keys = getStoredKeys();
  const newKeyRecord = await generateReceiverKeyRecord(receiverId);
  keys[receiverId] = newKeyRecord;
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  return newKeyRecord;
}

// AuthContext এবং অন্যান্য জায়গায় ব্যবহৃত মেথড
export async function registerPublicKey(publicKey) {
  await delay(100);
  return saveKeyForUser(getCurrentUserId(), publicKey);
}

export async function uploadPublicKey(publicKey) {
  await delay(100);
  return saveKeyForUser(getCurrentUserId(), publicKey);
}

export async function updatePublicKey(publicKey) {
  await delay(100);
  return saveKeyForUser(getCurrentUserId(), publicKey);
}

// ChatContext ও অন্যান্য কম্পোনেন্টে ব্যবহৃত মেথড
export async function getPublicKey(userId) {
  await delay(100);
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
  await delay(100);
  const currentId = getCurrentUserId();
  const keys = getStoredKeys();
  const myKey = keys[currentId] || (await getReceiverUniqueKey(currentId));
  return {
    data: {
      userId: currentId,
      uniqueKey: myKey.uniqueKey,
      publicKey: myKey.publicKey,
      fingerprint: myKey.fingerprint,
    },
  };
}

export async function deleteKeys() {
  await delay(100);
  const currentId = getCurrentUserId();
  const keys = getStoredKeys();
  delete keys[currentId];
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  return { data: { success: true } };
}

export default {
  registerPublicKey,
  uploadPublicKey,
  updatePublicKey,
  getPublicKey,
  getUserPublicKey,
  getMyKeys,
  deleteKeys,
  getReceiverUniqueKey,
  getReceiverUniqueKeySync,
  regenerateReceiverUniqueKey,
  saveKeyForUser,
};