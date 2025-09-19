import { useRef, useCallback, useEffect, useState } from 'react';

const useAudioNotification = () => {
  const audioRef = useRef(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const isPlayingRef = useRef(false);

  // Habilitar áudio após primeira interação do usuário
  useEffect(() => {
    const enableAudio = () => {
      console.log('🔊 Áudio habilitado!');
      setAudioEnabled(true);
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    // Verificar se já houve interação (se estamos em uma página já carregada)
    if (document.hasFocus()) {
      setAudioEnabled(true);
    }

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
        console.log('🔄 Áudio terminou, verificando se deve repetir...');
        // Se ainda deve estar tocando, reiniciar o áudio
        if (isPlayingRef.current) {
          console.log('🔁 Reiniciando áudio em loop...');
          audio.currentTime = 0;
          audio.play().catch(err => {
            console.error('❌ Erro ao reiniciar loop:', err);
          });
        }
      };

      const handleError = (e) => {
        console.error('❌ Erro no áudio:', e);
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
    console.log('🎵 playNotificationSound chamado, audioEnabled:', audioEnabled);
    
    if (!audioEnabled) {
      console.log('❌ Áudio não habilitado - tentando habilitar...');
      setAudioEnabled(true);
    }

    try {
      if (audioRef.current) {
        const audio = audioRef.current;
        console.log('🎵 Elemento de áudio encontrado, iniciando...');
        
        // Marcar como tocando ANTES de iniciar
        isPlayingRef.current = true;
        
        // Resetar o áudio
        audio.pause();
        audio.currentTime = 0;
        audio.loop = true; // Configurar loop no elemento
        
        // Tentar reproduzir
        audio.play().then(() => {
          console.log('✅ Áudio tocando! Loop ativo:', audio.loop);
        }).catch(error => {
          console.error('❌ Erro ao tocar áudio:', error);
          isPlayingRef.current = false;
          
          // Tentar novamente após um pequeno delay
          setTimeout(() => {
            if (audioRef.current && isPlayingRef.current) {
              console.log('🔄 Segunda tentativa...');
              isPlayingRef.current = true;
              audioRef.current.loop = true;
              audioRef.current.play().then(() => {
                console.log('✅ Funcionou na segunda tentativa!');
              }).catch(err => {
                console.error('❌ Falhou novamente:', err);
                isPlayingRef.current = false;
              });
            }
          }, 100);
        });
      } else {
        console.error('❌ audioRef.current é null!');
      }
    } catch (error) {
      console.error('❌ Erro ao executar playNotificationSound:', error);
    }
  }, [audioEnabled]);

  const stopNotificationSound = useCallback(() => {
    try {
      if (audioRef.current) {
        const audio = audioRef.current;
        console.log('🛑 Parando áudio em loop...');
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
        isPlayingRef.current = false;
        console.log('✅ Áudio parado!');
      }
    } catch (error) {
      console.error('❌ Erro ao parar áudio:', error);
      isPlayingRef.current = false;
    }
  }, []);

  const AudioComponent = () => {
    console.log('🎧 AudioComponent renderizado');
    return (
      <audio
        ref={audioRef}
        preload="auto"
        loop={true}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
        key="audio-notification"
      >
        <source src="/audioNovoLead.mp3" type="audio/mpeg" />
      </audio>
    );
  };

  return {
    playNotificationSound,
    stopNotificationSound,
    AudioComponent,
    audioEnabled
  };
};

export default useAudioNotification;