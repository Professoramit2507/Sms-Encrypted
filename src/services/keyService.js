import { generateReceiverKeySet } from '../crypto/encryptionManager.js';
// src/services/keyService.js
import api, { ENDPOINTS } from './api.js';
import { generateReceiverKeyRecord, generateUniqueKeyId, generateKeyFingerprint } from '../crypto/keyGenerator.js';

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
const KEYS_STORAGE_KEY = 'mock_user_keys_db';

const ALICE_PERMANENT_KEY = {
  userId: 'c1',
  uniqueKey: 'RCV-KEY-7120-04A6-9957-D76B',
  fingerprint: 'SHA256:D5:7D:46:66:FB:2B:67:95:98:D5:9D:50',
  publicKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqMemDFMIERRM8XI4nNzJUgz0OiXkJpSbMHuKovOxPUbea4+mKf3ZlGegV9uL9xnL2eSdll33DYvvdb4YtFhOXDSVF+L9ATMIIpSBkLevu03k+UOsxUr9REoy1egax8JMmqtuvLXFiAIXp2aquDnaDrFbODCEQNtXbTkdbFT4JeMokvP3qcu8HYjPAW+SCnbUgBTClkIPLslO3/Zr8fZyZzGFCV7BmsTcpMCJqKD0g2ZLzLASoMAkonSoYfdfNpCH51gGbI3diDRl1rysJxmOxPobuPEZSDHPkJEuEp64ZIOgGbDfZP8yD7U9SJjPfL4uipGGOsJ0EIGzPp6hpeJlLQIDAQAB',
  privateKeyJwk: JSON.stringify({
    kty: "RSA",
    n: "qMemDFMIERRM8XI4nNzJUgz0OiXkJpSbMHuKovOxPUbea4-mKf3ZlGegV9uL9xnL2eSdll33DYvvdb4YtFhOXDSVF-L9ATMIIpSBkLevu03k-UOsxUr9REoy1egax8JMmqtuvLXFiAIXp2aquDnaDrFbODCEQNtXbTkdbFT4JeMokvP3qcu8HYjPAW-SCnbUgBTClkIPLslO3_Zr8fZyZzGFCV7BmsTcpMCJqKD0g2ZLzLASoMAkonSoYfdfNpCH51gGbI3diDRl1rysJxmOxPobuPEZSDHPkJEuEp64ZIOgGbDfZP8yD7U9SJjPfL4uipGGOsJ0EIGzPp6hpeJlLQ",
    e: "AQAB",
    d: "FRc5tzGLAQNd6BADZgqq959Zx4hjnbSVPfY6KUm1fLhF5AAD3hx0G3jljwUG1P56vEQ2swsT67PwXPC_yo18YUZK2TzKq-MyIYwYMrrZcVj3A3UC-nZ39pglCRjje9HaW7uPb3JxeCD2zrrkG3hTOOHNydQ6OpaOMr5f4GEvzyADM4wSoUckalejFPpRzwEGXs3CpYZYmhh2w0PLkjhr-kFOOIlny2N-3aPlJmWMuzSrvzE2kEdob9If4VssAcIjnTdYpTTlO8uEBk5xA0v7JYA5pzEq7FODKGjcjZyxVOwnI8C-7XaffINCjrEQ9L9iRu91uLbphOSz55ezoGD1Kw",
    p: "23lWVhkR3ps4H755Dc5zfvzkk5japBKuIRBRnrqDlNpQCsC2vrXtJO08E5khL1gp5mA3ESVCQBfzRApHmdJBtTZYEtZl3TrN2vqii8v6zCuz_ai0X829q5hxwm5D4dVDTNxneYIpmSyzpXlmwv1v75SBOm4jbQdgVdTc2Ah-Qdc",
    q: "xN5-0b2vMyEgrB3MZqcdCIaLZoN18zs1FPffexzo2S8f41ogXaWUdG0skN9CZ1nc0lYTk4L2tEDnJq8GLTz6lSFZC6edCeyg_N5ulGZHrj_UJ-2rdTUrPmbP6bpqmD12DvC0VMvTZR3gOKQlslnAl7JxHhuoIeDIcBTaTccSuJs",
    dp: "Yk_3Ibg3Lf1f5bBf75RUXkUQayFkh2yqvbrepPitqockpbxv3_wEj68JY0oL-HZIxp7A7BhBlg5kdU0Zh8kMkA0Y5M9PcAtAXWA6Yd7sqHrHNNBWhDfYR76Q7uSP2eC7NfnhDCgHVEsW6f_4zU3Tz4E5ZiAiFFvihnBEwS0EyZ8",
    dq: "izn-3j4ThUlMXezE_WP5-GmOdHVMGTQqGiYiemK7mbzmBFdcxF2xW5VKCzqZL5YxwN73AT-BUYEE-CqXZ67UWFs5KjDjsn0SbUKxWWnsD6M8WvCObVmot3zmVRltATWWJIK-RanQWpaCWAxeTH-E4MNllDFi-nKJzhoxOQgsiTk",
    qi: "OXJouQE529sNaZFqPTMUcIzcaAvN47fr3Uqp_2xtXpFwSSIy5Lsz_lEJI8E6-obIvZNmqevno8NjyZ4qDs0P8kFK6BbvmvkqSMWhMUorG_moP68FCUskVNi5Rm4hztwmIrB0vnbLglOtfeQblLM6Z-ERuePfxxwtsiqhw4I-5q0"
  }),
  algorithm: 'RSA-OAEP-2048',
  createdAt: '2026-10-26T17:15:00.000Z',
};

