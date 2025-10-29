import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
    try {
      // Parar áudio anterior se existir
      stopFechamentoSound();
      
      // Usar música personalizada do corretor se disponível, senão usar áudio padrão
      const audioSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
      
      const audio = new Audio(audioSource);
      audio.volume = 0.6; // Volume baixo para evitar travadas
      audio.loop = true;
      
      audioInstanceRef.current = audio;
      
      // Tentar tocar música
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ [FECHAMENTO] Música tocando em LOOP!');
          })
          .catch(error => {
            // Erro de autoplay policy - normal, não bloquear o modal
            // A música tentará tocar quando o usuário interagir com a página
            console.log('ℹ️ [FECHAMENTO] Áudio aguardando interação do usuário');
            
            // Adicionar listener de clique para tentar tocar após interação
            const tryPlayOnInteraction = () => {
              if (audioInstanceRef.current && audioInstanceRef.current.paused) {
                audioInstanceRef.current.play()
                  .then(() => {
                    console.log('✅ [FECHAMENTO] Música iniciada após interação');
                    document.removeEventListener('click', tryPlayOnInteraction);
                    document.removeEventListener('touchstart', tryPlayOnInteraction);
                  })
                  .catch(() => {
                    // Ignorar erro silenciosamente
                  });
              }
            };
            
            document.addEventListener('click', tryPlayOnInteraction, { once: true });
            document.addEventListener('touchstart', tryPlayOnInteraction, { once: true });
          });
      }
    } catch (error) {
      // Erro silencioso - não bloquear o modal se o áudio falhar
      console.log('ℹ️ [FECHAMENTO] Não foi possível criar áudio');
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

    console.log('🔌 [FECHAMENTO] Socket conectado:', {
      socketId: newSocket.id,
      tabId: newSocket.query?.tabId,
      userId: userData.id,
      empresaId: userData.empresa_id
    });

    // Entrar no grupo de notificações da incorporadora
    newSocket.emit('join-incorporadora-notifications', {
      userType: 'admin',
      userId: userData.id,
      empresaId: userData.empresa_id,
      tabId: newSocket.query?.tabId
    });

    // Debug: Listener para eventos de conexão
    newSocket.on('connect', () => {
      console.log('✅ [FECHAMENTO] Socket conectado com sucesso:', newSocket.id);
      
      // Re-entrar no grupo de notificações ao reconectar
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: userData.id,
        empresaId: userData.empresa_id,
        tabId: newSocket.query?.tabId
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ [FECHAMENTO] Socket desconectado');
    });

    newSocket.on('reconnect', () => {
      console.log('🔄 [FECHAMENTO] Socket reconectado');
      
      // Re-entrar no grupo de notificações ao reconectar
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: userData.id,
        empresaId: userData.empresa_id,
        tabId: newSocket.query?.tabId
      });
    });

    // Listener para novos fechamentos
    newSocket.on('new-fechamento-incorporadora', (data) => {
      console.log('🎵 [FECHAMENTO] Recebido evento de fechamento:', {
        tabId: newSocket.query?.tabId,
        socketId: newSocket.id,
        data: data
      });
      
      try {
        // Tocar música personalizada do corretor
        playFechamentoSound(data.corretor_musica);
        
        // Mostrar modal
        setFechamentoData(data);
        setShowFechamentoModal(true);
        
        // Timer para fechar automaticamente após 20 segundos
        const timer = setTimeout(() => {
          console.log('⏰ [TIMER] Fechando modal de fechamento após 20 segundos...');
          stopFechamentoSound();
          setShowFechamentoModal(false);
          setFechamentoData(null);
        }, 20000);
        modalTimerRef.current = timer;
      } catch (error) {
        console.error('❌ [FECHAMENTO] Erro ao processar fechamento:', error);
      }
    });

    // Cleanup apenas quando componente for desmontado
    return () => {
      // Limpar timer se existir
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      
      // Parar música se estiver tocando
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
      
      newSocket.disconnect();
      isInitializedRef.current = false;
    };
  }, [userData, playFechamentoSound, stopFechamentoSound]);

  // useEffect para parar música quando o modal for fechado
  useEffect(() => {
    // Só executar quando o modal mudar de true para false
    if (!showFechamentoModal) {
      // Limpar timer se existir
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      
      // Parar música se estiver tocando
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
