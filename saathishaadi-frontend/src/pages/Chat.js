import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

let socket;

const Chat = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    socket = io(SOCKET_URL, { auth: { token } });

    socket.on('connect', () => {});
    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('user_online', (uid) => { if (uid === userId) setOnline(true); });
    socket.on('user_offline', (uid) => { if (uid === userId) setOnline(false); });
    socket.on('typing', (uid) => { if (uid === userId) { setTyping(true); setTimeout(() => setTyping(false), 2000); } });

    fetchConversations();
    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (userId) { fetchMessages(); fetchOtherUser(); }
  }, [userId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data);
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${userId}`);
      setMessages(res.data);
      socket.emit('join_chat', { userId, otherUserId: userId });
    } catch { toast.error('Messages load nahi ho sake'); }
  };

  const fetchOtherUser = async () => {
    try {
      const res = await api.get(`/users/${userId}`);
      setOtherUser(res.data);
    } catch {}
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    try {
      const res = await api.post('/messages', { receiverId: userId, content: newMsg });
      socket.emit('send_message', { receiverId: userId, message: res.data });
      setMessages(prev => [...prev, res.data]);
      setNewMsg('');
    } catch { toast.error('Message send nahi hua'); }
  };

  const handleTyping = () => {
    socket.emit('typing', { receiverId: userId });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {}, 1000);
  };

  const imgSrc = (u) => u?.photo
    ? `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000'}/uploads/${u.photo}`
    : `https://randomuser.me/api/portraits/${u?.gender === 'Male' ? 'men' : 'women'}/1.jpg`;

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>💬 Messages</div>
        {conversations.length === 0 ? (
          <div style={styles.noConv}>
            <p>Koi conversation nahi</p>
            <p style={{ fontSize: 12 }}>Proposal accept hone ke baad chat shuru hogi</p>
          </div>
        ) : (
          conversations.map(conv => {
            const other = conv.user;
            return (
              <div key={other._id}
                onClick={() => navigate(`/chat/${other._id}`)}
                style={{ ...styles.convItem, ...(userId === other._id ? styles.activeConv : {}) }}>
                <img src={imgSrc(other)} alt={other.name} style={styles.convAvatar}
                  onError={e => { e.target.src = `https://randomuser.me/api/portraits/men/1.jpg`; }} />
                <div style={styles.convInfo}>
                  <div style={styles.convName}>{other.name}</div>
                  <div style={styles.convLast}>{conv.lastMessage?.content?.substring(0, 30) || 'Chat shuru karein'}...</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chat Area */}
      {userId ? (
        <div style={styles.chatArea}>
          {/* Header */}
          <div style={styles.chatHeader}>
            <img src={imgSrc(otherUser)} alt="" style={styles.headerAvatar}
              onError={e => { e.target.src = `https://randomuser.me/api/portraits/men/1.jpg`; }} />
            <div>
              <div style={styles.headerName}>{otherUser?.name || 'Loading...'}</div>
              <div style={styles.headerStatus}>
                {typing ? '⌨️ Type kar raha/rahi hai...' : online ? '🟢 Online' : '⚪ Offline'}
              </div>
            </div>
            <div style={styles.headerActions}>
              <button onClick={() => navigate(`/call/${userId}?type=voice`)} style={styles.callBtn} title="Voice Call">📞</button>
              <button onClick={() => navigate(`/call/${userId}?type=video`)} style={styles.callBtn} title="Video Call">📹</button>
              <button onClick={() => navigate(`/profile/${userId}`)} style={styles.callBtn} title="Profile">👤</button>
            </div>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.noMessages}>
                <div style={{ fontSize: 48 }}>💌</div>
                <p>Pehla message bhejein!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.sender === user._id || msg.sender?._id === user._id;
              return (
                <div key={i} style={{ ...styles.msgWrap, justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ ...styles.bubble, ...(isMine ? styles.myBubble : styles.theirBubble) }}>
                    {msg.content}
                    <div style={styles.msgTime}>
                      {new Date(msg.createdAt).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
                      {isMine && <span style={{ marginLeft: 4 }}>✓✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} style={styles.inputArea}>
            <input
              type="text" placeholder="Message likhein..."
              value={newMsg}
              onChange={e => { setNewMsg(e.target.value); handleTyping(); }}
              style={styles.msgInput}
            />
            <button type="submit" style={styles.sendBtn} disabled={!newMsg.trim()}>Send ➤</button>
          </form>
        </div>
      ) : (
        <div style={styles.noChatSelected}>
          <div style={{ fontSize: 80 }}>💬</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }}>Messages</h2>
          <p>Left side se kisi se baat karein</p>
          <p style={{ fontSize: 13, opacity: 0.7 }}>Sirf accepted proposals mein chat ho sakti hai</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { display: 'flex', height: 'calc(100vh - 60px)', background: '#f5ece0' },
  sidebar: { width: 300, background: 'white', borderRight: '1px solid #e8d5c4', overflowY: 'auto', flexShrink: 0 },
  sidebarHeader: { padding: '18px 16px', fontFamily: "'Playfair Display', serif", fontSize: 18, color: '#1a0a0a', borderBottom: '1px solid #e8d5c4', background: '#fff8f0' },
  convItem: { display: 'flex', gap: 12, padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #f5ece0', alignItems: 'center', transition: 'background 0.2s' },
  activeConv: { background: '#fff0ec', borderLeft: '3px solid #c0392b' },
  convAvatar: { width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  convInfo: { flex: 1, overflow: 'hidden' },
  convName: { fontFamily: "'Hind', sans-serif", fontWeight: 600, fontSize: 14, color: '#1a0a0a' },
  convLast: { fontSize: 12, color: '#7a5c52', fontFamily: "'Hind', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  noConv: { padding: 20, textAlign: 'center', color: '#7a5c52', fontFamily: "'Hind', sans-serif", fontSize: 13 },
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatHeader: { padding: '14px 20px', background: 'white', borderBottom: '1px solid #e8d5c4', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  headerAvatar: { width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #c0392b' },
  headerName: { fontFamily: "'Playfair Display', serif", fontSize: 17, color: '#1a0a0a', fontWeight: 600 },
  headerStatus: { fontSize: 12, color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  headerActions: { marginLeft: 'auto', display: 'flex', gap: 8 },
  callBtn: { width: 38, height: 38, borderRadius: '50%', background: '#f5ece0', border: '1px solid #e8d5c4', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 },
  noMessages: { textAlign: 'center', margin: 'auto', color: '#7a5c52', fontFamily: "'Hind', sans-serif" },
  msgWrap: { display: 'flex' },
  bubble: { maxWidth: '70%', padding: '10px 14px', borderRadius: 14, fontFamily: "'Hind', sans-serif", fontSize: 14, lineHeight: 1.5 },
  myBubble: { background: 'linear-gradient(135deg, #c0392b, #96281b)', color: 'white', borderBottomRightRadius: 4 },
  theirBubble: { background: 'white', color: '#1a0a0a', borderBottomLeftRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },
  msgTime: { fontSize: 10, opacity: 0.7, textAlign: 'right', marginTop: 4 },
  inputArea: { display: 'flex', gap: 10, padding: '14px 16px', background: 'white', borderTop: '1px solid #e8d5c4' },
  msgInput: { flex: 1, padding: '12px 16px', border: '2px solid #e8d5c4', borderRadius: 24, fontFamily: "'Hind', sans-serif", fontSize: 14, outline: 'none' },
  sendBtn: { padding: '12px 20px', background: 'linear-gradient(135deg, #c0392b, #96281b)', color: 'white', border: 'none', borderRadius: 24, cursor: 'pointer', fontFamily: "'Hind', sans-serif", fontWeight: 700 },
  noChatSelected: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#7a5c52', fontFamily: "'Hind', sans-serif', textAlign: 'center" },
};

export default Chat;
