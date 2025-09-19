import { useRef, useCallback, useEffect, useState } from 'react';

const useAudioNotification = () => {
  const audioRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const isPlayingRef = useRef(false);

  // Habilitar áudio após primeira interação do usuário
  useEffect(() => {
    const enableAudio = () => {
      setAudioEnabled(true);
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    document.addEventListener('touchstart', enableAudio);

    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };
  }, []);

  // Configurar listeners do áudio
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => {
        isPlayingRef.current = false;
      };

      const handleError = (e) => {
        isPlayingRef.current = false;
      };

      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!audioEnabled) {
      return;
    }

    if (isPlayingRef.current) {
      return;
    }

    try {
      if (audioRef.current) {
        isPlayingRef.current = true;
        
        // Pausar qualquer reprodução anterior
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        // Aguardar um pouco antes de tentar reproduzir
        setTimeout(() => {
          if (audioRef.current) {
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise.then(() => {
                isPlayingRef.current = false;
              }).catch(error => {
                isPlayingRef.current = false;
                
                // Se for AbortError, tentar novamente
                if (error.name === 'AbortError') {
                  setTimeout(() => {
                    if (audioRef.current && !isPlayingRef.current) {
                      isPlayingRef.current = true;
                      audioRef.current.play().then(() => {
                        isPlayingRef.current = false;
                      }).catch(err => {
                        isPlayingRef.current = false;
                      });
                    }
                  }, 100);
                }
              });
            }
          }
        }, 50);
      }
    } catch (error) {
      isPlayingRef.current = false;
    }
  }, [audioEnabled]);

  const AudioComponent = () => (
    <audio
      ref={audioRef}
      preload="auto"
      style={{ display: 'none' }}
      crossOrigin="anonymous"
      key="audio-notification"
    >
      <source src="/audioNovoLead.mp3" type="audio/mpeg" />
    </audio>
  );

  return {
    playNotificationSound,
    AudioComponent,
    audioEnabled
  };
};

export default useAudioNotification;