import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import useAudioNotification from './useAudioNotification';
import config from '../config';

const useRealtimeLeads = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const lastLeadCountRef = useRef(0);
  const { playNotificationSound, AudioComponent } = useAudioNotification();

  useEffect(() => {
    if (!user) return;

    const socketInstance = io(config.BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      
      socketInstance.emit('join-lead-notifications', {
        userId: user.id,
        userType: user.tipo
      });
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('new-lead', (data) => {
      setNewLeadCount(prev => prev + 1);
      playNotificationSound();
    });

    socketInstance.on('lead-count-update', (data) => {
      setNewLeadCount(data.count);
      
      if (data.count > lastLeadCountRef.current) {
        playNotificationSound();
      }
      lastLeadCountRef.current = data.count;
    });

    socketInstance.on('connect_error', (error) => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, playNotificationSound]);

  const requestLeadCount = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('request-lead-count', {
        userId: user?.id,
        userType: user?.tipo
      });
    }
  }, [socket, isConnected, user]);

  return {
    socket,
    isConnected,
    newLeadCount,
    requestLeadCount,
    AudioComponent
  };
};

export default useRealtimeLeads;
