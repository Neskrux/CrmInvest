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
    // Se já começou a tocar, não tentar novamente (evitar duplicatas)
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

  // Verificar e processar notificação pendente do localStorage (após refresh)
  useEffect(() => {
    // Aguardar user estar disponível
    if (!user || !user.id || user.tipo !== 'admin' || user.empresa_id !== 5) {
      return;
    }

    const pendingNotification = localStorage.getItem('pending_notification');

    if (pendingNotification) {
      try {
        const notification = JSON.parse(pendingNotification);
        
        // Verificar se é uma notificação deste hook (agendamento)
        if (notification.type === 'agendamento' && notification.data) {
          console.log('✅ [NOTIFICAÇÃO] Processando agendamento pendente');
          
          // Limpar do localStorage imediatamente para evitar processar novamente
          localStorage.removeItem('pending_notification');
          
          // PRÉ-CARREGAR áudio ANTES de mostrar modal (para ter mais tempo de carregar)
          const audioSource = notification.data.sdr_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
          try {
            const preloadAudio = new Audio(audioSource);
            preloadAudio.preload = 'auto';
            preloadAudio.volume = 1.0;
            preloadAudio.load(); // Forçar início do carregamento
            preloadedAudioRef.current = preloadAudio;
            console.log('📦 [AGENDAMENTO] Áudio pré-carregado:', audioSource);
          } catch (e) {
            console.log('⚠️ [AGENDAMENTO] Erro ao pré-carregar áudio:', e);
          }
          
          // Processar a notificação: mostrar modal
          setAgendamentoData(notification.data);
          setShowAgendamentoModal(true);
          previousModalStateRef.current = true;
          audioStartedRef.current = false;
          
          // Tocar música será feito no useLayoutEffect após renderização
          // Timer será criado no useLayoutEffect separado
          
          // Adicionar à lista de notificações
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'new-agendamento',
            data: notification.data,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('❌ [NOTIFICAÇÃO] Erro ao processar notificação:', error);
        localStorage.removeItem('pending_notification');
      }
    }
  }, [user?.id, user?.tipo, user?.empresa_id]);

  useEffect(() => {
    // Permitir entrada APENAS para admin da incorporadora
    if (user?.tipo !== 'admin' || user?.empresa_id !== 5) {
      return;
    }

    // Configurar URL do backend
    const API_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    // Conectar ao Socket.IO com configurações para múltiplas abas
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      forceNew: true, // Forçar nova conexão
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      // Adicionar identificador único para cada aba
      query: {
        tabId: `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id
      }
    });
    
    setSocket(newSocket);

    // Entrar no grupo de notificações da incorporadora
    newSocket.emit('join-incorporadora-notifications', {
      userType: 'admin',
      userId: user.id,
      empresaId: user.empresa_id
    });

    // Listener para novos agendamentos
    newSocket.on('new-agendamento-incorporadora', (data) => {
      try {
        // Debounce: evitar refresh se outro refresh aconteceu há menos de 2 segundos
        const lastRefresh = localStorage.getItem('last_notification_refresh');
        const now = Date.now();
        const timeSinceLastRefresh = lastRefresh ? now - parseInt(lastRefresh) : Infinity;
        
        // IMPORTANTE: Fazer refresh ANTES de mostrar a notificação para garantir sockets ativos
        // Salvar dados da notificação no localStorage para recuperar após reload
        const notificationData = {
          type: 'agendamento',
          data: data,
          timestamp: now
        };
        
        // Se houver outra notificação pendente, mesclar (manter a mais recente)
        const existingNotification = localStorage.getItem('pending_notification');
        if (existingNotification && timeSinceLastRefresh < 2000) {
          try {
            const existing = JSON.parse(existingNotification);
            // Manter a mais recente (normalmente a atual)
            if (existing.timestamp && existing.timestamp > notificationData.timestamp) {
              return;
            }
          } catch (e) {
            // Se erro ao parsear, sobrescrever
          }
        }
        
        localStorage.setItem('pending_notification', JSON.stringify(notificationData));
        localStorage.setItem('last_notification_refresh', now.toString());
        
        // Forçar sincronização do localStorage (alguns navegadores precisam disso)
        if (window.localStorage) {
          window.dispatchEvent(new Event('storage'));
        }
        
        // Reload imediato - localStorage é síncrono
        window.location.reload();
        
        // Não executar o resto do código pois a página vai recarregar
        return;
      } catch (error) {
        console.error('❌ [SOCKET.IO] Erro ao processar agendamento:', error);
      }
    });

    // Log de conexão/desconexão
    newSocket.on('connect', () => {
      // Re-entrar no grupo de notificações ao reconectar
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: user.id,
        empresaId: user.empresa_id
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [AGENDAMENTO] Erro de conexão:', error);
    });

    // Cleanup - NÃO limpar timer aqui, apenas socket
    return () => {
      // NÃO limpar timer no cleanup do socket - ele será limpo quando:
      // 1. O timer executar (após 20s)
      // 2. A música terminar (evento 'ended')
      // 3. O modal fechar manualmente
      
      // Parar música apenas se não houver modal ativo E música já começou a tocar
      // Não pausar durante a inicialização (quando audioStartedRef é false)
      if (!showAgendamentoModal && audioInstanceRef.current && audioStartedRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
      
      newSocket.disconnect();
    };
  }, [user, playAgendamentoSound, stopAgendamentoSound]);

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
      
      // Tocar música imediatamente e também após delays pequenos
      if (showAgendamentoModal && agendamentoData && !audioStartedRef.current) {
        console.log('🔊 [AGENDAMENTO] Tentando tocar música após renderização...');
        playAgendamentoSound(agendamentoData.sdr_musica);
        
        // Tentar novamente após pequenos delays como backup
        [100, 200, 300].forEach((delay) => {
          setTimeout(() => {
            if (showAgendamentoModal && agendamentoData && !audioStartedRef.current && audioInstanceRef.current) {
              console.log(`🔄 [AGENDAMENTO] Retry backup após ${delay}ms...`);
              try {
                if (audioInstanceRef.current.paused) {
                  audioInstanceRef.current.play()
                    .then(() => {
                      audioStartedRef.current = true;
                      console.log(`✅ [AGENDAMENTO] Música iniciada no retry backup!`);
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
    previousModalStateRef.current = showAgendamentoModal;
  }, [showAgendamentoModal, agendamentoData, playAgendamentoSound, stopAgendamentoSound]);

  // useEffect para limpar timer e música quando modal fechar (transição true -> false)
  useEffect(() => {
    const wasOpen = previousModalStateRef.current;
    const isNowClosed = !showAgendamentoModal;
    
    // Atualizar ref do estado anterior
    previousModalStateRef.current = showAgendamentoModal;
    
    // Só limpar se estava aberto e agora está fechado (transição true -> false)
    // E também verificar se existe timer para evitar limpeza no StrictMode quando modal está abrindo
    if (wasOpen && isNowClosed && modalTimerRef.current) {
      console.log('🛑 [AGENDAMENTO] Modal fechado - limpando timer e música');
      
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
      
      audioStartedRef.current = false;
      if (audioInstanceRef.current) {
        stopAgendamentoSound();
      }
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
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '400px',
          width: '90%',
          boxShadow: '0 12px 24px -6px rgba(0, 0, 0, 0.25)',
          position: 'relative'
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
              alt="IM Solumn" 
              style={{
                width: '40px',
                height: '40px',
                objectFit: 'contain'
              }}
            />
          </div>
          
          {/* Foto do SDR */}
          {agendamentoData.sdr_foto && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1rem',
              marginTop: '1.5rem'
            }}>
              <img 
                src={agendamentoData.sdr_foto} 
                alt={agendamentoData.sdr_nome}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #3b82f6'
                }}
              />
            </div>
          )}
          
          {/* Título */}
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            textAlign: 'center',
            marginBottom: '0.5rem',
            color: '#1e293b'
          }}>
            Novo Agendamento!
          </h2>
          
          <p style={{
            textAlign: 'center',
            color: '#64748b',
            marginBottom: '1.2rem',
            fontSize: '1,5rem'
          }}>
            Agendado por <strong>{agendamentoData.sdr_nome}</strong>
          </p>
          
          {/* Dados do agendamento */}
          <div style={{
            background: '#f8fafc',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Cliente
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b' }}>
                {agendamentoData.paciente_nome}
              </div>
            </div>
            
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Data e Horário
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1e293b' }}>
                {new Date(agendamentoData.data_agendamento).toLocaleDateString('pt-BR')} às {agendamentoData.horario}
              </div>
            </div>
          </div>

          {/* Música tocando */}
          <p style={{
            textAlign: 'center',
            color: '#10b981',
            marginTop: '1rem',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}>
            🎵 Reproduzindo música do {agendamentoData.sdr_nome}...
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

