import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (token && user) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket']
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        socketRef.current.emit('user_online', user._id);
      });

      socketRef.current.on('online_users', (users) => {
        setOnlineUsers(users);
      });

      socketRef.current.on('new_notification', (notif) => {
        setNotifications(prev => [notif, ...prev]);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      return () => {
        socketRef.current.disconnect();
      };
    }
  }, [token, user]);

  const getSocket = () => socketRef.current;

  const clearNotifications = () => setNotifications([]);

  return (
    <SocketContext.Provider value={{ getSocket, onlineUsers, notifications, clearNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
