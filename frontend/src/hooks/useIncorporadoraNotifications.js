import { useEffect, useState, useRef, useCallback } from 'react';
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

  // Função para parar música - usar useCallback para garantir que sempre tenha acesso ao ref atual
  const stopNotificationSound = useCallback(() => {
    if (audioInstanceRef.current) {
      console.log('🔇 [AUDIO] Parando música');
      audioInstanceRef.current.pause();
      audioInstanceRef.current.currentTime = 0;
      audioInstanceRef.current = null;
    }
  }, []);

  // Função para tocar som de notificação - usar useCallback para garantir que sempre tenha acesso ao ref atual
  const playNotificationSound = useCallback((musicaUrl) => {
    try {
      console.log('🔊 [AUDIO] Iniciando música de notificação', { musicaUrl });
      
      // Parar áudio anterior se existir
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
      
      // Usar música personalizada do corretor se disponível, senão usar áudio padrão
      const audioSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
      const audio = new Audio(audioSource);
      audio.volume = 1.0; // Volume máximo
      audio.loop = true; // MÚSICA EM LOOP ATÉ CAPTURAR!
      
      audioInstanceRef.current = audio;
      
      // Tentar tocar música
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ [AUDIO] Música tocando em LOOP!');
          })
          .catch(error => {
            // Erro de autoplay policy - normal, não bloquear o modal
            // A música tentará tocar quando o usuário interagir com a página
            console.log('ℹ️ [AUDIO] Áudio aguardando interação do usuário');
            
            // Adicionar listener de clique para tentar tocar após interação
            const tryPlayOnInteraction = () => {
              if (audioInstanceRef.current && audioInstanceRef.current.paused) {
                audioInstanceRef.current.play()
                  .then(() => {
                    console.log('✅ [AUDIO] Música iniciada após interação');
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
      console.log('ℹ️ [AUDIO] Não foi possível criar áudio');
    }
  }, []);

  // useEffect para parar música quando o modal for fechado
  useEffect(() => {
    // Só executar quando o modal mudar de true para false
    if (!showNewLeadModal) {
      // Limpar timer se existir
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      
      // Parar música se estiver tocando
      if (audioInstanceRef.current) {
        console.log('🛑 [AUDIO] Modal fechado, parando música automaticamente');
        stopNotificationSound();
      }
    }
  }, [showNewLeadModal, stopNotificationSound]);

  useEffect(() => {
    // Permitir entrada APENAS para admin da incorporadora
    if (user?.tipo !== 'admin' || user?.empresa_id !== 5) {
      console.log('⚠️ [SOCKET.IO] Hook não inicializado - usuário não é admin da incorporadora:', {
        empresaId: user?.empresa_id,
        userTipo: user?.tipo,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🚀 [SOCKET.IO] Inicializando hook de notificações:', {
      userId: user.id,
      userType: user.tipo,
      empresaId: user.empresa_id,
      timestamp: new Date().toISOString()
    });

    // Configurar URL do backend
    const API_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    console.log('🔗 [SOCKET.IO] Conectando ao backend:', API_BASE_URL);
    
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
    console.log('🔌 [SOCKET.IO] Socket criado:', newSocket.id);

    // Entrar no grupo de notificações da incorporadora
    newSocket.emit('join-incorporadora-notifications', {
      userType: 'admin',
      userId: user.id,
      empresaId: user.empresa_id
    });
    console.log('📢 [SOCKET.IO] Emitindo join-incorporadora-notifications:', {
      userType: 'admin',
      userTipoOriginal: user.tipo,
      userId: user.id,
      empresaId: user.empresa_id
    });

    console.log('🔔 [SOCKET.IO] Conectado às notificações');

    // Listener para novos leads/clientes
    newSocket.on('new-lead-incorporadora', (data) => {
      console.log('🔔 [SOCKET.IO] Recebido evento new-lead-incorporadora:', {
        leadId: data.leadId,
        nome: data.nome,
        cidade: data.cidade,
        estado: data.estado,
        consultor_nome: data.consultor_nome,
        timestamp: data.timestamp,
        socketId: newSocket.id
      });
      
      try {
        // Tocar música personalizada do corretor
        playNotificationSound(data.corretor_musica);
        
        // Mostrar modal (apenas visualização)
        setNewLeadData(data);
        setShowNewLeadModal(true);
        
        // Timer para fechar automaticamente após 20 segundos
        const timer = setTimeout(() => {
          console.log('⏰ [TIMER] Fechando modal de novo lead após 20 segundos...');
          stopNotificationSound();
          setShowNewLeadModal(false);
          setNewLeadData(null);
        }, 20000);
        modalTimerRef.current = timer;
        
        // Adicionar à lista de notificações
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'new-lead',
          data,
          timestamp: new Date()
        }]);
        
        console.log('✅ [SOCKET.IO] Processamento do evento new-lead-incorporadora concluído');
      } catch (error) {
        console.error('❌ [SOCKET.IO] Erro ao processar novo lead:', error);
      }
    });

    // Listener para lead capturado (fechar modal em todos os clientes)
    newSocket.on('lead-capturado-incorporadora', (data) => {
      console.log('🎯 [SOCKET.IO] Lead capturado por outro usuário:', {
        leadId: data.leadId,
        sdrNome: data.sdrNome,
        timestamp: data.timestamp
      });
      
      // Se a modal estiver aberta com esse lead, fechar
      if (showNewLeadModal && newLeadData && newLeadData.leadId === data.leadId) {
        console.log('✅ [SOCKET.IO] Fechando modal de lead capturado');
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
      console.log('🔔 [SOCKET.IO] Recebido evento new-agendamento-incorporadora:', {
        agendamentoId: data.agendamentoId,
        paciente_nome: data.paciente_nome,
        data_agendamento: data.data_agendamento,
        horario: data.horario,
        sdr_nome: data.sdr_nome,
        sdr_foto: data.sdr_foto ? 'Disponível' : 'Não disponível',
        timestamp: data.timestamp,
        socketId: newSocket.id
      });
      
      // Música removida temporariamente para agendamentos
      // playNotificationSound();
      
      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new-agendamento',
        data,
        timestamp: new Date()
      }]);
      
      console.log('✅ [SOCKET.IO] Processamento do evento new-agendamento-incorporadora concluído');
    });

    // Log de conexão/desconexão
    newSocket.on('connect', () => {
      console.log('✅ [SOCKET.IO] Socket conectado - Incorporadora:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
      
      // Re-entrar no grupo de notificações ao reconectar
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: user.id,
        empresaId: user.empresa_id
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ [SOCKET.IO] Socket desconectado - Incorporadora:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
    });

    newSocket.on('reconnect', () => {
      console.log('🔄 [SOCKET.IO] Socket reconectado - Incorporadora:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
      
      // Re-entrar no grupo de notificações ao reconectar
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: user.id,
        empresaId: user.empresa_id
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [SOCKET.IO] Erro de conexão - Incorporadora:', {
        error: error.message,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
    });

    // Cleanup
    return () => {
      console.log('🧹 [SOCKET.IO] Limpando conexão Socket.IO:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
      
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
    };
  }, [user?.id, user?.empresa_id, user?.tipo, playNotificationSound, stopNotificationSound]);

  // Função para limpar notificações
  const clearNotifications = () => {
    console.log('🧹 [SOCKET.IO] Limpando notificações:', {
      quantidadeAntes: notifications.length,
      timestamp: new Date().toISOString()
    });
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

