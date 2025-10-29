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

  // Função para parar música - usar useCallback para garantir que sempre tenha acesso ao ref atual
  const stopNotificationSound = useCallback(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current.currentTime = 0;
      audioInstanceRef.current = null;
    }
  }, []);

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
    
    console.log('🔗 [SOCKET.IO] Conectando ao backend:', {
      API_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL
    });
    
    // Conectar ao Socket.IO com configurações ROBUSTAS para produção
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'], // Tentar websocket primeiro, fallback para polling
      forceNew: true, // ✅ FORÇAR nova conexão - cada dispositivo precisa da sua própria!
      reconnection: true,
      reconnectionAttempts: Infinity, // Tentar reconectar infinitamente
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // Adicionar identificador único para cada aba/dispositivo
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
    
    setSocket(newSocket);

    // Função auxiliar para entrar no grupo (chamada múltiplas vezes se necessário)
    const joinGroup = () => {
      if (newSocket.connected) {
        console.log('📢 [SOCKET.IO] Entrando no grupo incorporadora-notifications:', {
          socketId: newSocket.id,
          userId: user.id,
          empresaId: user.empresa_id,
          connected: newSocket.connected
        });
        
        newSocket.emit('join-incorporadora-notifications', {
          userType: 'admin',
          userId: user.id,
          empresaId: user.empresa_id
        });
      } else {
        console.warn('⚠️ [SOCKET.IO] Socket não conectado, aguardando conexão...');
      }
    };

    // Listener para confirmação de entrada no grupo
    newSocket.on('joined-incorporadora-notifications', (data) => {
      if (data.success) {
        console.log('✅ [SOCKET.IO] Confirmado: Entrou no grupo incorporadora-notifications:', {
          socketId: data.socketId,
          timestamp: data.timestamp
        });
      } else {
        console.error('❌ [SOCKET.IO] Falha ao entrar no grupo:', {
          motivo: data.motivo,
          timestamp: data.timestamp
        });
        // Tentar novamente após delay
        setTimeout(() => {
          if (newSocket.connected) {
            joinGroup();
          }
        }, 2000);
      }
    });

    // Entrar no grupo quando conectado
    if (newSocket.connected) {
      joinGroup();
    }

    // Listener para novos leads/clientes - REMOVIDO RELOAD AUTOMÁTICO
    newSocket.on('new-lead-incorporadora', (data) => {
      try {
        console.log('🔔 [SOCKET.IO] Recebido evento new-lead-incorporadora:', {
          leadId: data.leadId,
          nome: data.nome,
          cidade: data.cidade,
          estado: data.estado,
          socketId: newSocket.id,
          connected: newSocket.connected,
          timestamp: new Date().toISOString()
        });
        
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
      
      // CRÍTICO: Re-entrar no grupo de notificações ao reconectar
      // Aguardar um pouco para garantir que a conexão está estável
      setTimeout(() => {
        if (newSocket.connected) {
          joinGroup();
        }
      }, 100);
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
      
      // Re-entrar no grupo após reconexão
      joinGroup();
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
        const lastJoinCheck = localStorage.getItem('last_join_check');
        const now = Date.now();
        if (!lastJoinCheck || (now - parseInt(lastJoinCheck)) > 60000) { // A cada 1 minuto
          joinGroup();
          localStorage.setItem('last_join_check', now.toString());
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
      newSocket.off('new-lead-incorporadora');
      newSocket.off('lead-capturado-incorporadora');
      newSocket.off('new-agendamento-incorporadora');
      newSocket.off('joined-incorporadora-notifications');
      newSocket.off('pong');
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('reconnect');
      newSocket.off('reconnect_attempt');
      newSocket.off('reconnect_error');
      newSocket.off('reconnect_failed');
      
      // Parar música apenas se não houver modal ativo
      if (!showNewLeadModal && audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
      
      // Desconectar socket
      if (newSocket.connected) {
        newSocket.disconnect();
      }
    };
  }, [user?.id, user?.empresa_id, user?.tipo, playNotificationSound, stopNotificationSound]);

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
            0% { transform: translateY(-50px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes glow {
            0% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
            50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.8), 0 0 60px rgba(16, 185, 129, 0.4); }
            100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
        `}</style>
        
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.25rem',
          maxWidth: '320px',
          width: '90%',
          boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.25)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'visible',
          animation: 'slideDown 0.5s ease-out, pulse 2s ease-in-out infinite',
          border: '2px solid #e5e7eb'
        }}>
          {/* Logo no topo */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '40px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            border: '3px solid #e5e7eb'
          }}>
            <img 
              src={logoBrasao}
              alt="Invest Money" 
              style={{
                width: '40px',
                height: '40px',
                objectFit: 'contain'
              }}
            />
          </div>
          
          {/* Badge de urgência */}
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '20px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            padding: '0.4rem 1.2rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600',
            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
          }}>
            URGENTE
          </div>
          
          {/* Título */}
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginTop: '1.5rem',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.25px'
          }}>
            Novo Lead Chegou!
          </h1>
          
          <p style={{
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#10b981',
            marginBottom: '0.75rem'
          }}>
            Captura disponível agora!
          </p>
          
          {/* Card com informações */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '0.75rem',
            marginBottom: '0.75rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              fontSize: '1.125rem',
              color: '#1e293b',
              lineHeight: '1.8'
            }}>
              <div style={{ 
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Nome do Cliente</p>
                <p style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  color: '#1e293b'
                }}>{newLeadData.nome}</p>
              </div>
              
              <div style={{ 
                marginBottom: '1rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Telefone</p>
                <p style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  color: '#1e293b'
                }}>{newLeadData.telefone}</p>
              </div>
              
              <div>
                <p style={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Localização</p>
                <p style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600',
                  color: '#1e293b'
                }}>{newLeadData.cidade}/{newLeadData.estado}</p>
              </div>
            </div>
          </div>

          <p style={{
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Seja rápido! Lead disponível para captura
          </p>
          
          {/* Footer com marca */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            opacity: 0.7
          }}>
            <img 
              src={logoBrasao}
              alt="Invest Money" 
              style={{
                width: '24px',
                height: '24px',
                objectFit: 'contain'
              }}
            />
            <span style={{
              fontSize: '0.875rem',
              color: '#64748b',
              fontWeight: '500'
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

