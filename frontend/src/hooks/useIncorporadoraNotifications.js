import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import logoBrasao from '../images/logobrasaopreto.png';

const useIncorporadoraNotifications = () => {
  const { user, isIncorporadora } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState(null);
  const audioInstanceRef = useRef(null);
  const modalTimerRef = useRef(null);
  const previousModalStateRef = useRef(false); // Rastrear estado anterior do modal para detectar transições
  const audioStartedRef = useRef(false); // Rastrear se a música já começou a tocar
  const timerCreatedAtRef = useRef(null); // Timestamp de quando o timer foi criado para proteção
  const preloadedAudioRef = useRef(null); // Áudio pré-carregado para iniciar mais rápido
  const socketRef = useRef(null); // Ref para rastrear socket sem causar re-renders
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
      console.log('🔇 [INCORPORADORA] Todos os áudios parados (incluindo outros hooks)');
    } catch (error) {
      console.error('❌ [INCORPORADORA] Erro ao parar todos os áudios:', error);
    }
  }, []);

  // Função para parar música - usar useCallback para garantir que sempre tenha acesso ao ref atual
  const stopNotificationSound = useCallback(() => {
    stopAllAudio();
  }, [stopAllAudio]);

  // Função para tocar som de notificação - usar useCallback para garantir que sempre tenha acesso ao ref atual
  const playNotificationSound = useCallback((musicaUrl) => {
    // Se já começou a tocar, não tentar novamente (evitar duplicatas)
    if (audioStartedRef.current && audioInstanceRef.current && !audioInstanceRef.current.paused) {
      console.log('🔊 [AUDIO] Música já está tocando, ignorando nova tentativa');
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
          console.log('♻️ [AUDIO] Reutilizando áudio pré-carregado');
          audioInstanceRef.current = preloadedAudioRef.current;
          preloadedAudioRef.current = null; // Limpar ref após usar
        } else {
          // Descarta pré-carregado se for arquivo diferente
          preloadedAudioRef.current = null;
        }
      }
      
      // Se não reutilizou, criar novo
      if (!audioInstanceRef.current) {
        // Usar música personalizada do corretor se disponível, senão usar áudio padrão
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
        stopNotificationSound();
        setShowNewLeadModal(false);
        setNewLeadData(null);
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
              console.log(`✅ [AUDIO] Música tocando! (tentativa ${attemptNumber + 1})`);
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
                          console.log(`✅ [AUDIO] Música tocando após retry ${retryCount + 1}!`);
                        })
                        .catch((err) => {
                          retryCount++;
                          if (retryCount < retryDelays.length) {
                            tryPlayAgain();
                          } else {
                            console.log('⚠️ [AUDIO] Música não tocará - todas as tentativas falharam');
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
          console.log('🔄 [AUDIO] Áudio iniciando carregamento - tentando tocar...');
          tryPlay(100);
        }
      }, { once: true });
      
      // Tentar também quando houver dados suficientes para tocar
      audioInstanceRef.current.addEventListener('loadeddata', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('📥 [AUDIO] Áudio carregado - tentando tocar...');
          tryPlay(101);
        }
      }, { once: true });

      // Tentar também quando o áudio estiver pronto para tocar
      audioInstanceRef.current.addEventListener('canplay', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('▶️ [AUDIO] Áudio pronto - tentando tocar...');
          tryPlay(102);
        }
      }, { once: true });

      // Tentar quando o áudio pode tocar sem interrupção
      audioInstanceRef.current.addEventListener('canplaythrough', () => {
        if (audioInstanceRef.current && audioInstanceRef.current.paused && !audioStartedRef.current) {
          console.log('🎯 [AUDIO] Áudio totalmente carregado - tentando tocar...');
          tryPlay(103);
        }
      }, { once: true });
    } catch (error) {
      console.error('❌ [AUDIO] Erro ao criar áudio:', error);
    }
  }, []);


  // Verificar e processar notificação pendente do localStorage (após refresh)
  useEffect(() => {
    if (!user || !user.id || user.tipo !== 'admin' || user.empresa_id !== 5) {
      return;
    }

    const pendingNotification = localStorage.getItem('pending_notification');

    if (pendingNotification) {
      try {
        const notification = JSON.parse(pendingNotification);
        
        // Verificar se é uma notificação deste hook (new-lead)
        if (notification.type === 'new-lead' && notification.data) {
          console.log('✅ [NOTIFICAÇÃO] Processando novo lead pendente');
          
          // Limpar do localStorage imediatamente para evitar processar novamente
          localStorage.removeItem('pending_notification');
          
          // PRÉ-CARREGAR áudio ANTES de mostrar modal (para ter mais tempo de carregar)
          const audioSource = notification.data.corretor_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
          try {
            const preloadAudio = new Audio(audioSource);
            preloadAudio.preload = 'auto';
            preloadAudio.volume = 1.0;
            preloadAudio.load(); // Forçar início do carregamento
            preloadedAudioRef.current = preloadAudio;
            console.log('📦 [NOTIFICAÇÃO] Áudio pré-carregado:', audioSource);
          } catch (e) {
            console.log('⚠️ [NOTIFICAÇÃO] Erro ao pré-carregar áudio:', e);
          }
          
          // Processar a notificação: mostrar modal
          setNewLeadData(notification.data);
          setShowNewLeadModal(true);
          previousModalStateRef.current = true;
          audioStartedRef.current = false;
          
          // Tocar música será feito no useLayoutEffect após renderização
          // Timer será criado no useLayoutEffect separado
          
          // Adicionar à lista de notificações
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'new-lead',
            data: notification.data,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('❌ [NOTIFICAÇÃO] Erro ao processar notificação:', error);
        localStorage.removeItem('pending_notification');
      }
    }
  }, [user?.id, user?.tipo, user?.empresa_id, playNotificationSound, stopNotificationSound]);

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
    
    console.log('🔗 [SOCKET.IO] Conectando ao backend:', {
      API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL
    });
    
    // Conectar ao Socket.IO com configurações ROBUSTAS para produção
    // CRÍTICO: forceNew apenas se não houver socket existente
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

    // Listener para novos leads/clientes - REMOVIDO RELOAD AUTOMÁTICO
    newSocket.on('new-lead-incorporadora', (data) => {
      try {
        console.log('🔔🔔🔔 [INCORPORADORA NOTIFICATIONS] Recebido evento new-lead-incorporadora:', {
          leadId: data.leadId,
          nome: data.nome,
          cidade: data.cidade,
          estado: data.estado,
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
        audioStartedRef.current = false;
        
        // CRÍTICO: Parar TODOS os áudios da página (incluindo áudios de outros hooks)
        console.log('🛑 [INCORPORADORA] Parando TODOS os áudios (incluindo agendamento e fechamento) para nova notificação de lead');
        stopAllAudio();
        
        // REMOVIDO: Reload automático causa problemas em produção
        // Mostrar modal diretamente sem reload
        
        // Pré-carregar áudio ANTES de mostrar modal
        const audioSource = data.corretor_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
        try {
          const preloadAudio = new Audio(audioSource);
          preloadAudio.preload = 'auto';
          preloadAudio.volume = 1.0;
          preloadAudio.load();
          preloadedAudioRef.current = preloadAudio;
          console.log('📦 [NOTIFICAÇÃO] Áudio pré-carregado:', audioSource);
        } catch (e) {
          console.log('⚠️ [NOTIFICAÇÃO] Erro ao pré-carregar áudio:', e);
        }
        
        // Mostrar modal diretamente
        setNewLeadData(data);
        setShowNewLeadModal(true);
        previousModalStateRef.current = false; // Será atualizado para true no useLayoutEffect
        
        // CRÍTICO: Tocar música IMEDIATAMENTE quando evento chegar
        // Não esperar pela renderização do modal
        console.log('🔊 [NOTIFICAÇÃO] Tocando música imediatamente ao receber evento...');
        playNotificationSound(data.corretor_musica);
        
        // Marcar que áudio foi iniciado para evitar duplicação no useLayoutEffect
        audioStartedRef.current = true;
        
        // Adicionar à lista de notificações
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'new-lead',
          data,
          timestamp: new Date()
        }]);
        
        console.log('✅ [SOCKET.IO] Notificação processada e modal deve aparecer');
      } catch (error) {
        console.error('❌ [SOCKET.IO] Erro ao processar novo lead:', error);
      }
    });

    // Listener para lead capturado (fechar modal em todos os clientes)
    newSocket.on('lead-capturado-incorporadora', (data) => {
      // Se a modal estiver aberta com esse lead, fechar
      if (showNewLeadModal && newLeadData && newLeadData.leadId === data.leadId) {
        stopNotificationSound();
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        setShowNewLeadModal(false);
        setNewLeadData(null);
      }
    });

    // Listener para novos agendamentos
    newSocket.on('new-agendamento-incorporadora', (data) => {
      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new-agendamento',
        data,
        timestamp: new Date()
      }]);
    });

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
      if (audioInstanceRef.current && !showNewLeadModal) {
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
  }, [user?.id, user?.empresa_id, user?.tipo]); // REMOVIDO: playNotificationSound e stopNotificationSound das dependências

  // useLayoutEffect para criar timer e tocar música APÓS renderização do modal
  useLayoutEffect(() => {
    // Só executar quando modal abrir (mudar de false para true)
    const wasClosed = !previousModalStateRef.current;
    const isNowOpen = showNewLeadModal && newLeadData;
    
    // Se modal acabou de abrir, criar timer e tocar música
    if (wasClosed && isNowOpen) {
      // Proteção: se já existe timer recente (< 2 segundos), não criar novo (proteção contra StrictMode)
      const existingTimerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (existingTimerAge < 2000 && modalTimerRef.current) {
        console.log('⚠️ [NOTIFICAÇÃO] Timer já existe e é recente, ignorando criação duplicada');
        previousModalStateRef.current = showNewLeadModal;
        return;
      }
      
      console.log('📱 [NOTIFICAÇÃO] Modal aberto - criando timer e tocando música');
      
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
          stopNotificationSound();
          setShowNewLeadModal(false);
          setNewLeadData(null);
          previousModalStateRef.current = false;
          modalTimerRef.current = null;
          timerCreatedAtRef.current = null;
        }
      }, 20000); // 20 segundos - sempre fecha
      
      modalTimerRef.current = mainTimer;
      console.log('✅ [TIMER] Timer de 20s criado (timestamp:', timerCreatedAt, ')');
      
      // Verificar se música já está tocando (pode ter sido iniciada quando evento chegou)
      // Se não estiver tocando, tentar tocar agora como backup
      if (showNewLeadModal && newLeadData) {
        if (!audioStartedRef.current || (audioInstanceRef.current && audioInstanceRef.current.paused)) {
          console.log('🔊 [NOTIFICAÇÃO] Música não está tocando, tentando tocar após renderização...');
          playNotificationSound(newLeadData.corretor_musica);
          
          // Tentar novamente após pequenos delays como backup
          [100, 200, 300].forEach((delay) => {
            setTimeout(() => {
              if (showNewLeadModal && newLeadData && audioInstanceRef.current && audioInstanceRef.current.paused) {
                console.log(`🔄 [NOTIFICAÇÃO] Retry backup após ${delay}ms...`);
                try {
                  audioInstanceRef.current.play()
                    .then(() => {
                      audioStartedRef.current = true;
                      console.log(`✅ [NOTIFICAÇÃO] Música iniciada no retry backup!`);
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
          console.log('✅ [NOTIFICAÇÃO] Música já está tocando, não tentar novamente');
        }
      }
    }
    
    // Atualizar ref do estado anterior APÓS processar
    previousModalStateRef.current = showNewLeadModal;
  }, [showNewLeadModal, newLeadData, playNotificationSound, stopNotificationSound]);

  // useEffect para limpar timer e música quando modal fechar (transição true -> false)
  useEffect(() => {
    const wasOpen = previousModalStateRef.current;
    const isNowClosed = !showNewLeadModal;
    
    // Atualizar ref do estado anterior
    previousModalStateRef.current = showNewLeadModal;
    
    // Só limpar se estava aberto e agora está fechado (transição true -> false)
    if (wasOpen && isNowClosed) {
      console.log('🛑 [NOTIFICAÇÃO] Modal fechado - limpando timer e música');
      
      // Proteger contra limpar timer muito recente (< 1 segundo)
      const timerAge = timerCreatedAtRef.current ? Date.now() - timerCreatedAtRef.current : Infinity;
      if (timerAge > 1000) {
        if (modalTimerRef.current) {
          clearTimeout(modalTimerRef.current);
          modalTimerRef.current = null;
        }
        timerCreatedAtRef.current = null;
      } else {
        console.log('⚠️ [NOTIFICAÇÃO] Timer muito recente, não limpando (idade:', timerAge, 'ms)');
      }
      
      audioStartedRef.current = false;
      if (audioInstanceRef.current) {
        stopNotificationSound();
      }
    }
  }, [showNewLeadModal, stopNotificationSound]);

  // Função para limpar notificações
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Componente da Modal
  const NewLeadModal = () => {
    if (!showNewLeadModal || !newLeadData) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(8px)',
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
          @keyframes flash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
        
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          padding: '3rem 2.5rem',
          maxWidth: '900px',
          width: '95%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'visible',
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
              alt="Invest Money" 
              style={{
                width: '70px',
                height: '70px',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)'
              }}
            />
          </div>
          
          {/* Badge de urgência - MUITO MAIOR E CHAMATIVO */}
          <div style={{
            position: 'absolute',
            top: '30px',
            right: '30px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
            color: 'white',
            padding: '1rem 2.5rem',
            borderRadius: '50px',
            fontSize: '1.5rem',
            fontWeight: '900',
            boxShadow: '0 8px 30px rgba(239, 68, 68, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            animation: 'flash 1s ease-in-out infinite',
            border: '3px solid #ffffff'
          }}>
            ⚡ URGENTE ⚡
          </div>
          
          {/* Título - MUITO MAIOR */}
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginTop: '3rem',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
          }}>
            🎯 Novo Lead Chegou!
          </h1>
          
          <p style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#10b981',
            marginBottom: '2rem',
            textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
          }}>
            ⚡ Captura disponível agora! ⚡
          </p>
          
          {/* Card com informações - MUITO MAIOR */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
            borderRadius: '20px',
            padding: '2.5rem',
            marginBottom: '2rem',
            border: '3px solid #3b82f6',
            boxShadow: '0 10px 40px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(59, 130, 246, 0.05)'
          }}>
            <div style={{
              fontSize: '2rem',
              color: '#1e293b',
              lineHeight: '2'
            }}>
              <div style={{ 
                marginBottom: '2rem',
                paddingBottom: '2rem',
                borderBottom: '3px solid #e5e7eb'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>Nome do Cliente</p>
                <p style={{ 
                  fontSize: '3rem', 
                  fontWeight: '900',
                  color: '#1e293b',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}>{newLeadData.nome}</p>
              </div>
              
              <div style={{ 
                marginBottom: '2rem',
                paddingBottom: '2rem',
                borderBottom: '3px solid #e5e7eb'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>📞 Telefone</p>
                <p style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '800',
                  color: '#3b82f6',
                  textShadow: '0 2px 10px rgba(59, 130, 246, 0.3)'
                }}>{newLeadData.telefone}</p>
              </div>
              
              <div>
                <p style={{ color: '#64748b', marginBottom: '0.75rem', fontSize: '1.25rem', fontWeight: '600' }}>📍 Localização</p>
                <p style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '800',
                  color: '#10b981',
                  textShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                }}>{newLeadData.cidade}/{newLeadData.estado}</p>
              </div>
            </div>
          </div>

          <p style={{
            marginTop: '2rem',
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            textShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
          }}>
            <span style={{ fontSize: '2rem' }}>⏰</span>
            <span>Seja rápido! Lead disponível para captura</span>
            <span style={{ fontSize: '2rem' }}>⏰</span>
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
    socket,
    notifications,
    clearNotifications,
    playNotificationSound,
    stopNotificationSound,
    showNewLeadModal,
    newLeadData,
    NewLeadModal
  };
};

export default useIncorporadoraNotifications;

