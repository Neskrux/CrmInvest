import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import logoBrasao from '../images/logobrasaopreto.png';

const useFechamentoNotifications = () => {
  const { user } = useAuth();
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [fechamentoData, setFechamentoData] = useState(null);
  const audioInstanceRef = useRef(null);
  const modalTimerRef = useRef(null);
  const socketRef = useRef(null);
  const isInitializedRef = useRef(false);
  const previousModalStateRef = useRef(false); // Rastrear estado anterior do modal para detectar transições
  const audioStartedRef = useRef(false); // Rastrear se a música já começou a tocar
  const timerCreatedAtRef = useRef(null); // Timestamp de quando o timer foi criado para proteção
  const preloadedAudioRef = useRef(null); // Áudio pré-carregado para iniciar mais rápido
  const lastJoinCheckRef = useRef(0); // Ref para rastrear último check de join sem usar localStorage
  const joiningGroupRef = useRef(false); // Ref para evitar múltiplas chamadas simultâneas de joinGroup

  // Função GLOBAL para parar TODOS os áudios da página (incluindo outros hooks)
  const stopAllAudio = useCallback(() => {
    // Parar áudio deste hook
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current.currentTime = 0;
      audioInstanceRef.current = null;
    }
    
    // Parar TODOS os elementos <audio> na página (incluindo outros hooks)
    try {
      const allAudioElements = document.querySelectorAll('audio');
      allAudioElements.forEach((audio) => {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      console.log('🔇 [FECHAMENTO] Todos os áudios parados (incluindo outros hooks)');
    } catch (error) {
      console.error('❌ [FECHAMENTO] Erro ao parar todos os áudios:', error);
    }
  }, []);

  // Função para parar música - estabilizada com useCallback
  const stopFechamentoSound = useCallback(() => {
    stopAllAudio();
  }, [stopAllAudio]);

  // Função para tocar música - estabilizada com useCallback
  const playFechamentoSound = useCallback((musicaUrl) => {
    // Se já começou a tocar, não tentar novamente (evitar duplicatas)
    if (audioStartedRef.current && audioInstanceRef.current && !audioInstanceRef.current.paused) {
      console.log('🔊 [FECHAMENTO] Música já está tocando, ignorando nova tentativa');
      return;
    }

    try {
      // Tentar reutilizar áudio pré-carregado se disponível
      const expectedSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
      if (preloadedAudioRef.current) {
        // Verificar se é o mesmo arquivo (URL completa ou apenas nome do arquivo)
        const preloadSrc = preloadedAudioRef.current.src || '';
        const isSameFile = preloadSrc.includes(musicaUrl || 'audioNovoLead.mp3') || 
                          (musicaUrl && preloadSrc.includes(musicaUrl.split('/').pop()));
        if (isSameFile) {
          console.log('♻️ [FECHAMENTO] Reutilizando áudio pré-carregado');
          audioInstanceRef.current = preloadedAudioRef.current;
          preloadedAudioRef.current = null; // Limpar ref após usar
        } else {
          // Descarta pré-carregado se for arquivo diferente
          preloadedAudioRef.current = null;
        }
      }
      
      // Se não reutilizou, criar novo
      if (!audioInstanceRef.current) {
        // Parar áudio anterior se existir
        stopFechamentoSound();
        
        // Usar música personalizada do corretor se disponível, senão usar áudio padrão
        const audioSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        
        const audio = new Audio(audioSource);
        audio.volume = 0.6; // Volume baixo para evitar travadas
        audio.loop = false; // Música toca uma vez e para
        audio.preload = 'auto';
        
        audioInstanceRef.current = audio;
      }
      
      audioStartedRef.current = false;
      
      // Garantir que temos a referência do áudio
      const currentAudio = audioInstanceRef.current;
      if (!currentAudio) return;
      
      // Listener para quando a música terminar - fechar modal automaticamente
      const handleAudioEnded = () => {
        console.log('🎵 [AUDIO] Música terminou - fechando modal automaticamente');
        audioStartedRef.current = false;
        stopFechamentoSound();
        setShowFechamentoModal(false);
        setFechamentoData(null);
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        timerCreatedAtRef.current = null;
        // Remover o listener após usar
        if (currentAudio) {
          currentAudio.removeEventListener('ended', handleAudioEnded);
        }
      };
      
      currentAudio.addEventListener('ended', handleAudioEnded);
      
      // Tentar tocar música quando o áudio estiver pronto
      const tryPlay = (attemptNumber = 0) => {
        if (!audioInstanceRef.current) return;
        
        const playPromise = audioInstanceRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              audioStartedRef.current = true;
              console.log(`✅ [FECHAMENTO] Música tocando! (tentativa ${attemptNumber + 1})`);
            })
            .catch(error => {
              // Erro de autoplay policy - tentar novamente com pequenos delays
              // Estratégia de retry mais agressiva: tentar tocar após pequenos delays
              const retryDelays = [50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000]; // Mais tentativas com delays menores
              let retryCount = 0;
              
              const tryPlayAgain = () => {
                if (retryCount < retryDelays.length && audioInstanceRef.current) {
                  const delay = retryDelays[retryCount];
                  
                  setTimeout(() => {
                    if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
                      audioInstanceRef.current.play()
                        .then(() => {
                          audioStartedRef.current = true;
                          console.log(`✅ [FECHAMENTO] Música tocando após retry ${retryCount + 1}!`);
                        })
                        .catch((err) => {
                          retryCount++;
                          if (retryCount < retryDelays.length) {
                            tryPlayAgain();
                          } else {
                            console.log('⚠️ [FECHAMENTO] Música não tocará - todas as tentativas falharam');
                          }
                        });
                    }
                  }, delay);
                }
              };
              
              tryPlayAgain();
            });
        }
      };
      
      // Tentar tocar imediatamente
      tryPlay(0);
      
      // Múltiplas tentativas iniciais com delays pequenos
      const immediateRetries = [25, 50, 75, 100, 150, 200];
      immediateRetries.forEach((delay, index) => {
        setTimeout(() => {
          if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
            tryPlay(index + 1);
          }
        }, delay);
      });
      
      // Tentar também quando o áudio começar a carregar
      audioInstanceRef.current.addEventListener('loadstart', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('🔄 [FECHAMENTO] Áudio iniciando carregamento - tentando tocar...');
          tryPlay(100);
        }
      }, { once: true });
      
      // Tentar também quando houver dados suficientes para tocar
      audioInstanceRef.current.addEventListener('loadeddata', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('📥 [FECHAMENTO] Áudio carregado - tentando tocar...');
          tryPlay(101);
        }
      }, { once: true });

      // Tentar também quando o áudio estiver pronto para tocar
      audioInstanceRef.current.addEventListener('canplay', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('▶️ [FECHAMENTO] Áudio pronto - tentando tocar...');
          tryPlay(102);
        }
      }, { once: true });

      // Tentar quando o áudio pode tocar sem interrupção
      audioInstanceRef.current.addEventListener('canplaythrough', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('🎯 [FECHAMENTO] Áudio totalmente carregado - tentando tocar...');
          tryPlay(103);
        }
      }, { once: true });
    } catch (error) {
      console.error('❌ [FECHAMENTO] Erro ao criar áudio:', error);
    }
  }, [stopFechamentoSound]);

  // Função para fechar modal - estabilizada com useCallback
  const fecharModal = useCallback(() => {
    stopFechamentoSound();
    if (modalTimerRef.current) {
      clearTimeout(modalTimerRef.current);
      modalTimerRef.current = null;
    }
    setShowFechamentoModal(false);
    setFechamentoData(null);
  }, [stopFechamentoSound]);

  // Estabilizar dados do usuário com useMemo
  const userData = useMemo(() => ({
    id: user?.id,
    empresa_id: user?.empresa_id,
    tipo: user?.tipo
  }), [user?.id, user?.empresa_id, user?.tipo]);

  // REMOVIDO: useEffect para processar notificação pendente do localStorage
  // Não precisamos mais disso pois não estamos mais fazendo reload da página

  // Inicializar socket apenas uma vez
  useEffect(() => {
    // Permitir entrada APENAS para admin da incorporadora
    if (!userData || userData.tipo !== 'admin' || userData.empresa_id !== 5 || !userData.id) {
      return;
    }

    // CRÍTICO: Cada hook precisa de sua própria conexão Socket.IO
    // Não reutilizar conexões de outros hooks para evitar conflitos de listeners

    // Limpar conexões desconectadas antes de criar nova
    if (socketRef.current && !socketRef.current.connected) {
      console.log('🧹 [FECHAMENTO] Limpando conexão desconectada antes de criar nova');
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Verificar se já foi inicializado (evitar múltiplas inicializações)
    if (isInitializedRef.current && socketRef.current) {
      return;
    }

    // Configurar URL do backend
    const API_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    // Conectar ao Socket.IO com configurações para múltiplas abas
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true, // ✅ FORÇAR nova conexão - cada dispositivo precisa da sua própria!
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      query: {
        tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userData.id,
        empresaId: userData.empresa_id
      },
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true
    });
    
    socketRef.current = newSocket;
    isInitializedRef.current = true;

    // Função auxiliar para entrar no grupo (chamada múltiplas vezes se necessário)
    const joinGroup = () => {
      // Proteção contra múltiplas chamadas simultâneas
      if (joiningGroupRef.current) {
        console.log('⚠️ [FECHAMENTO] Join já em andamento, ignorando chamada duplicada');
        return;
      }
      
      if (!newSocket.connected) {
        console.warn('⚠️ [FECHAMENTO] Socket não conectado, aguardando conexão...');
        return;
      }
      
      joiningGroupRef.current = true;
      
      console.log('📢 [SOCKET.IO] Entrando no grupo incorporadora-notifications:', {
        socketId: newSocket.id,
        userId: userData.id,
        empresaId: userData.empresa_id,
        connected: newSocket.connected,
        deviceId: newSocket.query?.deviceId,
        timestamp: new Date().toISOString()
      });
      
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: userData.id,
        empresaId: userData.empresa_id
      });
      
      // Resetar flag após um tempo para permitir nova tentativa se necessário
      setTimeout(() => {
        joiningGroupRef.current = false;
      }, 2000);
    };

    // CRÍTICO: Adicionar listener ANTES de entrar no grupo
    // Isso garante que eventos sejam capturados mesmo se a conexão já estiver estabelecida
    const handleNewFechamento = (data) => {
      try {
        console.log('🔔🔔🔔 [FECHAMENTO NOTIFICATIONS] Recebido evento new-fechamento-incorporadora:', {
          fechamentoId: data.fechamentoId,
          paciente_nome: data.paciente_nome,
          corretor_nome: data.corretor_nome,
          valor_fechado: data.valor_fechado,
          socketId: newSocket.id,
          deviceId: newSocket.query?.deviceId,
          tabId: newSocket.query?.tabId,
          userId: userData.id,
          empresaId: userData.empresa_id,
          connected: newSocket.connected,
          timestamp: new Date().toISOString(),
          url: window.location.href
        });
        
        // CRÍTICO: Resetar estado ANTES de processar nova notificação
        audioStartedRef.current = false;
        
        // CRÍTICO: Parar TODOS os áudios da página (incluindo áudios de outros hooks)
        console.log('🛑 [FECHAMENTO] Parando TODOS os áudios (incluindo agendamento) para nova notificação de fechamento');
        stopAllAudio();
        
        // Limpar timer anterior se existir
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        
        // Fechar modal anterior se estiver aberto
        setShowFechamentoModal(false);
        setFechamentoData(null);
        
        // Pré-carregar áudio ANTES de mostrar modal
        const audioSource = data.corretor_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        try {
          const preloadAudio = new Audio(audioSource);
          preloadAudio.preload = 'auto';
          preloadAudio.volume = 0.6;
          preloadAudio.load();
          preloadedAudioRef.current = preloadAudio;
          console.log('📦 [FECHAMENTO] Áudio pré-carregado:', audioSource);
        } catch (e) {
          console.log('⚠️ [FECHAMENTO] Erro ao pré-carregar áudio:', e);
        }
        
        // Pequeno delay para garantir que o estado anterior foi limpo
        setTimeout(() => {
          setFechamentoData(data);
          setShowFechamentoModal(true);
          previousModalStateRef.current = false;
          playFechamentoSound(data.corretor_musica);
          console.log('✅ [SOCKET.IO] Notificação de fechamento processada e modal deve aparecer');
        }, 100);
      } catch (error) {
        console.error('❌ [SOCKET.IO] Erro ao processar fechamento:', error);
      }
    };
    
    newSocket.on('new-fechamento-incorporadora', handleNewFechamento);

    // CRÍTICO: Entrar no grupo IMEDIATAMENTE quando socket já está conectado
    // Não esperar timeout - isso causa notificações perdidas!
    if (newSocket.connected) {
      console.log('⚡ [SOCKET.IO] Socket já conectado, entrando no grupo IMEDIATAMENTE');
      joinGroup();
    }

    // Listener para confirmação de entrada no grupo
    newSocket.on('joined-incorporadora-notifications', (data) => {
      if (data.success) {
        console.log('✅ [SOCKET.IO] Confirmado: Entrou no grupo incorporadora-notifications:', {
          socketId: data.socketId,
          deviceId: newSocket.query?.deviceId,
          tabId: newSocket.query?.tabId,
          userId: userData.id,
          empresaId: userData.empresa_id,
          timestamp: data.timestamp,
          url: window.location.href
        });
        joiningGroupRef.current = false;
      } else {
        console.error('❌ [SOCKET.IO] Falha ao entrar no grupo:', {
          motivo: data.motivo,
          socketId: newSocket.id,
          deviceId: newSocket.query?.deviceId,
          timestamp: data.timestamp
        });
        joiningGroupRef.current = false;
      }
    });

    // Log de conexão/desconexão - MELHORADO para produção
    newSocket.on('connect', () => {
      console.log('✅ [SOCKET.IO] Socket conectado:', {
        socketId: newSocket.id,
        userId: userData.id,
        empresaId: userData.empresa_id,
        timestamp: new Date().toISOString()
      });
      
      // CRÍTICO: Re-entrar no grupo IMEDIATAMENTE ao reconectar
      // Não esperar - isso causa notificações perdidas!
      if (newSocket.connected && !joiningGroupRef.current) {
        console.log('⚡ [SOCKET.IO] Entrando no grupo IMEDIATAMENTE após connect');
        joinGroup();
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('🔄 [SOCKET.IO] Reconectado após', attemptNumber, 'tentativas:', {
        socketId: newSocket.id,
        timestamp: new Date().toISOString()
      });
      
      // Re-entrar no grupo IMEDIATAMENTE após reconexão (com proteção)
      if (newSocket.connected && !joiningGroupRef.current) {
        console.log('⚡ [SOCKET.IO] Entrando no grupo IMEDIATAMENTE após reconnect');
        joinGroup();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [FECHAMENTO] Erro de conexão:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ [SOCKET.IO] Desconectado:', {
        reason,
        socketId: newSocket.id,
        timestamp: new Date().toISOString()
      });
      joiningGroupRef.current = false;
    });

    // Heartbeat: ping/pong para manter conexão ativa
    const heartbeatInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping', { timestamp: Date.now() });
        
        // Verificar se ainda está no grupo periodicamente
        const now = Date.now();
        if (now - lastJoinCheckRef.current > 60000) { // A cada 1 minuto
          lastJoinCheckRef.current = now;
          if (!joiningGroupRef.current) {
            joinGroup();
          }
        }
      }
    }, 30000); // A cada 30 segundos

    // Cleanup apenas quando componente for desmontado
    return () => {
      clearInterval(heartbeatInterval);
      
      // Parar música apenas se não houver modal ativo
      if (!showFechamentoModal && audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
      
      // Remover todos os listeners antes de desconectar
      if (newSocket) {
        newSocket.removeAllListeners();
        // Só desconectar se for o socket atual
        if (socketRef.current === newSocket) {
          newSocket.disconnect();
          socketRef.current = null;
        }
      }
    };
  }, [userData?.id, userData?.tipo, userData?.empresa_id, playFechamentoSound, stopFechamentoSound]);

  // useLayoutEffect para criar timer e tocar música APÓS renderização do modal
  useLayoutEffect(() => {
    // Só executar quando modal abrir (mudar de false para true)
    const wasClosed = !previousModalStateRef.current;
    const isNowOpen = showFechamentoModal && fechamentoData;
    
    // Se modal acabou de abrir, criar timer e tocar música
    if (wasClosed && isNowOpen) {
      // Proteção: se já existe timer recente (< 2 segundos), não criar novo (proteção contra StrictMode)
      const existingTimerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (existingTimerAge < 2000 && modalTimerRef.current) {
        console.log('⚠️ [FECHAMENTO] Timer já existe e é recente, ignorando criação duplicada');
        previousModalStateRef.current = showFechamentoModal;
        return;
      }
      
      console.log('📱 [FECHAMENTO] Modal aberto - criando timer e tocando música');
      
      // Limpar timer anterior se existir
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      
      // Criar timer de 20 segundos
      const timerCreatedAt = Date.now();
      timerCreatedAtRef.current = timerCreatedAt;
      
      const mainTimer = setTimeout(() => {
        // Verificar se o timer ainda é válido (não foi substituído)
        if (modalTimerRef.current === mainTimer && timerCreatedAtRef.current === timerCreatedAt) {
          console.log('⏰ [TIMER] 20 segundos - fechando modal');
          audioStartedRef.current = false;
          stopFechamentoSound();
          setShowFechamentoModal(false);
          setFechamentoData(null);
          previousModalStateRef.current = false;
          modalTimerRef.current = null;
          timerCreatedAtRef.current = null;
        }
      }, 20000); // 20 segundos - sempre fecha
      
      modalTimerRef.current = mainTimer;
      console.log('✅ [TIMER] Timer de 20s criado (timestamp:', timerCreatedAt, ')');
      
      // Tocar música imediatamente e também após delays pequenos
      if (showFechamentoModal && fechamentoData && !audioStartedRef.current) {
        console.log('🔊 [FECHAMENTO] Tentando tocar música após renderização...');
        playFechamentoSound(fechamentoData.corretor_musica);
        
        // Tentar novamente após pequenos delays como backup
        [100, 200, 300].forEach((delay) => {
          setTimeout(() => {
            if (showFechamentoModal && fechamentoData && !audioStartedRef.current && audioInstanceRef.current) {
              console.log(`🔄 [FECHAMENTO] Retry backup após ${delay}ms...`);
              try {
                if (audioInstanceRef.current.paused) {
                  audioInstanceRef.current.play()
                    .then(() => {
                      audioStartedRef.current = true;
                      console.log(`✅ [FECHAMENTO] Música iniciada no retry backup!`);
                    })
                    .catch(() => {
                      // Silencioso - já está tentando no retry interno
                    });
                }
              } catch (e) {
                // Silencioso
              }
            }
          }, delay);
        });
      }
    }
    
    // Atualizar ref do estado anterior APÓS processar
    previousModalStateRef.current = showFechamentoModal;
  }, [showFechamentoModal, fechamentoData, playFechamentoSound, stopFechamentoSound]);

  // useEffect para limpar timer e música quando modal fechar (transição true -> false)
  useEffect(() => {
    const wasOpen = previousModalStateRef.current;
    const isNowClosed = !showFechamentoModal;
    
    // Atualizar ref do estado anterior
    previousModalStateRef.current = showFechamentoModal;
    
    // Só limpar se estava aberto e agora está fechado (transição true -> false)
    if (wasOpen && isNowClosed) {
      console.log('🛑 [FECHAMENTO] Modal fechado - limpando timer e música');
      
      // Proteger contra limpar timer muito recente (< 1 segundo)
      const timerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (timerAge > 1000) {
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        timerCreatedAtRef.current = null;
      } else {
        console.log('⚠️ [FECHAMENTO] Timer muito recente, não limpando (idade:', timerAge, 'ms)');
      }
      
      audioStartedRef.current = false;
      if (audioInstanceRef.current) {
        stopFechamentoSound();
      }
    }
  }, [showFechamentoModal, stopFechamentoSound]);


  // Componente da Modal - SUPER CHAMATIVO
  const FechamentoModal = () => {
    if (!showFechamentoModal || !fechamentoData) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <style>{`
          @keyframes slideDown {
            0% { transform: translateY(-100px) scale(0.8); opacity: 0; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
          }
          @keyframes glow {
            0% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6), 0 0 80px rgba(16, 185, 129, 0.4), 0 0 120px rgba(16, 185, 129, 0.3); }
            50% { box-shadow: 0 0 60px rgba(16, 185, 129, 0.9), 0 0 120px rgba(16, 185, 129, 0.6), 0 0 180px rgba(16, 185, 129, 0.5); }
            100% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6), 0 0 80px rgba(16, 185, 129, 0.4), 0 0 120px rgba(16, 185, 129, 0.3); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes celebration {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-5deg) scale(1.05); }
            75% { transform: rotate(5deg) scale(1.05); }
          }
        `}</style>
        
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          maxWidth: '900px',
          width: '95%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'visible',
          animation: 'slideDown 0.6s ease-out, pulse 3s ease-in-out infinite, glow 2s ease-in-out infinite',
          border: '4px solid #10b981'
        }}>
          {/* Logo no topo - MUITO MAIOR */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.5), 0 0 0 8px rgba(255, 255, 255, 1)',
            border: '6px solid #ffffff',
            animation: 'bounce 2s ease-in-out infinite'
          }}>
            <img 
              src={logoBrasao}
              alt="Invest Money" 
              style={{
                width: '70px',
                height: '70px',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)'
              }}
            />
          </div>
          
          {/* Badge de celebração - MUITO MAIOR */}
          <div style={{
            position: 'absolute',
            top: '30px',
            right: '30px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            color: 'white',
            padding: '1rem 2.5rem',
            borderRadius: '50px',
            fontSize: '1.5rem',
            fontWeight: '900',
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            border: '3px solid #ffffff',
            animation: 'celebration 1s ease-in-out infinite'
          }}>
            🎉 FECHAMENTO! 🎉
          </div>
          
          {/* Título - MUITO MAIOR */}
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginTop: '3rem',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
          }}>
            🎊 Novo Fechamento! 🎊
          </h1>
          
          <p style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#10b981',
            marginBottom: '2rem',
            textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
          }}>
            🏆 Parabéns pela venda! 🏆
          </p>
          
          {/* Foto do corretor - MUITO MAIOR */}
          {fechamentoData.corretor_foto && (
            <div style={{
              marginBottom: '2rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{
                position: 'relative',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <div style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '6px solid #10b981',
                  boxShadow: '0 15px 50px rgba(16, 185, 129, 0.5), 0 0 0 8px rgba(16, 185, 129, 0.1)'
                }}>
                  <img 
                    src={fechamentoData.corretor_foto}
                    alt={fechamentoData.corretor_nome}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.5)',
                  border: '4px solid #ffffff',
                  animation: 'bounce 1.5s ease-in-out infinite'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>⭐</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Card com informações - MUITO MAIOR */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            border: '3px solid #10b981',
            boxShadow: '0 10px 40px rgba(16, 185, 129, 0.2), inset 0 0 20px rgba(16, 185, 129, 0.05)'
          }}>
            <div style={{
              fontSize: '2rem',
              color: '#1e293b',
              lineHeight: '2'
            }}>
              <div style={{ 
                marginBottom: '2rem',
                paddingBottom: '2rem',
                borderBottom: '3px solid #bbf7d0'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>👤 Corretor</p>
                <p style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '900',
                  color: '#1e293b',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}>{fechamentoData.corretor_nome}</p>
              </div>
              
              <div style={{ 
                marginBottom: '2rem',
                paddingBottom: '2rem',
                borderBottom: '3px solid #bbf7d0'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>👥 Cliente</p>
                <p style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '900',
                  color: '#1e293b',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}>{fechamentoData.paciente_nome}</p>
              </div>
              
              <div style={{ 
                marginBottom: '2rem',
                paddingBottom: '2rem',
                borderBottom: '3px solid #bbf7d0'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>💰 Valor Fechado</p>
                <p style={{ 
                  fontSize: '3.5rem', 
                  fontWeight: '900',
                  color: '#10b981',
                  textShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
                }}>R$ {fechamentoData.valor_fechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              
              <div>
                <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>📅 Data</p>
                <p style={{ 
                  fontSize: '2rem', 
                  fontWeight: '800',
                  color: '#1e293b'
                }}>{new Date(fechamentoData.data_fechamento).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          <p style={{
            marginTop: '2rem',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
          }}>
            <span style={{ fontSize: '2rem' }}>🎉</span>
            <span>Parabéns pela conquista!</span>
            <span style={{ fontSize: '2rem' }}>🎉</span>
          </p>
          
          {/* Footer com marca */}
          <div style={{
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '3px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            opacity: 0.8
          }}>
            <img 
              src={logoBrasao}
              alt="Invest Money" 
              style={{
                width: '50px',
                height: '50px',
                objectFit: 'contain'
              }}
            />
            <span style={{
              fontSize: '1.25rem',
              color: '#64748b',
              fontWeight: '600'
            }}>
              IM Solumn
            </span>
          </div>
        </div>
      </div>
    );
  };

  return {
    showFechamentoModal,
    fechamentoData,
    fecharModal,
    FechamentoModal
  };
};

export default useFechamentoNotifications;
