import api, { ENDPOINTS } from './api.js';
import { getReceiverUniqueKeySync } from './keyService.js';

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

const CONV_STORAGE_KEY = 'mock_conversations_db';
const MSG_STORAGE_KEY = 'mock_messages_db';
export const DEFAULT_CONV_ID = 'conv-sender-alice';

const getCurrentUser = () => {
  try {
    const raw = sessionStorage.getItem('secure-sms-user') || localStorage.getItem('mock_current_user');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return { id: 'demo-user-1', fullName: 'Sender Demo', username: 'sender' };
};

export const getStoredConversations = () => {
  const saved = localStorage.getItem(CONV_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }

  const defaultConvs = [
    {
      id: DEFAULT_CONV_ID,
      participantId: 'c1',
      participant: {
        id: 'c1',
        fullName: 'Alice Johnson',
        username: 'alice',
      },
      lastMessage: {
        content: 'Hi! Let me know when you get this.',
        preview: 'Hi! Let me know when you get this.',
        senderId: 'c1',
        createdAt: new Date(Date.now() - 300000).toISOString(),
      },
      unreadCount: 0,
      updatedAt: new Date(Date.now() - 300000).toISOString(),
    },
  ];

  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(defaultConvs));
  return defaultConvs;
};

export const getStoredMessages = () => {
  const saved = localStorage.getItem(MSG_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }

  const defaultReceiverKey = getReceiverUniqueKeySync('c1');
  const defaultMsgs = {
    [DEFAULT_CONV_ID]: [
      {
        id: 'm1',
        senderId: 'c1',
        receiverId: 'demo-user-1',
        receiverKey: defaultReceiverKey.uniqueKey,
        content: 'Hi! Let me know when you get this.',
        plaintext: 'Hi! Let me know when you get this.',
        createdAt: new Date(Date.now() - 300000).toISOString(),
        status: 'read',
        encrypted: true,
      },
    ],
  };

  localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(defaultMsgs));
  return defaultMsgs;
};

export const notifySync = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('secure-sms-sync'));
  }
};

// কনভারসেশন লিস্ট আনা (API + Fallback)
export async function getConversations() {
  try {
    const { data } = await api.get(ENDPOINTS.messages.conversations);
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch {
    // fallback to local mock
  }

  await delay(80);
  const currentUser = getCurrentUser();
  const convs = getStoredConversations();

  return convs.map((c) => {
    if (currentUser.id === 'c1' || c.participantId === currentUser.id) {
      return {
        ...c,
        participantId: 'demo-user-1',
        participant: {
          id: 'demo-user-1',
          fullName: 'Sender Demo',
          username: 'sender',
        },
      };
    }
    return {
      ...c,
      participantId: c.participant?.id || 'c1',
      participant: c.participant || {
        id: 'c1',
        fullName: 'Alice Johnson',
        username: 'alice',
      },
    };
  });
}

// কনভারসেশন তৈরি বা খোঁজা
export async function createConversation(recipientId) {
  try {
    const { data } = await api.post(ENDPOINTS.messages.conversations, { recipientId });
    if (data?.id) {
      notifySync();
      return data;
    }
  } catch {
    // fallback
  }

  await delay(100);
  const convs = getStoredConversations();
  const existing = convs.find(
    (c) =>
      c.id === DEFAULT_CONV_ID ||
      c.participantId === recipientId ||
      c.participant?.id === recipientId
  );

  if (existing) return existing;

  const newConv = {
    id: `conv-${Date.now()}`,
    participantId: recipientId,
    participant: {
      id: recipientId,
      fullName: recipientId === 'c1' ? 'Alice Johnson' : 'Sender Demo',
      username: recipientId === 'c1' ? 'alice' : 'sender',
    },
    lastMessage: null,
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
  };

  convs.unshift(newConv);
  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(convs));
  notifySync();
  return newConv;
}

// মেসেজ লোড করা
export async function getMessages(conversationId) {
  try {
    const { data } = await api.get(ENDPOINTS.messages.messages(conversationId));
    if (Array.isArray(data)) {
      return data;
    }
  } catch {
    // fallback
  }

  await delay(80);
  const allMessages = getStoredMessages();
  return allMessages[conversationId] || allMessages[DEFAULT_CONV_ID] || [];
}

