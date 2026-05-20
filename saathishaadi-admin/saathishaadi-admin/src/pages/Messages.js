import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Header from '../components/Header';
import adminAPI from '../utils/api';
import toast from 'react-hot-toast';

const getUser = (user) => ({
  _id: user?._id || 'unknown',
  name: user?.name || 'Unknown User',
  email: user?.email || '',
  gender: user?.gender || '',
});

const getMessageText = (msg) =>
  msg.adminContent || (msg.encrypted ? 'Encrypted message - admin copy available nahi hai' : msg.content || '');

const formatTime = (date) =>
  new Date(date).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

const avatarText = (name) => (name || '?').trim().charAt(0).toUpperCase();

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getMessages({ limit: 100 });
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
      toast.error('Messages load nahi hue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const conversations = useMemo(() => {
    const map = new Map();

    messages.forEach((msg) => {
      const sender = getUser(msg.sender);
      const receiver = getUser(msg.receiver);
      const ids = [sender._id, receiver._id].sort();
      const key = ids.join('_');

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          users: ids[0] === sender._id ? [sender, receiver] : [receiver, sender],
          messages: [],
          lastMessageAt: msg.createdAt,
        });
      }

      const conversation = map.get(key);
      conversation.messages.push(msg);
      if (new Date(msg.createdAt) > new Date(conversation.lastMessageAt)) {
        conversation.lastMessageAt = msg.createdAt;
      }
    });

    return Array.from(map.values())
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
      }))
      .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  }, [messages]);

  useEffect(() => {
    if (conversations.length === 0) {
      if (selectedId) setSelectedId('');
      return;
    }

    if (!selectedId || !conversations.some((conversation) => conversation.id === selectedId)) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);
  const primaryUserId = selectedConversation?.users?.[0]?._id;

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteMessage(id);
      setMessages((prev) => prev.filter((msg) => msg._id !== id));
      toast.success('Message delete kar diya');
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  return (
    <div className="page-content">
      <Header
        title="Messages"
        subtitle={`${conversations.length} users chat, ${messages.length} total messages`}
      />

      <div className="content-body">
        <div style={styles.shell}>
          {loading ? (
            <div className="loader-wrap" style={{ flex: 1 }}>
              <div className="spinner" />
            </div>
          ) : conversations.length === 0 ? (
            <div style={styles.empty}>Koi messages nahi mile</div>
          ) : selectedConversation ? (
            <>
              <aside style={styles.sidebar}>
                <div style={styles.sidebarTitle}>Users</div>
                {conversations.map((conversation) => {
                  const [first, second] = conversation.users;
                  const last = conversation.messages[conversation.messages.length - 1];
                  const active = conversation.id === selectedId;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedId(conversation.id)}
                      style={{ ...styles.conversationBtn, ...(active ? styles.conversationActive : {}) }}
                    >
                      <div style={styles.avatarPair}>
                        <span style={styles.avatar}>{avatarText(first.name)}</span>
                        <span style={{ ...styles.avatar, ...styles.avatarSecond }}>{avatarText(second.name)}</span>
                      </div>
                      <div style={styles.conversationInfo}>
                        <div style={styles.conversationNames}>
                          {first.name} ↔ {second.name}
                        </div>
                        <div style={styles.conversationLast}>{getMessageText(last).slice(0, 42)}</div>
                      </div>
                      <div style={styles.conversationMeta}>
                        <span>{conversation.messages.length}</span>
                        <small>{formatTime(conversation.lastMessageAt)}</small>
                      </div>
                    </button>
                  );
                })}
              </aside>

              <section style={styles.chat}>
                <div style={styles.chatHeader}>
                  <div style={styles.headerUsers}>
                    <div style={styles.headerAvatar}>{avatarText(selectedConversation.users[0].name)}</div>
                    <div>
                      <h3 style={styles.headerTitle}>
                        {selectedConversation.users[0].name} ↔ {selectedConversation.users[1].name}
                      </h3>
                      <p style={styles.headerSub}>
                        {selectedConversation.messages.length} messages
                      </p>
                    </div>
                  </div>
                </div>

                <div style={styles.messages}>
                  {selectedConversation.messages.map((msg) => {
                    const sender = getUser(msg.sender);
                    const isPrimary = sender._id === primaryUserId;

                    return (
                      <div
                        key={msg._id}
                        style={{
                          ...styles.messageRow,
                          justifyContent: isPrimary ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{ ...styles.bubbleWrap, alignItems: isPrimary ? 'flex-end' : 'flex-start' }}>
                          <div style={styles.senderName}>{sender.name}</div>
                          <div style={{ ...styles.bubble, ...(isPrimary ? styles.myBubble : styles.theirBubble) }}>
                            <div style={styles.messageText}>{getMessageText(msg)}</div>
                            <div style={styles.messageFooter}>
                              <span>{formatTime(msg.createdAt)}</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(msg._id)}
                                style={{ ...styles.deleteBtn, ...(isPrimary ? styles.deleteBtnLight : {}) }}
                                title="Delete message"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <div style={styles.empty}>Chat select karein</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: 'calc(100vh - 155px)',
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 16,
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
    display: 'flex',
  },
  empty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    color: 'var(--text-muted)',
  },
  sidebar: {
    width: 350,
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    background: '#fff8f0',
    overflowY: 'auto',
  },
  sidebarTitle: {
    padding: '18px 18px 12px',
    fontWeight: 700,
    color: 'var(--primary-dark)',
    borderBottom: '1px solid var(--border)',
  },
  conversationBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    border: 'none',
    borderBottom: '1px solid #f1dfcf',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
  },
  conversationActive: {
    background: '#fff',
    boxShadow: 'inset 4px 0 0 var(--primary)',
  },
  avatarPair: {
    width: 52,
    height: 42,
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--primary), var(--gold))',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    border: '2px solid #fff',
  },
  avatarSecond: {
    position: 'absolute',
    right: 0,
    top: 6,
    background: 'linear-gradient(135deg, #8e44ad, #3498db)',
  },
  conversationInfo: {
    minWidth: 0,
    flex: 1,
  },
  conversationNames: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  conversationLast: {
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
  conversationMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
    color: 'var(--text-muted)',
    fontSize: 11,
  },
  chat: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    background: '#f5ece0',
  },
  chatHeader: {
    padding: '14px 20px',
    background: '#fff',
    borderBottom: '1px solid var(--border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  headerUsers: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--primary), var(--gold))',
    color: '#fff',
    fontWeight: 700,
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    color: 'var(--dark)',
    fontSize: 18,
  },
  headerSub: {
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: 12,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '22px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },
  messageRow: {
    display: 'flex',
  },
  bubbleWrap: {
    maxWidth: '72%',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  senderName: {
    fontSize: 11,
    color: 'var(--text-muted)',
    padding: '0 6px',
  },
  bubble: {
    padding: '10px 13px',
    borderRadius: 14,
    fontSize: 14,
    lineHeight: 1.45,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    wordBreak: 'break-word',
  },
  myBubble: {
    background: 'linear-gradient(135deg, #c0392b, #96281b)',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    background: '#fff',
    color: 'var(--dark)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    whiteSpace: 'pre-wrap',
  },
  messageFooter: {
    marginTop: 5,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    fontSize: 10,
    opacity: 0.75,
  },
  deleteBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--primary)',
    fontSize: 10,
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'Hind, sans-serif',
  },
  deleteBtnLight: {
    color: '#fff',
  },
};
