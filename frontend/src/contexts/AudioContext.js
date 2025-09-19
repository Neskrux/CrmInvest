import React, { createContext, useContext } from 'react';
import useAudioNotification from '../hooks/useAudioNotification';

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

  return (
    <AudioContext.Provider value={audioHook}>
      {children}
      <audioHook.AudioComponent />
    </AudioContext.Provider>
  );
};
