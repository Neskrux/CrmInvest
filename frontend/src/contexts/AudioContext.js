import React, { createContext, useContext, useState, useMemo } from 'react';
import useAudioNotification from '../hooks/useAudioNotification';
import NewLeadNotification from '../components/NewLeadNotification';

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
  const [leadData, setLeadData] = useState(null);
  
  // Memoizar o componente de áudio para evitar re-renders
  const AudioComponentMemo = useMemo(() => audioHook.AudioComponent, []);

  const playNotificationSound = () => {
    console.log('📢 AudioContext: Iniciando notificação e som...');
    setShowNotification(true);
    audioHook.playNotificationSound();
  };

  const hideNotification = () => {
    console.log('🔕 AudioContext: Fechando notificação e parando som...');
    setShowNotification(false);
    setLeadData(null);
    audioHook.stopNotificationSound();
  };

  const value = {
    ...audioHook,
    playNotificationSound,
    showNotification,
    leadData
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
      <AudioComponentMemo />
      <NewLeadNotification 
        isVisible={showNotification}
        onClose={hideNotification}
        leadData={leadData}
      />
    </AudioContext.Provider>
  );
};
