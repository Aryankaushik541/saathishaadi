import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { DUMMY_PROFILES } from '../utils/dummyData';
import toast from 'react-hot-toast';
import SimplePeer from 'simple-peer';
import './ChatPage.css';

const API = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ChatPage = () => {
  const { userId: chatWithId } = useParams();
  const { user } = useAuth();
  const { getSocket } = useSocket();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState([]);
  const [activeChat, setActiveChat] = useState(chatWithId || null);
  const [activePerson, setActivePerson] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Call state
  const [callState, setCallState] = useState(null); // null | 'calling' | 'receiving' | 'in-call'
  const [callType, setCallType] = useState(null); // 'video' | 'voice'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);

  // Dummy contacts from accepted proposals
  const dummyContacts = DUMMY_PROFILES.slice(0, 4);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (activeChat) {
      const person = contacts.find(c => c._id === activeChat) || dummyContacts.find(p => p._id === activeChat);
      setActivePerson(person || dummyContacts[0]);
      fetchMessages(activeChat);
    }
  }, [activeChat, contacts]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('receive_message', (msg) => {
      if (msg.from === activeChat || msg.to === activeChat) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    });

    socket.on('incoming_call', ({ from, type, signal }) => {
      setCallType(type);
      setCallState('receiving');
      peerRef.current = { from, signal };
    });

    socket.on('call_accepted', ({ signal }) => {
      if (peerRef.current?.peer) {
        peerRef.current.peer.signal(signal);
      }
    });

    socket.on('call_ended', () => {
      endCall();
    });

    return () => {
      socket.off('receive_message');
      socket.off('incoming_call');
      socket.off('call_accepted');
      socket.off('call_ended');
    };
  }, [getSocket, activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const fetchContacts = async () => {
    try {
      const res = await axios.get('/chat/contacts');
      setContacts(res.data.contacts || dummyContacts);
    } catch {
      setContacts(dummyContacts);
    }
  };

  const fetchMessages = async (otherId) => {
    setLoading(true);
    try {
      const res = await axios.get(`/chat/messages/${otherId}`);
      setMessages(res.data.messages || getDummyMessages(otherId));
    } catch {
      setMessages(getDummyMessages(otherId));
    } finally {
      setLoading(false);
    }
  };

  const getDummyMessages = (id) => [
    { _id: '1', from: id, text: 'Namaskar! Aapka profile dekha, bahut achha laga 🙏', createdAt: new Date(Date.now() - 60000 * 5).toISOString() },
    { _id: '2', from: user?._id || 'me', text: 'Dhanyawad! Aapki bhi profile bahut sundar hai 😊', createdAt: new Date(Date.now() - 60000 * 3).toISOString() },
    { _id: '3', from: id, text: 'Aap kahaan se hain Bihar mein? Hamaara parivar Gaya ka hai.', createdAt: new Date(Date.now() - 60000 * 2).toISOString() },
    { _id: '4', from: user?._id || 'me', text: 'Hum Patna se hain. Aapke baare mein aur jaanna chahte hain 🙏', createdAt: new Date(Date.now() - 60000).toISOString() },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const socket = getSocket();
    const msgData = {
      to: activeChat,
      text: newMsg,
      from: user?._id,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, { ...msgData, _id: Date.now().toString() }]);
    setNewMsg('');

    try {
      if (socket) socket.emit('send_message', msgData);
      await axios.post('/chat/send', { toUserId: activeChat, text: newMsg });
    } catch (err) {
      console.log('Send error (demo mode)');
    }
  };

  // ===== CALL FUNCTIONS =====
  const startCall = async (type) => {
    try {
      const constraints = type === 'video' 
        ? { video: true, audio: true }
        : { video: false, audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setCallType(type);
      setCallState('calling');

      const newPeer = new SimplePeer({ initiator: true, trickle: false, stream });
      peerRef.current = { peer: newPeer };

      newPeer.on('signal', (signal) => {
        const socket = getSocket();
        if (socket) {
          socket.emit('call_user', { to: activeChat, from: user?._id, type, signal });
        }
      });

      newPeer.on('stream', (remoteStr) => {
        setRemoteStream(remoteStr);
        setCallState('in-call');
      });

      newPeer.on('error', (err) => {
        console.log('Peer error:', err);
        endCall();
      });

      setPeer(newPeer);
      toast.success(`${type === 'video' ? '📹 Video' : '📞 Voice'} call shuru ho raha hai...`);
    } catch (err) {
      toast.error('Camera/Microphone access nahi mila. Permission dein.');
      console.log('Media error:', err);
    }
  };

  const acceptCall = async () => {
    try {
      const constraints = callType === 'video' 
        ? { video: true, audio: true }
        : { video: false, audio: true };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setCallState('in-call');

      const newPeer = new SimplePeer({ initiator: false, trickle: false, stream });
      
      newPeer.signal(peerRef.current.signal);

      newPeer.on('signal', (signal) => {
        const socket = getSocket();
        if (socket) {
          socket.emit('accept_call', { to: peerRef.current.from, signal });
        }
      });

      newPeer.on('stream', (remoteStr) => {
        setRemoteStream(remoteStr);
      });

      setPeer(newPeer);
    } catch (err) {
      toast.error('Call accept karne mein error');
    }
  };

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (peer) {
      peer.destroy();
    }
    if (peerRef.current?.peer) {
      peerRef.current.peer.destroy();
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    setCallType(null);
    setPeer(null);
    peerRef.current = null;

    const socket = getSocket();
    if (socket) socket.emit('end_call', { to: activeChat });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const activePersonPhoto = activePerson?.photo
    ? (activePerson.photo.startsWith('http') ? activePerson.photo : `${API}${activePerson.photo}`)
    : 'https://randomuser.me/api/portraits/lego/1.jpg';

  return (
    <div className="chat-page">
      {/* Contacts Sidebar */}
      <aside className="contacts-sidebar">
        <div className="contacts-header">
          <h3>💬 Messages</h3>
        </div>
        <div className="contacts-list">
          {(contacts.length ? contacts : dummyContacts).map(c => {
            const cPhoto = c.photo ? (c.photo.startsWith('http') ? c.photo : `${API}${c.photo}`) : 'https://randomuser.me/api/portraits/lego/1.jpg';
            return (
              <div
                key={c._id}
                className={`contact-item ${activeChat === c._id ? 'active' : ''}`}
                onClick={() => { setActiveChat(c._id); navigate(`/chat/${c._id}`); }}
              >
                <div className="contact-avatar-wrap">
                  <img src={cPhoto} alt={c.name} className="contact-avatar" />
                  <span className="contact-online"></span>
                </div>
                <div className="contact-info">
                  <div className="contact-name">{c.name}</div>
                  <div className="contact-preview">
                    {c.location || 'Bihar'} • {c.age} yrs
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Chat Area */}
      {activeChat ? (
        <div className="chat-area">
          {/* Call Overlay */}
          {callState && (
            <div className={`call-overlay ${callType}`}>
              {callType === 'video' && (
                <div className="video-container">
                  <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
                  <video ref={localVideoRef} autoPlay playsInline muted className="local-video" />
                </div>
              )}
              {callType === 'voice' && (
                <div className="voice-call-ui">
                  <img src={activePersonPhoto} alt="" className="call-person-img" />
                  <h3>{activePerson?.name}</h3>
                  <div className="call-status-text">
                    {callState === 'calling' && '📞 Call ja raha hai...'}
                    {callState === 'receiving' && '📞 Call aa rahi hai...'}
                    {callState === 'in-call' && '🟢 Call chal raha hai...'}
                  </div>
                  <div className="call-duration">🎵 Voice Call</div>
                </div>
              )}
              <div className="call-controls">
                {callState === 'receiving' && (
                  <button className="call-btn accept-call" onClick={acceptCall}>
                    📞 Receive
                  </button>
                )}
                <button className="call-btn end-call" onClick={endCall}>
                  📵 End Call
                </button>
              </div>
              {callState === 'calling' && (
                <div className="call-waiting">Aa raha hai...</div>
              )}
            </div>
          )}

          {/* Chat Header */}
          <div className="chat-header">
            <img src={activePersonPhoto} alt={activePerson?.name} className="chat-person-img" />
            <div className="chat-person-info">
              <div className="chat-person-name">{activePerson?.name}</div>
              <div className="chat-person-status">
                <span className="online-dot"></span> Online • {activePerson?.location || 'Bihar'}
              </div>
            </div>
            <div className="chat-header-actions">
              <button className="chat-call-btn voice" onClick={() => startCall('voice')} title="Voice Call">
                📞
              </button>
              <button className="chat-call-btn video" onClick={() => startCall('video')} title="Video Call">
                📹
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-area">
            {loading ? (
              <div className="msg-loading">Messages load ho rahe hain...</div>
            ) : (
              <>
                <div className="chat-date-divider">Aaj</div>
                {messages.map(msg => {
                  const isMine = msg.from === user?._id || msg.from === 'me';
                  return (
                    <div key={msg._id} className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                      <div className="bubble-text">{msg.text}</div>
                      <div className="bubble-time">{formatTime(msg.createdAt)}</div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <form className="message-input-form" onSubmit={sendMessage}>
            <input
              type="text"
              className="message-input"
              placeholder="Kuch likhein... 🪷"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              maxLength={500}
            />
            <button type="submit" className="send-btn" disabled={!newMsg.trim()}>
              ➤
            </button>
          </form>
        </div>
      ) : (
        <div className="no-chat-selected">
          <div className="no-chat-icon">💬</div>
          <h3>Baat Shuru Karein</h3>
          <p>Left se koi contact chunein aur baat shuru karein</p>
          <p style={{fontSize:'13px',color:'var(--text-light)',marginTop:8}}>
            Sirf accepted proposals ke baad hi chat hogi 🔒
          </p>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
