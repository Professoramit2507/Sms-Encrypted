import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../components/common/AppShell.jsx';
import ChatSidebar from '../components/chat/ChatSidebar.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import { useChat } from '../context/ChatContext.jsx';

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const {
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
    deleteConversation,
  } = useChat();
  const [search, setSearch] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(conversationId));

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (conversations.length === 0) return;
    if (conversationId) {
      const match = conversations.find((c) => String(c.id) === String(conversationId));
      if (match) {
        openConversation(match.id, match.participant);
        setMobileShowChat(true);
      }
    } else if (window.innerWidth >= 1024 && !activeConversationId) {
      openConversation(conversations[0].id, conversations[0].participant);
    }
  }, [conversationId, conversations, openConversation, activeConversationId]);

  const onSelect = async (conversation) => {
    setError('');
    await openConversation(conversation.id, conversation.participant);
    navigate(`/chat/${conversation.id}`);
    setMobileShowChat(true);
  };

  const onSend = async (text) => {
    await sendEncryptedMessage(text);
  };

  const onDeleteConversation = async (convId) => {
    await deleteConversation(convId);
    if (String(convId) === String(activeConversationId) || String(convId) === String(conversationId)) {
      setMobileShowChat(false);
      navigate('/chat');
    }
  };

  return (
    <AppShell>
      <div className="mx-auto h-[calc(100vh-7rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-obsidian-900/90 lg:h-[calc(100vh-5rem)]">
        <div className="flex h-full">
          <div className={`${mobileShowChat ? 'hidden' : 'block'} w-full lg:block lg:w-80`}>
            <ChatSidebar
              conversations={conversations}
              activeId={activeConversationId}
              search={search}
              onSearch={setSearch}
              onSelect={onSelect}
              onDelete={onDeleteConversation}
              loading={loadingConversations}
            />
          </div>
          <div className={`${mobileShowChat ? 'block' : 'hidden'} min-w-0 flex-1 lg:block`}>
            <ChatWindow
              contact={selectedContact}
              messages={messages}
              loading={loadingMessages}
              sending={sending}
              error={error}
              onSend={onSend}
              onBack={() => {
                setMobileShowChat(false);
                navigate('/chat');
              }}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