export const getStoredKeys = () => {
  const saved = localStorage.getItem(KEYS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.c1 && parsed.c1.privateKeyJwk) {
        return parsed;
      }
    } catch {
      // JSON parse error fallback
    }
  }

  const defaultKeys = {
    c1: ALICE_PERMANENT_KEY,
    '6ad75390ff8f3492c4500820': ALICE_PERMANENT_KEY,
  };
  localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(defaultKeys));

  try {
    const hist = JSON.parse(localStorage.getItem('keystore_history') || '{}');
    hist[ALICE_PERMANENT_KEY.uniqueKey] = ALICE_PERMANENT_KEY.privateKeyJwk;
    hist[ALICE_PERMANENT_KEY.publicKey] = ALICE_PERMANENT_KEY.privateKeyJwk;
    localStorage.setItem('keystore_history', JSON.stringify(hist));
  } catch {}

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

  if (newKeyRecord.privateKeyJwk) {
    try {
      const hist = JSON.parse(localStorage.getItem('keystore_history') || '{}');
      hist[newKeyRecord.uniqueKey] = newKeyRecord.privateKeyJwk;
      hist[newKeyRecord.publicKey] = newKeyRecord.privateKeyJwk;
      localStorage.setItem('keystore_history', JSON.stringify(hist));
    } catch {}
  }

  return newKeyRecord;
}

export function getReceiverUniqueKeySync(receiverId) {
  const keys = getStoredKeys();
  const existing = keys[receiverId];
  if (existing && typeof existing === 'object' && existing.uniqueKey) {
    return existing;
  }
  const newKey = {
    ...ALICE_PERMANENT_KEY,
    userId: receiverId,
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

  if (newKeyRecord.privateKeyJwk) {
    try {
      const hist = JSON.parse(localStorage.getItem('keystore_history') || '{}');
      hist[newKeyRecord.uniqueKey] = newKeyRecord.privateKeyJwk;
      hist[newKeyRecord.publicKey] = newKeyRecord.privateKeyJwk;
      localStorage.setItem('keystore_history', JSON.stringify(hist));
    } catch {}
  }

  try {
    await api.post(ENDPOINTS.keys.register, {
      ...newKeyRecord,
      userId: receiverId,
      targetUserId: receiverId,
    });
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
        privateKeySalt: keyData.privateKeySalt || '',
        algorithm: keyData.algorithm || 'RSA-OAEP-2048',
        userId: keyData.userId,
        targetUserId: keyData.userId || keyData.targetUserId,
      };

  if (keyData?.privateKeyJwk) {
    try {
      const hist = JSON.parse(localStorage.getItem('keystore_history') || '{}');
      if (payload.uniqueKey) hist[payload.uniqueKey] = keyData.privateKeyJwk;
      if (payload.publicKey) hist[payload.publicKey] = keyData.privateKeyJwk;
      localStorage.setItem('keystore_history', JSON.stringify(hist));
    } catch {}
  }

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
    if (data?.key) {
      return data;
    }
  } catch {
    // fallback
  }
  const currentId = getCurrentUserId();
  const stored = getStoredKeys();
  return { key: stored[currentId] || stored['c1'] || ALICE_PERMANENT_KEY };
}

export async function getKeyStatus() {
  try {
    const { data } = await api.get(ENDPOINTS.keys.status);
    return data;
  } catch {
    return { hasKey: true, key: ALICE_PERMANENT_KEY };
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
    privateKeyJwk: keySet.privateKeyJwk,
    algorithm: keySet.algorithm,
  };
  try {
    await registerPublicKey(payload);
  } catch {}

  try {
    const hist = JSON.parse(localStorage.getItem('keystore_history') || '{}');
    hist[uniqueKey] = keySet.privateKeyJwk;
    hist[keySet.publicKeySpki] = keySet.privateKeyJwk;
    localStorage.setItem('keystore_history', JSON.stringify(hist));
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
