import { getReceiverUniqueKeySync } from './keyService.js';

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

const CONV_STORAGE_KEY = 'mock_conversations_db';
const MSG_STORAGE_KEY = 'mock_messages_db';

// কমন কনভারসেশন আইডি যা সেন্ডার এবং রিসিভার শেয়ার করবে
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

// ক্রস-ট্যাব এবং কম্পোনেন্ট সিঙ্কের জন্য ইভেন্ট নোটিফিকেশন
export const notifySync = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('secure-sms-sync'));
  }
};

export async function getConversations() {
  await delay(80);
  const currentUser = getCurrentUser();
  const convs = getStoredConversations();

  // ইউজারের দৃষ্টিকোণ অনুযায়ী পার্টিসিপ্যান্টের নাম ও তথ্য ডায়নামিক্যালি সেট করা
  return convs.map((c) => {
    // যদি বর্তমান ইউজার Alice হয় ('c1'), তবে অপর প্রান্তের পার্টিসিপ্যান্ট Sender Demo
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
    // অন্যথায় বর্তমান ইউজার Sender হলে পার্টিসিপ্যান্ট Alice (Receiver)
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

export async function createConversation(recipientId) {
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

export async function getMessages(conversationId) {
  await delay(80);
  const allMessages = getStoredMessages();
  return allMessages[conversationId] || allMessages[DEFAULT_CONV_ID] || [];
}

export async function sendMessage(conversationId, payload) {
  await delay(100);
  const allMessages = getStoredMessages();
  const targetId = allMessages[conversationId] ? conversationId : DEFAULT_CONV_ID;
  const msgs = allMessages[targetId] || [];

  const currentUser = getCurrentUser();
  const textContent =
    typeof payload === 'string'
      ? payload
      : payload.text || payload.content || 'Sample message';

  // প্রেরকের আইডি সঠিকভাবে নির্ধারণ
  const senderId = payload.senderId || currentUser.id || 'demo-user-1';

  // প্রাপক (Receiver) কে নির্ধারণ
  const convs = getStoredConversations();
  const targetConv = convs.find((c) => c.id === targetId);
  let receiverId = 'c1';
  if (senderId === 'c1') {
    receiverId = 'demo-user-1';
  } else if (targetConv?.participantId && targetConv.participantId !== senderId) {
    receiverId = targetConv.participantId;
  }

  // রিসিভারের জন্য ইউনিক কী নিশ্চিত ও যুক্ত করা
  const rcvKeyRecord = getReceiverUniqueKeySync(receiverId);

  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId,
    receiverId,
    receiverKey: rcvKeyRecord.uniqueKey,
    receiverFingerprint: rcvKeyRecord.fingerprint,
    content: textContent,
    plaintext: textContent,
    payload: typeof payload === 'object' ? payload : { text: textContent },
    createdAt: new Date().toISOString(),
    status: 'delivered',
    encrypted: true,
    decryptError: false,
  };

  msgs.push(newMsg);
  allMessages[targetId] = msgs;
  localStorage.setItem(MSG_STORAGE_KEY, JSON.stringify(allMessages));

  // কনভারসেশনের শেষ মেসেজ আপডেট
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
  return { success: true, id: messageId };
}

export async function deleteConversation(conversationId) {
  await delay(80);
  const convs = getStoredConversations().filter((c) => c.id !== conversationId);
  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(convs));

  // সংশ্লিষ্ট মেসেজগুলো ডিলিট করা
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