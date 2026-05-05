import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import SimplePeer from 'simple-peer';
import api from '../utils/api';
import toast from 'react-hot-toast';

let socket;

const VideoCall = () => {
  const { userId: remoteUserId } = useParams();
  const [searchParams] = useSearchParams();
  const callType = searchParams.get('type') || 'video';
  const navigate = useNavigate();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  const [callState, setCallState] = useState('idle'); // idle, calling, connected, ended
  const [remoteUser, setRemoteUser] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(callType === 'voice');
  const [callDuration, setCallDuration] = useState(0);
  const durationTimer = useRef(null);

  useEffect(() => {
    fetchRemoteUser();
    initSocket();
    startCall();
    return () => cleanup();
  }, []);

  const fetchRemoteUser = async () => {
    try {
      const res = await api.get(`/users/${remoteUserId}`);
      setRemoteUser(res.data);
    } catch {}
  };

  const initSocket = () => {
    const token = localStorage.getItem('token');
    const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    socket = io(SOCKET_URL, { auth: { token } });

    socket.on('call_offer', async ({ from, signal }) => {
      if (peerRef.current) peerRef.current.signal(signal);
    });

    socket.on('call_accepted', ({ signal }) => {
      peerRef.current?.signal(signal);
      setCallState('connected');
      startDurationTimer();
    });

    socket.on('call_ended', () => {
      toast('Call ended');
      setCallState('ended');
      setTimeout(() => navigate(-1), 2000);
    });
  };

  const startCall = async () => {
    try {
      const constraints = { audio: true, video: callType === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const peer = new SimplePeer({ initiator: true, trickle: false, stream });
      peerRef.current = peer;

      peer.on('signal', (data) => {
        socket.emit('call_user', { userToCall: remoteUserId, signal: data, callType });
        setCallState('calling');
      });

      peer.on('stream', (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });

      peer.on('connect', () => { setCallState('connected'); startDurationTimer(); });
      peer.on('error', () => { toast.error('Call connect nahi ho paya'); setCallState('ended'); });
    } catch (err) {
      toast.error('Camera/Mic access nahi mila');
      setCallState('ended');
    }
  };

  const startDurationTimer = () => {
    durationTimer.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  };

  const cleanup = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.destroy();
    socket?.disconnect();
    clearInterval(durationTimer.current);
  };

  const endCall = () => {
    socket.emit('end_call', { to: remoteUserId });
    cleanup();
    navigate(-1);
  };

  const toggleMute = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) { audioTrack.enabled = muted; setMuted(!muted); }
  };

  const toggleVideo = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) { videoTrack.enabled = videoOff; setVideoOff(!videoOff); }
  };

  const formatDuration = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const imgSrc = remoteUser?.photo
    ? `${process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000'}/uploads/${remoteUser.photo}`
    : `https://randomuser.me/api/portraits/${remoteUser?.gender === 'Male' ? 'men' : 'women'}/1.jpg`;

  return (
    <div style={styles.page}>
      {/* Remote Video / Audio Call */}
      <div style={styles.remoteArea}>
        {callType === 'video' ? (
          <video ref={remoteVideoRef} autoPlay playsInline style={styles.remoteVideo} />
        ) : (
          <div style={styles.audioCallBg}>
            <img src={imgSrc} alt="" style={styles.audioAvatar}
              onError={e => { e.target.src = 'https://randomuser.me/api/portraits/men/1.jpg'; }} />
          </div>
        )}

        {/* Call Status Overlay */}
        <div style={styles.overlay}>
          <div style={styles.callInfo}>
            <div style={styles.callerName}>{remoteUser?.name || 'Connecting...'}</div>
            <div style={styles.callStatus}>
              {callState === 'calling' && '📞 Call ja raha hai...'}
              {callState === 'connected' && `🟢 Connected • ${formatDuration(callDuration)}`}
              {callState === 'ended' && '📵 Call Khatam'}
              {callType === 'voice' ? ' 🎙️ Voice Call' : ' 📹 Video Call'}
            </div>
          </div>
        </div>
      </div>

      {/* Local Video (small) */}
      {callType === 'video' && (
        <div style={styles.localVideoWrap}>
          <video ref={localVideoRef} autoPlay playsInline muted style={styles.localVideo} />
        </div>
      )}
      {callType === 'voice' && (
        <div style={{ display: 'none' }}>
          <video ref={localVideoRef} autoPlay playsInline muted />
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        <button onClick={toggleMute} style={{ ...styles.ctrlBtn, ...(muted ? styles.ctrlOff : {}) }}>
          {muted ? '🔇' : '🎙️'}
          <span style={styles.ctrlLabel}>{muted ? 'Unmute' : 'Mute'}</span>
        </button>

        {callType === 'video' && (
          <button onClick={toggleVideo} style={{ ...styles.ctrlBtn, ...(videoOff ? styles.ctrlOff : {}) }}>
            {videoOff ? '📷' : '📹'}
            <span style={styles.ctrlLabel}>{videoOff ? 'Cam On' : 'Cam Off'}</span>
          </button>
        )}

        <button onClick={endCall} style={styles.endBtn}>
          📵
          <span style={styles.ctrlLabel}>End Call</span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  page: { height: '100vh', background: '#1a1a1a', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' },
  remoteArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  remoteVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  audioCallBg: { width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a0a0a, #3d1010)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  audioAvatar: { width: 160, height: 160, borderRadius: '50%', objectFit: 'cover', border: '6px solid rgba(212,160,23,0.6)', boxShadow: '0 0 40px rgba(212,160,23,0.3)' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: '24px 20px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' },
  callInfo: { textAlign: 'center' },
  callerName: { fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'white', fontWeight: 700, marginBottom: 8 },
  callStatus: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontFamily: "'Hind', sans-serif" },
  localVideoWrap: { position: 'absolute', top: 20, right: 20, width: 130, height: 170, borderRadius: 12, overflow: 'hidden', border: '3px solid rgba(255,255,255,0.4)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' },
  localVideo: { width: '100%', height: '100%', objectFit: 'cover' },
  controls: { padding: '20px 30px', background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', gap: 24 },
  ctrlBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 12, padding: '14px 20px', cursor: 'pointer', fontSize: 26, minWidth: 70 },
  ctrlOff: { background: 'rgba(255,255,255,0.3)', opacity: 0.7 },
  ctrlLabel: { fontSize: 11, color: 'white', fontFamily: "'Hind', sans-serif" },
  endBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: '#e74c3c', border: 'none', borderRadius: 12, padding: '14px 24px', cursor: 'pointer', fontSize: 26, minWidth: 80, boxShadow: '0 4px 14px rgba(231,76,60,0.5)' },
};

export default VideoCall;
