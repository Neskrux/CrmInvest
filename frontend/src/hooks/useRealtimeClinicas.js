import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import config from '../config';

const useRealtimeClinicas = () => {
  const { user, isAdmin } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newClinicasCount, setNewClinicasCount] = useState(0);
  const lastClinicasCountRef = useRef(0);
  const notificationTimeoutRef = useRef(null);
  const { playNotificationSound } = useAudio();

  useEffect(() => {
    if (!user) return;

    console.log('🔌 Iniciando conexão Socket.IO para clínicas com:', config.BACKEND_URL);
    const socketInstance = io(config.BACKEND_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO conectado com sucesso para clínicas!');
      setIsConnected(true);
      
      console.log('📢 Entrando no grupo de notificações de clínicas:', {
        userId: user.id,
        userType: user.tipo
      });
      
      socketInstance.emit('join-clinicas-notifications', {
        userId: user.id,
        userType: user.tipo
      });
      
      // Solicitar contagem atual de clínicas
      socketInstance.emit('request-clinicas-count', {
        userId: user.id,
        userType: user.tipo
      });
    });

    socketInstance.on('new-clinica', (data) => {
      console.log('🏥 Evento new-clinica recebido:', data);
      setNewClinicasCount(prev => prev + 1);
      
      // Apenas admins devem receber notificações sonoras
      if (isAdmin) {
        // Debounce: evitar múltiplas notificações em sequência rápida
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
        }
        
        notificationTimeoutRef.current = setTimeout(() => {
          console.log('🔊 Admin detectado - tocando som de notificação para nova clínica');
          playNotificationSound('clinica', data);
        }, 200);
      } else {
        console.log('👤 Usuário não é admin - som não será tocado para clínica');
      }
    });

    socketInstance.on('clinicas-count-update', (data) => {
      console.log('📊 Evento clinicas-count-update recebido:', data);
      setNewClinicasCount(data.count);
      
      // Não tocar som aqui - apenas no evento new-clinica
      // A contagem pode ser atualizada por outros motivos (aprovação, exclusão)
      lastClinicasCountRef.current = data.count;
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.IO desconectado (clínicas)');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Erro de conexão Socket.IO (clínicas):', error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      // Limpar timeout ao desmontar
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      socketInstance.disconnect();
    };
  }, [user, playNotificationSound, isAdmin]);

  const requestClinicasCount = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('request-clinicas-count', {
        userId: user?.id,
        userType: user?.tipo
      });
    }
  }, [socket, isConnected, user]);

  return {
    socket,
    isConnected,
    newClinicasCount,
    requestClinicasCount
  };
};

export default useRealtimeClinicas;
