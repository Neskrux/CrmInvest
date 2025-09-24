import React, { createContext, useContext, useState, useMemo, useRef, useEffect } from 'react';
import useAudioNotification from '../hooks/useAudioNotification';
import NewNotification from '../components/NewNotification';

const AudioContext = createContext();

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio deve ser usado dentro de AudioProvider');
  }
  return context;
};

export const AudioProvider = ({ children }) => {
  const audioHook = useAudioNotification();
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);
  const [notificationType, setNotificationType] = useState('lead');
  const [isNotificationActive, setIsNotificationActive] = useState(false);
  const timeoutRef = useRef(null);
  
  // Memoizar o componente de áudio para evitar re-renders
  const AudioComponentMemo = useMemo(() => audioHook.AudioComponent, []);

  // Cleanup timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const playNotificationSound = (type = 'lead', data = null) => {
    // Evitar múltiplas notificações simultâneas
    if (isNotificationActive) {
      console.log('⚠️ Notificação já ativa - ignorando nova chamada');
      return;
    }
    
    console.log('🔊 AudioContext: Iniciando notificação sonora e visual para:', type);
    setIsNotificationActive(true);
    setNotificationType(type);
    setNotificationData(data);
    setShowNotification(true);
    audioHook.playNotificationSound();
  };

  const hideNotification = () => {
    console.log('🔇 AudioContext: Parando notificação');
    setIsNotificationActive(false);
    setShowNotification(false);
    setNotificationData(null);
    setNotificationType('lead');
    audioHook.stopNotificationSound();
    
    // Limpar timeout se existir
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const value = {
    ...audioHook,
    playNotificationSound,
    showNotification,
    notificationData,
    notificationType
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      <AudioComponentMemo />
      <NewNotification 
        isVisible={showNotification}
        onClose={hideNotification}
        type={notificationType}
        data={notificationData}
      />
    </AudioContext.Provider>
  );
};
