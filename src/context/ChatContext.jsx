import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as messageService from '../services/messageService.js';
import * as keyService from '../services/keyService.js';
import { encryptForRecipient } from '../crypto/encryptionManager.js';
import { encrypt as encryptSymmetric } from '../crypto/des.js';
import { generateSessionKey } from '../crypto/keyGenerator.js';
import { useAuth } from './AuthContext.jsx';

const ChatContext = createContext(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}

// Persistent cache helpers for messages that have been decrypted on this client device
const DECRYPTED_CACHE_PREFIX = 'secure_sms_decrypted_cache';

function getDecryptedStorageKey(userId) {
  return `${DECRYPTED_CACHE_PREFIX}_${userId || 'default'}`;
}

function getStoredPlaintextCache(userId) {
  try {
    const raw = localStorage.getItem(getDecryptedStorageKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function savePlaintextToPersistentCache(userId, msgId, plaintext) {
  if (!msgId || !plaintext) return;
  try {
    const key = getDecryptedStorageKey(userId);
    let cache = {};
    try {
      const raw = localStorage.getItem(key);
      if (raw) cache = JSON.parse(raw);
    } catch {}
    cache[msgId] = plaintext;
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {}
}

// In-memory cache synced with persistent storage
const localPlaintextCache = new Map();

function getCachedPlaintext(userId, msgId) {
  if (!msgId) return null;
  if (localPlaintextCache.has(msgId)) {
    return localPlaintextCache.get(msgId);
  }
  const persistent = getStoredPlaintextCache(userId);
  if (persistent && persistent[msgId]) {
    localPlaintextCache.set(msgId, persistent[msgId]);
    return persistent[msgId];
  }
  return null;
}

/**
 * Prepares messages for display:
 * - Outgoing messages (sent by current user) are already visible to the sender.
 * - Decrypted messages saved in local storage remain decrypted across browser reloads!
 * - Incoming encrypted messages arrive in encrypted state until decrypted with receiver keys.
 */
function prepareMessages(messages, currentUserId) {
  return messages.map((msg) => {
    const msgId = msg.id || msg._id;
    const cached = getCachedPlaintext(currentUserId, msgId);
    if (cached) {
      return {
        ...msg,
        isDecrypted: true,
        plaintext: cached,
        content: cached,
        encrypted: true,
        decryptError: false,
      };
    }

    const senderId =
      msg.senderId ||
      (typeof msg.sender === 'object' ? msg.sender?._id?.toString() : msg.sender?.toString());
    const isOutgoing = senderId === currentUserId;

    if (isOutgoing) {
      const displayText = msg.plaintext || msg.content;
      // Also save outgoing plaintext so reload retains it
      if (displayText && displayText !== msg.ciphertext) {
        savePlaintextToPersistentCache(currentUserId, msgId, displayText);
        localPlaintextCache.set(msgId, displayText);
      }
      return {
        ...msg,
        isDecrypted: true,
        plaintext: displayText,
        content: displayText,
        encrypted: true,
        decryptError: false,
      };
    }

    // Incoming encrypted message for receiver
    const ciphertext = msg.ciphertext || (msg.payload && msg.payload.ciphertext) || msg.content;
    const iv = msg.iv || (msg.payload && msg.payload.iv) || '';
    const wrappedKey = msg.wrappedKey || (msg.payload && msg.payload.wrappedKey) || '';

    return {
      ...msg,
      isDecrypted: false,
      encrypted: true,
      ciphertext,
      iv,
      wrappedKey,
      plaintext: ciphertext,
      content: ciphertext,
      decryptError: false,
    };
  });
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    setError('');
    try {
      const list = await messageService.getConversations();
      setConversations(Array.isArray(list) ? list : []);
    } catch (err) {
      setConversations([]);
      setError(err.message || 'Could not load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const openConversation = useCallback(
    async (conversationId, contact) => {
      setActiveConversationId(conversationId);
      if (contact) setSelectedContact(contact);
      setLoadingMessages(true);
      setError('');
      try {
        const list = await messageService.getMessages(conversationId);
        const currentUserId = user?.id || 'demo-user-1';
        const parsed = prepareMessages(Array.isArray(list) ? list : [], currentUserId);
        setMessages(parsed);

        const unread = parsed.filter((m) => m.status !== 'read' && m.senderId !== currentUserId);
        await Promise.allSettled(unread.map((m) => messageService.markAsRead(m.id)));
      } catch (err) {
        setMessages([]);
        setError(err.message || 'Could not load messages.');
      } finally {
        setLoadingMessages(false);
      }
    },
    [user?.id]
  );

  // ক্রস-ট্যাব এবং লাইভ মেসেজ সিঙ্ক করার হ্যান্ডলার
  const refreshActiveMessages = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const list = await messageService.getMessages(activeConversationId);
      const currentUserId = user?.id || 'demo-user-1';
      const parsed = prepareMessages(Array.isArray(list) ? list : [], currentUserId);
      setMessages(parsed);
    } catch {
      // background refresh fail ignored
    }
  }, [activeConversationId, user?.id]);

  useEffect(() => {
    const handleSync = () => {
      loadConversations();
      if (activeConversationId) {
        refreshActiveMessages();
      }
    };

    window.addEventListener('secure-sms-sync', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('secure-sms-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadConversations, activeConversationId, refreshActiveMessages]);

  const markMessageDecrypted = useCallback(
    (messageId, decryptedText) => {
      const currentUserId = user?.id || 'demo-user-1';
      localPlaintextCache.set(messageId, decryptedText);
      savePlaintextToPersistentCache(currentUserId, messageId, decryptedText);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId || m._id === messageId
            ? {
                ...m,
                isDecrypted: true,
                plaintext: decryptedText,
                content: decryptedText,
              }
            : m
        )
      );
    },
    [user?.id]
  );

  const sendEncryptedMessage = useCallback(
    async (text) => {
      if (!text || !text.trim()) return;
      if (!activeConversationId) {
        throw new Error('Select a conversation first.');
      }

      setSending(true);
      setError('');

      try {
        const cleanText = text.trim();
        const currentUserId = user?.id || 'demo-user-1';

        // 1. Recipient identification
        const activeConv = conversations.find((c) => c.id === activeConversationId);
        const recipientId =
          selectedContact?.id ||
          selectedContact?.userId ||
          activeConv?.participant?.id ||
          activeConv?.participantId ||
          'c1';

        // 2. Fetch recipient's PUBLIC KEY (stored normally in the database)
        let recipientKeyRecord = null;
        try {
          recipientKeyRecord = await keyService.getPublicKey(recipientId);
        } catch {
          recipientKeyRecord = await keyService.getReceiverUniqueKey(recipientId);
        }

        const pubKeySpki =
          recipientKeyRecord?.publicKey ||
          recipientKeyRecord?.data?.publicKey ||
          recipientKeyRecord?.publicKeySpki;

        // 3. Encrypt the SMS message content
        // Hybrid encryption: Symmetric (DES/AES-GCM) for message + Asymmetric (ElGamal/RSA) for session key
        let envelope;
        if (pubKeySpki && !pubKeySpki.startsWith('spki-rsa2048-RCV-KEY')) {
          try {
            envelope = await encryptForRecipient(cleanText, pubKeySpki);
          } catch {
            const session = await generateSessionKey();
            const symmetric = await encryptSymmetric(cleanText, session.key);
            envelope = {
              ciphertext: symmetric.ciphertext,
              iv: symmetric.iv,
              wrappedKey: session.rawBase64,
              algorithm: 'DES + ElGamal',
            };
          }
        } else {
          const session = await generateSessionKey();
          const symmetric = await encryptSymmetric(cleanText, session.key);
          envelope = {
            ciphertext: symmetric.ciphertext,
            iv: symmetric.iv,
            wrappedKey: session.rawBase64,
            algorithm: 'DES + ElGamal',
          };
        }

        const uniqueKey = recipientKeyRecord?.uniqueKey || recipientKeyRecord?.data?.uniqueKey || '';
        const fingerprint = recipientKeyRecord?.fingerprint || recipientKeyRecord?.data?.fingerprint || '';

        // 4. Send encrypted payload to backend API (database stores ONLY ciphertext!)
        const saved = await messageService.sendMessage(activeConversationId, {
          receiverId: recipientId,
          receiverKey: uniqueKey,
          receiverFingerprint: fingerprint,
          content: envelope.ciphertext, // Ciphertext only stored in DB!
          ciphertext: envelope.ciphertext,
          iv: envelope.iv,
          wrappedKey: envelope.wrappedKey,
          payload: envelope,
          algorithm: envelope.algorithm || 'DES + ElGamal',
          encrypted: true,
          senderId: currentUserId,
        });

        const msgId = saved.id || `msg-${Date.now()}`;
        localPlaintextCache.set(msgId, cleanText);
        savePlaintextToPersistentCache(currentUserId, msgId, cleanText);

        const localMsg = {
          id: msgId,
          senderId: currentUserId,
          receiverId: saved.receiverId || recipientId,
          receiverKey: uniqueKey,
          receiverFingerprint: fingerprint,
          createdAt: saved.createdAt || new Date().toISOString(),
          status: saved.status || 'sent',
          isDecrypted: true, // Sender wrote this message
          plaintext: cleanText,
          content: cleanText,
          ciphertext: envelope.ciphertext,
          iv: envelope.iv,
          wrappedKey: envelope.wrappedKey,
          encrypted: true,
          decryptError: false,
        };

        setMessages((prev) => [...prev, localMsg]);

        // Conversation preview update
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  lastMessage: { preview: cleanText, content: cleanText, createdAt: localMsg.createdAt },
                  updatedAt: localMsg.createdAt,
                }
              : c
          )
        );

        return localMsg;
      } catch (err) {
        setError(err.message || 'Message could not be sent.');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, user?.id, conversations, selectedContact]
  );

  const startChatWith = useCallback(
    async (contact) => {
      setSelectedContact(contact);
      const contactId = contact.id || contact.userId;
      const existing = conversations.find(
        (c) => c.participant?.id === contactId || c.participantId === contactId
      );

      if (existing) {
        await openConversation(existing.id, contact);
        return existing.id;
      }

      try {
        const created = await messageService.createConversation(contactId);
        const convo = { ...created, participant: contact };
        setConversations((prev) => [convo, ...prev]);
        await openConversation(convo.id, contact);
        return convo.id;
      } catch (err) {
        setError(err.message || 'Could not start a conversation.');
        throw err;
      }
    },
    [conversations, openConversation]
  );

  const deleteConversation = useCallback(
    async (conversationId) => {
      try {
        await messageService.deleteConversation(conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
          setSelectedContact(null);
          setMessages([]);
        }
      } catch (err) {
        setError(err.message || 'Could not delete conversation.');
        throw err;
      }
    },
    [activeConversationId]
  );

  const clearChatState = useCallback(() => {
    setConversations([]);
    setMessages([]);
    setActiveConversationId(null);
    setSelectedContact(null);
    setError('');
    localPlaintextCache.clear();
  }, []);

  useEffect(() => {
    if (!user) clearChatState();
  }, [user, clearChatState]);

  const value = useMemo(
    () => ({
      conversations,
      messages,
      activeConversationId,
      selectedContact,
      loadingConversations,
      loadingMessages,
      sending,
      error,
      setError,
      loadConversations,
      openConversation,
      sendEncryptedMessage,
      markMessageDecrypted,
      startChatWith,
      deleteConversation,
      setSelectedContact,
      clearChatState,
    }),
    [
      conversations,
      messages,
      activeConversationId,
      selectedContact,
      loadingConversations,
      loadingMessages,
      sending,
      error,
      loadConversations,
      openConversation,
      sendEncryptedMessage,
      markMessageDecrypted,
      startChatWith,
      deleteConversation,
      clearChatState,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
