import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import io from 'socket.io-client';
import logoBrasao from '../images/logobrasaopreto.png';

const useIncorporadoraNotifications = () => {
  const { user, isIncorporadora } = useAuth();
  const { showSuccessToast, showInfoToast } = useToast();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadData, setNewLeadData] = useState(null);

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
    
    // Conectar ao Socket.IO
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling']
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
      
      // Tocar música personalizada do corretor
      playNotificationSound(data.corretor_musica);
      
      // Mostrar toast
      showSuccessToast(
        `🎯 Novo ${isIncorporadora ? 'cliente' : 'lead'} disponível - ${data.nome}`,
        6000
      );
      
      // Mostrar modal (apenas visualização)
      setNewLeadData(data);
      setShowNewLeadModal(true);
      
      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new-lead',
        data,
        timestamp: new Date()
      }]);
      
      console.log('✅ [SOCKET.IO] Processamento do evento new-lead-incorporadora concluído');
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
        setShowNewLeadModal(false);
        setNewLeadData(null);
        
        // Mostrar toast informando que o lead foi capturado
        showInfoToast(`Lead capturado por ${data.sdrNome}`, 3000);
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
      
      // Mostrar toast personalizado com nome do SDR apenas se não for freelancer
      if (!user.is_freelancer) {
        showSuccessToast(
          `📅 Novo agendamento criado por ${data.sdr_nome} - ${data.paciente_nome}`,
          6000
        );
      }
      
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
    });

    newSocket.on('disconnect', () => {
      console.log('❌ [SOCKET.IO] Socket desconectado - Incorporadora:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
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
      newSocket.disconnect();
    };
  }, [user?.id, user?.empresa_id, user?.tipo, showSuccessToast, showInfoToast]);

  // Estado do áudio
  const [audioInstance, setAudioInstance] = useState(null);

  // Função para tocar som de notificação
  const playNotificationSound = () => {
    try {
      console.log('🔊 [AUDIO] Iniciando música de notificação');
      
      // Parar áudio anterior se existir
      if (audioInstance) {
        audioInstance.pause();
        audioInstance.currentTime = 0;
      }
      
      const audio = new Audio(`${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`);
      audio.volume = 1.0; // Volume máximo
      audio.loop = true; // MÚSICA EM LOOP ATÉ CAPTURAR!
      
      setAudioInstance(audio);
      
      audio.play().then(() => {
        console.log('✅ [AUDIO] Música tocando em LOOP!');
      }).catch(error => {
        console.error('❌ [AUDIO] Erro ao tocar música:', error);
        // Tentar novamente
        setTimeout(() => {
          audio.play().catch(e => console.error('❌ [AUDIO] Segunda tentativa falhou:', e));
        }, 100);
      });
    } catch (error) {
      console.error('❌ [AUDIO] Erro ao criar áudio:', error);
    }
  };

  // Função para parar música
  const stopNotificationSound = () => {
    if (audioInstance) {
      console.log('🔇 [AUDIO] Parando música');
      audioInstance.pause();
      audioInstance.currentTime = 0;
      setAudioInstance(null);
    }
  };

  // Função para limpar notificações
  const clearNotifications = () => {
    console.log('🧹 [SOCKET.IO] Limpando notificações:', {
      quantidadeAntes: notifications.length,
      timestamp: new Date().toISOString()
    });
    setNotifications([]);
  };

  // Função para fechar modal e dispensar notificação
  const fecharModalLead = () => {
    console.log('❌ [SOCKET.IO] Dispensando notificação de lead');
    stopNotificationSound(); // Parar o som
    setShowNewLeadModal(false);
    setNewLeadData(null);
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

          {/* Botão de fechar */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <button
              onClick={fecharModalLead}
              style={{
                background: 'rgba(107, 114, 128, 0.1)',
                color: '#6b7280',
                padding: '0.6rem 1.5rem',
                borderRadius: '6px',
                border: '1px solid rgba(107, 114, 128, 0.2)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(107, 114, 128, 0.2)';
                e.target.style.borderColor = 'rgba(107, 114, 128, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(107, 114, 128, 0.1)';
                e.target.style.borderColor = 'rgba(107, 114, 128, 0.2)';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Fechar
            </button>
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
    fecharModalLead,
    NewLeadModal
  };
};

export default useIncorporadoraNotifications;

