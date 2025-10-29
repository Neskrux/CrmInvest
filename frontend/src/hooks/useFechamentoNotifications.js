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

  // Função para parar música - estabilizada com useCallback
  const stopFechamentoSound = useCallback(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
      audioInstanceRef.current.currentTime = 0;
      audioInstanceRef.current = null;
    }
  }, []);

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

  // Verificar e processar notificação pendente do localStorage (após refresh)
  useEffect(() => {
    if (!userData || !userData.id || userData.tipo !== 'admin' || userData.empresa_id !== 5) {
      return;
    }

    const pendingNotification = localStorage.getItem('pending_notification');

    if (pendingNotification) {
      try {
        const notification = JSON.parse(pendingNotification);
        
        // Verificar se é uma notificação deste hook (fechamento)
        if (notification.type === 'fechamento' && notification.data) {
          console.log('✅ [NOTIFICAÇÃO] Processando fechamento pendente');
          
          // Limpar do localStorage imediatamente para evitar processar novamente
          localStorage.removeItem('pending_notification');
          
          // PRÉ-CARREGAR áudio ANTES de mostrar modal (para ter mais tempo de carregar)
          const audioSource = notification.data.corretor_musica || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
          try {
            const preloadAudio = new Audio(audioSource);
            preloadAudio.preload = 'auto';
            preloadAudio.volume = 0.6;
            preloadAudio.load(); // Forçar início do carregamento
            preloadedAudioRef.current = preloadAudio;
            console.log('📦 [FECHAMENTO] Áudio pré-carregado:', audioSource);
          } catch (e) {
            console.log('⚠️ [FECHAMENTO] Erro ao pré-carregar áudio:', e);
          }
          
          // Processar a notificação: mostrar modal
          setFechamentoData(notification.data);
          setShowFechamentoModal(true);
          previousModalStateRef.current = true;
          audioStartedRef.current = false;
          
          // Tocar música será feito no useLayoutEffect após renderização
          // Timer será criado no useLayoutEffect separado
        }
      } catch (error) {
        console.error('❌ [NOTIFICAÇÃO] Erro ao processar notificação:', error);
        localStorage.removeItem('pending_notification');
      }
    }
  }, [userData?.id, userData?.tipo, userData?.empresa_id, playFechamentoSound, stopFechamentoSound]);

  // Inicializar socket apenas uma vez
  useEffect(() => {
    // Verificar se já foi inicializado
    if (isInitializedRef.current) {
      return;
    }

    // Permitir entrada APENAS para admin da incorporadora
    if (userData.tipo !== 'admin' || userData.empresa_id !== 5 || !userData.id) {
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
        userId: userData.id
      }
    });
    
    socketRef.current = newSocket;
    isInitializedRef.current = true;


    // Entrar no grupo de notificações da incorporadora
    newSocket.emit('join-incorporadora-notifications', {
      userType: 'admin',
      userId: userData.id,
      empresaId: userData.empresa_id,
      tabId: newSocket.query?.tabId
    });

    // Debug: Listener para eventos de conexão
    newSocket.on('connect', () => {
      // Re-entrar no grupo de notificações ao reconectar
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: userData.id,
        empresaId: userData.empresa_id,
        tabId: newSocket.query?.tabId
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [FECHAMENTO] Erro de conexão:', error);
    });

    // Listener para novos fechamentos
    newSocket.on('new-fechamento-incorporadora', (data) => {
      try {
        // Debounce: evitar refresh se outro refresh aconteceu há menos de 2 segundos
        const lastRefresh = localStorage.getItem('last_notification_refresh');
        const now = Date.now();
        const timeSinceLastRefresh = lastRefresh ? now - parseInt(lastRefresh) : Infinity;
        
        // IMPORTANTE: Fazer refresh ANTES de mostrar a notificação para garantir sockets ativos
        // Salvar dados da notificação no localStorage para recuperar após reload
        const notificationData = {
          type: 'fechamento',
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
        console.error('❌ [FECHAMENTO] Erro ao processar fechamento:', error);
      }
    });

    // Cleanup apenas quando componente for desmontado - NÃO limpar timer aqui
    return () => {
      // NÃO limpar timer no cleanup do socket - ele será limpo quando:
      // 1. O timer executar (após 20s)
      // 2. A música terminar (evento 'ended')
      // 3. O modal fechar manualmente
      
      // Parar música apenas se não houver modal ativo
      if (!showFechamentoModal && audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
      
      newSocket.disconnect();
      isInitializedRef.current = false;
    };
  }, [userData, playFechamentoSound, stopFechamentoSound]);

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


  // Componente da Modal - SEM ANIMAÇÕES
  const FechamentoModal = () => {
    if (!showFechamentoModal || !fechamentoData) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1rem',
          maxWidth: '320px',
          width: '85%',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          position: 'relative',
          border: '2px solid #e5e7eb'
        }}>
          {/* Logo no topo */}
          <div style={{
            position: 'absolute',
            top: '-15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30px',
            height: '30px',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '2px solid #e5e7eb'
          }}>
            <img 
              src={logoBrasao}
              alt="Invest Money" 
              style={{
                width: '30px',
                height: '30px',
                objectFit: 'contain'
              }}
            />
          </div>
          
          {/* Badge de celebração */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '15px',
            background: '#10b981',
            color: 'white',
            padding: '0.3rem 0.8rem',
            borderRadius: '15px',
            fontSize: '0.75rem',
            fontWeight: '600'
          }}>
            FECHAMENTO!
          </div>
          
          {/* Título */}
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: '#10b981',
            marginTop: '1rem',
            marginBottom: '0.25rem',
            textTransform: 'uppercase',
            letterSpacing: '0.25px'
          }}>
            Novo Fechamento!
          </h1>
          
          <p style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#10b981',
            marginBottom: '0.5rem'
          }}>
            Parabéns pela venda!
          </p>
          
          {/* Foto do corretor */}
          {fechamentoData.corretor_foto && (
            <div style={{
              marginBottom: '0.75rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #10b981',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
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
            </div>
          )}
          
          {/* Card com informações */}
          <div style={{
            background: '#f0fdf4',
            borderRadius: '6px',
            padding: '0.6rem',
            marginBottom: '0.6rem',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{
              fontSize: '0.9rem',
              color: '#1e293b',
              lineHeight: '1.6'
            }}>
              <div style={{ 
                marginBottom: '0.6rem',
                paddingBottom: '0.6rem',
                borderBottom: '1px solid #bbf7d0'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.2rem', fontSize: '0.7rem' }}>Corretor</p>
                <p style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '700',
                  color: '#1e293b'
                }}>{fechamentoData.corretor_nome}</p>
              </div>
              
              <div style={{ 
                marginBottom: '0.6rem',
                paddingBottom: '0.6rem',
                borderBottom: '1px solid #bbf7d0'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.2rem', fontSize: '0.7rem' }}>Cliente</p>
                <p style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  color: '#1e293b'
                }}>{fechamentoData.paciente_nome}</p>
              </div>
              
              <div style={{ 
                marginBottom: '0.6rem',
                paddingBottom: '0.6rem',
                borderBottom: '1px solid #bbf7d0'
              }}>
                <p style={{ color: '#64748b', marginBottom: '0.2rem', fontSize: '0.7rem' }}>Valor Fechado</p>
                <p style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: '700',
                  color: '#10b981'
                }}>R$ {fechamentoData.valor_fechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              
              <div>
                <p style={{ color: '#64748b', marginBottom: '0.2rem', fontSize: '0.7rem' }}>Data</p>
                <p style={{ 
                  fontSize: '0.8rem', 
                  fontWeight: '600',
                  color: '#1e293b'
                }}>{new Date(fechamentoData.data_fechamento).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          <p style={{
            marginTop: '1rem',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            Parabéns pela conquista!
          </p>
          
          {/* Footer com marca */}
          <div style={{
            marginTop: '1.2rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: 0.7
          }}>
            <img 
              src={logoBrasao}
              alt="Invest Money" 
              style={{
                width: '20px',
                height: '20px',
                objectFit: 'contain'
              }}
            />
            <span style={{
              fontSize: '0.75rem',
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
    showFechamentoModal,
    fechamentoData,
    fecharModal,
    FechamentoModal
  };
};

export default useFechamentoNotifications;