// মেসেজ পাঠানো (MongoDB-তে সেভ করা)
export async function sendMessage(conversationId, payload) {
  const textContent =
    typeof payload === 'string'
      ? payload
      : payload.text || payload.content || 'Sample message';

  const body = typeof payload === 'object'
    ? {
        content: payload.ciphertext || textContent,
        ciphertext: payload.ciphertext || '',
        iv: payload.iv || '',
        wrappedKey: payload.wrappedKey || '',
        payload: payload,
        receiverId: payload.receiverId,
        receiverKey: payload.receiverKey,
        receiverFingerprint: payload.receiverFingerprint,
        encrypted: payload.encrypted !== false,
      }
    : {
        content: (typeof payload === 'object' && payload.ciphertext) ? payload.ciphertext : textContent,
    ciphertext: (typeof payload === 'object' && payload.ciphertext) ? payload.ciphertext : '',
    iv: (typeof payload === 'object' && payload.iv) ? payload.iv : '',
    wrappedKey: (typeof payload === 'object' && payload.wrappedKey) ? payload.wrappedKey : '',
    plaintext: '',
      };

  try {
    const { data } = await api.post(ENDPOINTS.messages.send(conversationId), body);
    if (data?.id) {
      notifySync();
      return data;
    }
  } catch {
    // fallback
  }

  await delay(100);
  const allMessages = getStoredMessages();
  const targetId = allMessages[conversationId] ? conversationId : DEFAULT_CONV_ID;
  const msgs = allMessages[targetId] || [];

  const currentUser = getCurrentUser();
  const senderId = payload.senderId || currentUser.id || 'demo-user-1';

  const convs = getStoredConversations();
  const targetConv = convs.find((c) => c.id === targetId);
  let receiverId = 'c1';
  if (senderId === 'c1') {
    receiverId = 'demo-user-1';
  } else if (targetConv?.participantId && targetConv.participantId !== senderId) {
    receiverId = targetConv.participantId;
  }

  const rcvKeyRecord = getReceiverUniqueKeySync(receiverId);

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId,
    receiverId,
    receiverKey: rcvKeyRecord.uniqueKey,
    receiverFingerprint: rcvKeyRecord.fingerprint,
    content: (typeof payload === 'object' && payload.ciphertext) ? payload.ciphertext : textContent,
    ciphertext: (typeof payload === 'object' && payload.ciphertext) ? payload.ciphertext : '',
    iv: (typeof payload === 'object' && payload.iv) ? payload.iv : '',
    wrappedKey: (typeof payload === 'object' && payload.wrappedKey) ? payload.wrappedKey : '',
    plaintext: '',
    payload: typeof payload === 'object' ? payload : { text: textContent },
    createdAt: new Date().toISOString(),
    status: 'delivered',
    encrypted: true,
    decryptError: false,
  };

  msgs.push(newMsg);
  allMessages[targetId] = msgs;
  localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(allMessages));

  if (targetConv) {
    targetConv.lastMessage = { 
      content: textContent, 
      preview: textContent, 
      senderId, 
      createdAt: newMsg.createdAt 
    };
    targetConv.updatedAt = newMsg.createdAt;
    localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(convs));
  }

  notifySync();
  return newMsg;
}

export async function markAsRead(messageId) {
  try {
    await api.patch(ENDPOINTS.messages.read(messageId));
  } catch {
    // fallback
  }
  return { success: true, id: messageId };
}

export async function deleteConversation(conversationId) {
  try {
    await api.delete(ENDPOINTS.messages.delete(conversationId));
  } catch {
    // fallback
  }
  await delay(80);
  const convs = getStoredConversations().filter((c) => c.id !== conversationId);
  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(convs));

  const allMessages = getStoredMessages();
  delete allMessages[conversationId];
  localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(allMessages));

  notifySync();
  return { success: true, id: conversationId };
}

export default {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  markAsRead,
  DEFAULT_CONV_ID,
  notifySync,
};
