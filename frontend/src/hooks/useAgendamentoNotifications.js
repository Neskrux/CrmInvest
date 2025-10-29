import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import logoBrasao from '../images/logobrasaopreto.png';

const useAgendamentoNotifications = () => {
  const { user, isIncorporadora } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [agendamentoData, setAgendamentoData] = useState(null);
  const audioInstanceRef = useRef(null);
  const modalTimerRef = useRef(null);
  const previousModalStateRef = useRef(false); // Rastrear estado anterior do modal para detectar transições
  const audioStartedRef = useRef(false); // Rastrear se a música já começou a tocar
  const timerCreatedAtRef = useRef(null); // Timestamp de quando o timer foi criado para proteção
  const preloadedAudioRef = useRef(null); // Áudio pré-carregado para iniciar mais rápido
  const socketRef = useRef(null); // Ref para rastrear socket sem causar re-renders
  const isInitializedRef = useRef(false); // Ref para garantir que só inicializa uma vez
  const lastJoinCheckRef = useRef(0); // Ref para rastrear último check de join sem usar localStorage
  const joiningGroupRef = useRef(false); // Ref para evitar múltiplas chamadas simultâneas de joinGroup

  // Função para parar música - usar useCallback para garantir que sempre tenha acesso ao ref atual
  const stopAgendamentoSound = useCallback(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current.currentTime = 0;
      audioInstanceRef.current = null;
    }
  }, []);

  // Função para tocar música - usar useCallback para garantir que sempre tenha acesso ao ref atual
  const playAgendamentoSound = useCallback((musicaUrl) => {
    // CRÍTICO: Resetar audioStartedRef se não há áudio tocando
    // Isso garante que novas notificações possam tocar música
    if (!audioInstanceRef.current || audioInstanceRef.current.paused) {
      audioStartedRef.current = false;
    }
    
    // Se já começou a tocar E está realmente tocando, não tentar novamente (evitar duplicatas)
    if (audioStartedRef.current && audioInstanceRef.current && !audioInstanceRef.current.paused) {
      console.log('🔊 [AGENDAMENTO] Música já está tocando, ignorando nova tentativa');
      return;
    }
    
    // Proteção: aguardar um pouco se uma tentativa anterior ainda está em andamento
    if (audioInstanceRef.current && audioInstanceRef.current.readyState < 2) {
      console.log('⏳ [AGENDAMENTO] Áudio ainda carregando, aguardando...');
      setTimeout(() => playAgendamentoSound(musicaUrl), 100);
      return;
    }

    try {
      // Limpar áudio anterior se existir
      if (audioInstanceRef.current) {
        try {
          audioInstanceRef.current.pause();
          audioInstanceRef.current.currentTime = 0;
        } catch (e) {
          // Ignorar erros ao limpar áudio anterior
        }
        audioInstanceRef.current = null;
      }
      
      // Tentar reutilizar áudio pré-carregado se disponível
      const expectedSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
      if (preloadedAudioRef.current) {
        // Verificar se é o mesmo arquivo (URL completa ou apenas nome do arquivo)
        const preloadSrc = preloadedAudioRef.current.src || '';
        const isSameFile = preloadSrc.includes(musicaUrl || 'audioNovoLead.mp3') || 
                          (musicaUrl && preloadSrc.includes(musicaUrl.split('/').pop()));
        if (isSameFile) {
          console.log('♻️ [AGENDAMENTO] Reutilizando áudio pré-carregado');
          // Clonar o áudio pré-carregado ao invés de reutilizar diretamente
          // Isso evita problemas com listeners antigos ou estado inconsistente
          const preloadedSrc = preloadedAudioRef.current.src;
          const newAudio = new Audio(preloadedSrc);
          newAudio.volume = 1.0;
          newAudio.loop = false;
          newAudio.preload = 'auto';
          // Não fazer load() - deixar carregar naturalmente
          audioInstanceRef.current = newAudio;
          preloadedAudioRef.current = null; // Limpar ref após usar
        } else {
          // Descarta pré-carregado se for arquivo diferente
          preloadedAudioRef.current = null;
        }
      }
      
      // Se não reutilizou, criar novo
      if (!audioInstanceRef.current) {
        // Usar música personalizada do SDR se disponível, senão usar áudio padrão
        const audioSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        const audio = new Audio(audioSource);
        audio.volume = 1.0; // Volume máximo
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
        stopAgendamentoSound();
        setShowAgendamentoModal(false);
        setAgendamentoData(null);
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
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
              // Verificar se realmente está tocando após a promise resolver
              if (audioInstanceRef.current && audioInstanceRef.current.paused) {
                console.warn('⚠️ [AGENDAMENTO] Promise resolveu mas áudio está pausado, tentando novamente...');
                // Tentar novamente imediatamente
                setTimeout(() => {
                  if (audioInstanceRef.current && audioInstanceRef.current.paused) {
                    audioInstanceRef.current.play().catch(err => {
                      console.log('❌ [AGENDAMENTO] Falha ao tentar despausar:', err);
                    });
                  }
                }, 50);
              } else {
                console.log(`✅ [AGENDAMENTO] Música tocando! (tentativa ${attemptNumber + 1})`);
              }
            })
            .catch(error => {
              // Erro de autoplay policy - tentar novamente com pequenos delays
              console.log(`⚠️ [AGENDAMENTO] Erro ao tocar (tentativa ${attemptNumber + 1}):`, error.message || error);
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
                          console.log(`✅ [AGENDAMENTO] Música tocando após retry ${retryCount + 1}!`);
                        })
                        .catch((err) => {
                          retryCount++;
                          if (retryCount < retryDelays.length) {
                            tryPlayAgain();
                          } else {
                            console.log('⚠️ [AGENDAMENTO] Música não tocará - todas as tentativas falharam');
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
          console.log('🔄 [AGENDAMENTO] Áudio iniciando carregamento - tentando tocar...');
          tryPlay(100);
        }
      }, { once: true });
      
      // Tentar também quando houver dados suficientes para tocar
      audioInstanceRef.current.addEventListener('loadeddata', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('📥 [AGENDAMENTO] Áudio carregado - tentando tocar...');
          tryPlay(101);
        }
      }, { once: true });

      // Tentar também quando o áudio estiver pronto para tocar
      audioInstanceRef.current.addEventListener('canplay', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('▶️ [AGENDAMENTO] Áudio pronto - tentando tocar...');
          tryPlay(102);
        }
      }, { once: true });

      // Tentar quando o áudio pode tocar sem interrupção
      audioInstanceRef.current.addEventListener('canplaythrough', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('🎯 [AGENDAMENTO] Áudio totalmente carregado - tentando tocar...');
          tryPlay(103);
        }
      }, { once: true });
    } catch (error) {
      console.error('❌ [AGENDAMENTO] Erro ao criar áudio:', error);
    }
  }, [stopAgendamentoSound]);

  // REMOVIDO: useEffect para notificações pendentes do localStorage
  // Não é mais necessário pois removemos o reload automático
  // As notificações agora são processadas diretamente quando o evento Socket.IO chega

  useEffect(() => {
    // Permitir entrada APENAS para admin da incorporadora
    if (user?.tipo !== 'admin' || user?.empresa_id !== 5) {
      console.log('⚠️ [SOCKET.IO] Usuário não autorizado:', {
        tipo: user?.tipo,
        empresa_id: user?.empresa_id
      });
      return;
    }

    // CRÍTICO: Verificar se já existe uma conexão ativa antes de criar nova
    // Isso evita múltiplas conexões após reload ou re-render
    if (socketRef.current && socketRef.current.connected) {
      console.log('♻️ [SOCKET.IO] Socket já existe e está conectado, reutilizando:', {
        socketId: socketRef.current.id,
        connected: socketRef.current.connected,
        timestamp: new Date().toISOString()
      });
      
      // Garantir que está no grupo periodicamente (com proteção)
      const ensureInGroup = () => {
        if (joiningGroupRef.current) {
          return; // Já está tentando entrar
        }
        
        if (socketRef.current && socketRef.current.connected) {
          joiningGroupRef.current = true;
          
          socketRef.current.emit('join-incorporadora-notifications', {
            userType: 'admin',
            userId: user.id,
            empresaId: user.empresa_id
          });
          
          // Resetar flag após um tempo
          setTimeout(() => {
            joiningGroupRef.current = false;
          }, 2000);
        }
      };
      
      // Entrar no grupo imediatamente se já conectado
      ensureInGroup();
      
      // Verificar se está no grupo periodicamente
      const checkInterval = setInterval(() => {
        if (socketRef.current && socketRef.current.connected) {
          ensureInGroup();
        } else {
          clearInterval(checkInterval);
        }
      }, 60000); // A cada 1 minuto
      
      return () => {
        clearInterval(checkInterval);
      };
    }

    // Configurar URL do backend - CORRIGIDO para produção
    let API_BASE_URL;
    if (process.env.REACT_APP_API_URL) {
      API_BASE_URL = process.env.REACT_APP_API_URL.replace('/api', '');
    } else if (process.env.NODE_ENV === 'production') {
      // Em produção, usar backend do Fly.dev
      API_BASE_URL = 'https://crminvest-backend.fly.dev';
    } else {
      API_BASE_URL = 'http://localhost:5000';
    }
    
    // Se existe socket anterior mas desconectado, limpar primeiro
    if (socketRef.current && !socketRef.current.connected) {
      console.log('🧹 [SOCKET.IO] Limpando socket desconectado antes de criar novo...');
      try {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      } catch (e) {
        console.log('⚠️ [SOCKET.IO] Erro ao limpar socket anterior:', e);
      }
      socketRef.current = null;
    }
    
    console.log('🔗 [SOCKET.IO] Criando NOVA conexão Socket.IO:', {
      API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL,
      deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    });
    
    // CRÍTICO: forceNew: true para garantir que cada dispositivo tenha sua própria conexão
    // Mas apenas se não houver conexão existente
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'], // Tentar websocket primeiro, fallback para polling
      forceNew: !socketRef.current, // Só forçar nova se não houver socket existente
      reconnection: true,
      reconnectionAttempts: Infinity, // Tentar reconectar infinitamente
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // Adicionar identificador único para cada dispositivo/aba
      query: {
        tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        empresaId: user.empresa_id
      },
      // Configurações adicionais para produção
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true
    });
    
    // Guardar referência do socket
    socketRef.current = newSocket;
    setSocket(newSocket);

    // Função auxiliar para entrar no grupo (chamada múltiplas vezes se necessário)
    const joinGroup = () => {
      // Proteção contra múltiplas chamadas simultâneas
      if (joiningGroupRef.current) {
        console.log('⚠️ [SOCKET.IO] Join já em andamento, ignorando chamada duplicada');
        return;
      }
      
      if (!newSocket.connected) {
        console.warn('⚠️ [SOCKET.IO] Socket não conectado, aguardando conexão...');
        return;
      }
      
      joiningGroupRef.current = true;
      
      console.log('📢 [SOCKET.IO] Entrando no grupo incorporadora-notifications:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        connected: newSocket.connected,
        deviceId: newSocket.query?.deviceId,
        timestamp: new Date().toISOString()
      });
      
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: user.id,
        empresaId: user.empresa_id
      });
      
      // Resetar flag após um tempo para permitir nova tentativa se necessário
      setTimeout(() => {
        joiningGroupRef.current = false;
      }, 2000);
    };

    // CRÍTICO: Adicionar listener ANTES de entrar no grupo
    // Isso garante que eventos sejam capturados mesmo se a conexão já estiver estabelecida
    const handleNewAgendamento = (data) => {
      try {
        console.log('🔔🔔🔔 [AGENDAMENTO NOTIFICATIONS] Recebido evento new-agendamento-incorporadora:', {
          agendamentoId: data.agendamentoId,
          paciente_nome: data.paciente_nome,
          sdr_nome: data.sdr_nome,
          data_agendamento: data.data_agendamento,
          horario: data.horario,
          socketId: newSocket.id,
          deviceId: newSocket.query?.deviceId,
          tabId: newSocket.query?.tabId,
          userId: user.id,
          empresaId: user.empresa_id,
          connected: newSocket.connected,
          timestamp: new Date().toISOString(),
          url: window.location.href
        });
        
        // CRÍTICO: Resetar estado ANTES de processar nova notificação
        // Isso garante que cada notificação seja processada independentemente
        audioStartedRef.current = false;
        
        // Parar música anterior se estiver tocando
        if (audioInstanceRef.current && !audioInstanceRef.current.paused) {
          console.log('🛑 [AGENDAMENTO] Parando música anterior para nova notificação');
          audioInstanceRef.current.pause();
          audioInstanceRef.current.currentTime = 0;
        }
        
        // Limpar timer anterior se existir
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        
        // Fechar modal anterior se estiver aberto
        // Sempre fechar para garantir que nova notificação apareça
        setShowAgendamentoModal(false);
        setAgendamentoData(null);
        
        // Pré-carregar áudio ANTES de mostrar modal
        const audioSource = data.sdr_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        try {
          const preloadAudio = new Audio(audioSource);
          preloadAudio.preload = 'auto';
          preloadAudio.volume = 1.0;
          preloadAudio.load();
          preloadedAudioRef.current = preloadAudio;
          console.log('📦 [AGENDAMENTO] Áudio pré-carregado:', audioSource);
        } catch (e) {
          console.log('⚠️ [AGENDAMENTO] Erro ao pré-carregar áudio:', e);
        }
        
        // Pequeno delay para garantir que o estado anterior foi limpo
        setTimeout(() => {
          // Mostrar modal diretamente
          setAgendamentoData(data);
          setShowAgendamentoModal(true);
          previousModalStateRef.current = false; // Será atualizado para true no useLayoutEffect
          
          // CRÍTICO: Tocar música IMEDIATAMENTE quando evento chegar
          // Não esperar pela renderização do modal
          console.log('🔊 [AGENDAMENTO] Tocando música imediatamente ao receber evento...');
          playAgendamentoSound(data.sdr_musica);
          
          // Adicionar à lista de notificações
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'new-agendamento',
            data,
            timestamp: new Date()
          }]);
          
          console.log('✅ [SOCKET.IO] Notificação de agendamento processada e modal deve aparecer');
        }, 100); // Pequeno delay para garantir limpeza do estado
      } catch (error) {
        console.error('❌ [SOCKET.IO] Erro ao processar agendamento:', error);
      }
    };
    
    // Adicionar listener ANTES de entrar no grupo
    newSocket.on('new-agendamento-incorporadora', handleNewAgendamento);

    // Listener para confirmação de entrada no grupo
    newSocket.on('joined-incorporadora-notifications', (data) => {
      joiningGroupRef.current = false; // Resetar flag quando receber confirmação
      
      if (data.success) {
        if (data.alreadyInRoom) {
          console.log('♻️ [SOCKET.IO] Socket já estava no grupo (confirmação):', {
            socketId: data.socketId,
            deviceId: newSocket.query?.deviceId,
            tabId: newSocket.query?.tabId,
            userId: user.id,
            empresaId: user.empresa_id,
            timestamp: data.timestamp
          });
        } else {
          console.log('✅ [SOCKET.IO] Confirmado: Entrou no grupo incorporadora-notifications:', {
            socketId: data.socketId,
            deviceId: newSocket.query?.deviceId,
            tabId: newSocket.query?.tabId,
            userId: user.id,
            empresaId: user.empresa_id,
            timestamp: data.timestamp,
            url: window.location.href
          });
        }
      } else {
        console.error('❌ [SOCKET.IO] Falha ao entrar no grupo:', {
          motivo: data.motivo,
          socketId: newSocket.id,
          deviceId: newSocket.query?.deviceId,
          timestamp: data.timestamp
        });
        // Tentar novamente após delay apenas se não estava no grupo
        if (!data.alreadyInRoom) {
          setTimeout(() => {
            if (newSocket.connected && !joiningGroupRef.current) {
              console.log('🔄 [SOCKET.IO] Tentando entrar no grupo novamente após falha...');
              joinGroup();
            }
          }, 2000);
        }
      }
    });

    // CRÍTICO: Entrar no grupo IMEDIATAMENTE quando socket já está conectado
    // Não esperar timeout - isso causa notificações perdidas!
    if (newSocket.connected) {
      console.log('⚡ [SOCKET.IO] Socket já conectado, entrando no grupo IMEDIATAMENTE');
      joinGroup();
    }

    // Log de conexão/desconexão - MELHORADO para produção
    newSocket.on('connect', () => {
      console.log('✅ [SOCKET.IO] Socket conectado:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
      
      // CRÍTICO: Re-entrar no grupo IMEDIATAMENTE ao reconectar
      // Não esperar - isso causa notificações perdidas!
      if (newSocket.connected && !joiningGroupRef.current) {
        console.log('⚡ [SOCKET.IO] Entrando no grupo IMEDIATAMENTE após connect');
        joinGroup();
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('⚠️ [SOCKET.IO] Socket desconectado:', {
        reason,
        socketId: newSocket.id,
        timestamp: new Date().toISOString()
      });
      
      // Tentar reconectar se não foi desconexão intencional
      if (reason === 'io server disconnect') {
        // Servidor desconectou, reconectar manualmente
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [SOCKET.IO] Erro de conexão:', {
        error: error.message,
        type: error.type,
        timestamp: new Date().toISOString()
      });
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

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 [SOCKET.IO] Tentativa de reconexão #' + attemptNumber);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('❌ [SOCKET.IO] Erro ao reconectar:', error.message);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ [SOCKET.IO] Falha ao reconectar após todas as tentativas');
      // Tentar reconectar manualmente após delay
      setTimeout(() => {
        console.log('🔄 [SOCKET.IO] Tentando reconectar manualmente...');
        newSocket.connect();
      }, 5000);
    });

    // Listener para pong (resposta do heartbeat)
    newSocket.on('pong', (data) => {
      const latency = Date.now() - data.receivedTimestamp;
      console.log('💓 [SOCKET.IO] Heartbeat OK - Latência:', latency + 'ms');
    });

    // Heartbeat: Verificar conexão periodicamente (a cada 30 segundos)
    const heartbeatInterval = setInterval(() => {
      if (newSocket && !newSocket.connected) {
        console.warn('⚠️ [SOCKET.IO] Conexão perdida detectada, tentando reconectar...');
        newSocket.connect();
      } else if (newSocket && newSocket.connected) {
        // Verificar se ainda está no grupo (ping)
        newSocket.emit('ping', { timestamp: Date.now() });
        
        // Verificar se ainda está no grupo - re-entrar se necessário
        // Isso garante que mesmo se houver algum problema, re-entra automaticamente
        const now = Date.now();
        if (!lastJoinCheckRef.current || (now - lastJoinCheckRef.current) > 60000) { // A cada 1 minuto
          joinGroup();
          lastJoinCheckRef.current = now;
        }
      }
    }, 30000); // 30 segundos

    // Cleanup - melhorado para produção
    return () => {
      console.log('🧹 [SOCKET.IO] Limpando conexão Socket.IO:', {
        socketId: newSocket.id,
        connected: newSocket.connected,
        timestamp: new Date().toISOString()
      });
      
      // Limpar heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Remover todos os listeners antes de desconectar
      newSocket.removeAllListeners();
      
      // Parar música apenas se não houver modal ativo
      if (audioInstanceRef.current && !showAgendamentoModal) {
        try {
          audioInstanceRef.current.pause();
          audioInstanceRef.current.currentTime = 0;
          audioInstanceRef.current = null;
        } catch (e) {
          // Ignorar erros ao limpar áudio
        }
      }
      
      // Desconectar socket apenas se não for a mesma referência que está sendo usada
      if (socketRef.current === newSocket && newSocket.connected) {
        // Não desconectar se ainda está sendo usado
        console.log('⚠️ [SOCKET.IO] Socket ainda em uso, não desconectando no cleanup');
      } else if (newSocket.connected) {
        newSocket.disconnect();
      }
      
      // Limpar referência apenas se for o socket que está sendo limpo
      if (socketRef.current === newSocket) {
        socketRef.current = null;
      }
    };
  }, [user?.id, user?.empresa_id, user?.tipo]); // REMOVIDO: playAgendamentoSound e stopAgendamentoSound das dependências

  // useLayoutEffect para criar timer e tocar música APÓS renderização do modal
  useLayoutEffect(() => {
    // Só executar quando modal abrir (mudar de false para true)
    const wasClosed = !previousModalStateRef.current;
    const isNowOpen = showAgendamentoModal && agendamentoData;
    
    // Se modal acabou de abrir, criar timer e tocar música
    if (wasClosed && isNowOpen) {
      // Proteção: se já existe timer recente (< 2 segundos), não criar novo (proteção contra StrictMode)
      const existingTimerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (existingTimerAge < 2000 && modalTimerRef.current) {
        console.log('⚠️ [AGENDAMENTO] Timer já existe e é recente, ignorando criação duplicada');
        previousModalStateRef.current = showAgendamentoModal;
        return;
      }
      
      console.log('📱 [AGENDAMENTO] Modal aberto - criando timer e tocando música');
      
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
          stopAgendamentoSound();
        setShowAgendamentoModal(false);
        setAgendamentoData(null);
          previousModalStateRef.current = false;
          modalTimerRef.current = null;
          timerCreatedAtRef.current = null;
        }
      }, 20000); // 20 segundos - sempre fecha
      
      modalTimerRef.current = mainTimer;
      console.log('✅ [TIMER] Timer de 20s criado (timestamp:', timerCreatedAt, ')');
      
      // Verificar se música já está tocando (pode ter sido iniciada quando evento chegou)
      // Se não estiver tocando, tentar tocar agora como backup
      if (showAgendamentoModal && agendamentoData) {
        if (!audioStartedRef.current || (audioInstanceRef.current && audioInstanceRef.current.paused)) {
          console.log('🔊 [AGENDAMENTO] Música não está tocando, tentando tocar após renderização...');
          playAgendamentoSound(agendamentoData.sdr_musica);
          
          // Tentar novamente após pequenos delays como backup
          [100, 200, 300].forEach((delay) => {
            setTimeout(() => {
              if (showAgendamentoModal && agendamentoData && audioInstanceRef.current && audioInstanceRef.current.paused) {
                console.log(`🔄 [AGENDAMENTO] Retry backup após ${delay}ms...`);
                try {
                  audioInstanceRef.current.play()
                    .then(() => {
                      audioStartedRef.current = true;
                      console.log(`✅ [AGENDAMENTO] Música iniciada no retry backup!`);
                    })
                    .catch(() => {
                      // Silencioso - já está tentando no retry interno
                    });
                } catch (e) {
                  // Silencioso
                }
              }
            }, delay);
          });
        } else {
          console.log('✅ [AGENDAMENTO] Música já está tocando, não tentar novamente');
        }
      }
    }
    
    // Atualizar ref do estado anterior APÓS processar
    previousModalStateRef.current = showAgendamentoModal;
  }, [showAgendamentoModal, agendamentoData, playAgendamentoSound, stopAgendamentoSound]);

  // useEffect para limpar timer e música quando modal fechar (transição true -> false)
  useEffect(() => {
    const wasOpen = previousModalStateRef.current;
    const isNowClosed = !showAgendamentoModal;
    
    // Atualizar ref do estado anterior
    previousModalStateRef.current = showAgendamentoModal;
    
    // Só limpar se estava aberto e agora está fechado (transição true -> false)
    if (wasOpen && isNowClosed) {
      console.log('🛑 [AGENDAMENTO] Modal fechado - limpando timer e música');
      
      // CRÍTICO: Resetar TODOS os estados para garantir que próxima notificação funcione
      audioStartedRef.current = false;
      
      // Proteger contra limpar timer muito recente (< 1 segundo)
      const timerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (timerAge > 1000) {
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        timerCreatedAtRef.current = null;
      } else {
        console.log('⚠️ [AGENDAMENTO] Timer muito recente, não limpando (idade:', timerAge, 'ms)');
      }
      
      // Parar música
      if (audioInstanceRef.current) {
        stopAgendamentoSound();
      }
      
      // Limpar dados do agendamento
      setAgendamentoData(null);
      
      // Limpar áudio pré-carregado
      preloadedAudioRef.current = null;
      
      console.log('✅ [AGENDAMENTO] Estado completamente resetado para próxima notificação');
    }
  }, [showAgendamentoModal, stopAgendamentoSound]);

  // Função para limpar notificações
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Função para fechar modal
  const fecharModalAgendamento = () => {
    setShowAgendamentoModal(false);
    setAgendamentoData(null);
  };

  // Componente da Modal
  const AgendamentoModal = () => {
    if (!showAgendamentoModal || !agendamentoData) return null;

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
            0% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6), 0 0 80px rgba(16, 185, 129, 0.4), 0 0 120px rgba(239, 68, 68, 0.3); }
            50% { box-shadow: 0 0 60px rgba(59, 130, 246, 0.9), 0 0 120px rgba(16, 185, 129, 0.6), 0 0 180px rgba(239, 68, 68, 0.5); }
            100% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6), 0 0 80px rgba(16, 185, 129, 0.4), 0 0 120px rgba(239, 68, 68, 0.3); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          maxWidth: '900px',
          width: '95%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          position: 'relative',
          animation: 'slideDown 0.6s ease-out, pulse 3s ease-in-out infinite, glow 2s ease-in-out infinite',
          border: '4px solid #3b82f6'
        }}>
          {/* Logo no topo - MUITO MAIOR */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 40px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(255, 255, 255, 1)',
            border: '6px solid #ffffff',
            animation: 'bounce 2s ease-in-out infinite'
          }}>
            <img 
              src={logoBrasao}
              alt="IM Solumn" 
              style={{
                width: '70px',
                height: '70px',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)'
              }}
            />
          </div>
          
          {/* Foto do SDR - MUITO MAIOR */}
          {agendamentoData.sdr_foto && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '2rem',
              marginTop: '2rem'
            }}>
              <div style={{
                position: 'relative',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                <img 
                  src={agendamentoData.sdr_foto} 
                  alt={agendamentoData.sdr_nome}
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '6px solid #3b82f6',
                    boxShadow: '0 15px 50px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.1)'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5)',
                  border: '4px solid #ffffff',
                  animation: 'bounce 1.5s ease-in-out infinite'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>✨</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Título - MUITO MAIOR */}
          <h2 style={{
            fontSize: '3.5rem',
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
          }}>
            📅 Novo Agendamento!
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#64748b',
            marginBottom: '2rem',
            fontSize: '1.75rem',
            fontWeight: '700'
          }}>
            Agendado por <strong style={{ color: '#3b82f6', fontSize: '2rem' }}>{agendamentoData.sdr_nome}</strong>
          </p>
          
          {/* Dados do agendamento - MUITO MAIOR */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            padding: '2.5rem',
            borderRadius: '20px',
            marginBottom: '2rem',
            border: '3px solid #3b82f6',
            boxShadow: '0 10px 40px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(59, 130, 246, 0.05)'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: '600' }}>
                👤 Cliente
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' }}>
                {agendamentoData.paciente_nome}
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: '600' }}>
                📅 Data e Horário
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981', textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}>
                {new Date(agendamentoData.data_agendamento).toLocaleDateString('pt-BR')} às {agendamentoData.horario}
              </div>
            </div>
          </div>

          {/* Música tocando - MAIOR */}
          <p style={{
            textAlign: 'center',
            color: '#10b981',
            marginTop: '1rem',
            fontSize: '1.5rem',
            fontWeight: '700',
            textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
          }}>
            🎵 Reproduzindo música do {agendamentoData.sdr_nome}... 🎵
          </p>
        </div>
      </div>
    );
  };

  return {
    socket,
    notifications,
    clearNotifications,
    showAgendamentoModal,
    agendamentoData,
    fecharModalAgendamento,
    AgendamentoModal
  };
};

export default useAgendamentoNotifications;

