import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as messageService from '../services/messageService.js';
import { useAuth } from './AuthContext.jsx';

const ChatContext = createContext(null);

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}

// সেফ মেসেজ পার্সার (মক এবং রিয়েল টেক্সট হ্যান্ডলার)
function parseMessages(messages) {
  return messages.map((msg) => {
    const rawContent = msg.plaintext || msg.content || msg.payload?.text || msg.payload || '';
    const text = typeof rawContent === 'object' ? JSON.stringify(rawContent) : String(rawContent);

    return {
      ...msg,
      plaintext: text,
      content: text,
      encrypted: msg.encrypted !== false,
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
        const parsed = parseMessages(Array.isArray(list) ? list : []);
        setMessages(parsed);

        const unread = parsed.filter((m) => m.status !== 'read' && m.senderId !== user?.id);
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
      const parsed = parseMessages(Array.isArray(list) ? list : []);
      setMessages(parsed);
    } catch {
      // background refresh fail ignored
    }
  }, [activeConversationId]);

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

  const sendEncryptedMessage = useCallback(
    async (text) => {
      if (!text || !text.trim()) return;
      if (!activeConversationId) {
        throw new Error('Select a conversation first.');
      }

      setSending(true);
      setError('');
      try {
        const currentUserId = user?.id || 'demo-user-1';

        // মেসেজ সার্ভিসে পাঠানো (প্রেরকের আইডি ও কনভারসেশন আইডি সহ)
        const saved = await messageService.sendMessage(activeConversationId, {
          text: text.trim(),
          content: text.trim(),
          senderId: currentUserId,
        });

        const localMsg = {
          id: saved.id || `msg-${Date.now()}`,
          senderId: currentUserId,
          receiverId: saved.receiverId,
          receiverKey: saved.receiverKey,
          receiverFingerprint: saved.receiverFingerprint,
          createdAt: saved.createdAt || new Date().toISOString(),
          status: saved.status || 'sent',
          plaintext: text.trim(),
          content: text.trim(),
          encrypted: true,
          decryptError: false,
        };

        setMessages((prev) => [...prev, localMsg]);

        // কনভারসেশনের প্রিভিউ আপডেট
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  lastMessage: { preview: text.trim(), content: text.trim(), createdAt: localMsg.createdAt },
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
    [activeConversationId, user?.id]
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
      startChatWith,
      deleteConversation,
      clearChatState,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}