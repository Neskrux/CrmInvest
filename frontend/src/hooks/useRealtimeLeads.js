import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import config from '../config';

const useRealtimeLeads = () => {
  const { user, isAdmin } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const lastLeadCountRef = useRef(0);
  const notificationTimeoutRef = useRef(null);
  const { playNotificationSound } = useAudio();

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
      
      // Apenas admins devem receber notificações sonoras
      if (isAdmin) {
        // Debounce: evitar múltiplas notificações em sequência rápida
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
        }
        
        notificationTimeoutRef.current = setTimeout(() => {
          playNotificationSound('lead', data);
          notificationTimeoutRef.current = null;
        }, 100); // 100ms de debounce
      }
    });

    socketInstance.on('lead-count-update', (data) => {
      setNewLeadCount(data.count);
      
      // Não tocar som aqui - apenas no evento new-lead
      // A contagem pode ser atualizada por outros motivos (atribuição, exclusão)
      lastLeadCountRef.current = data.count;
    });

    socketInstance.on('connect_error', (error) => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      socketInstance.disconnect();
    };
  }, [user, playNotificationSound, isAdmin]);

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
    requestLeadCount
  };
};

export default useRealtimeLeads;
