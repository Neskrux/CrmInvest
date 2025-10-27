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
    // Permitir entrada para TODOS os usuários da incorporadora (empresa_id === 5)
    // O backend já valida empresa_id === 5, então basta verificar aqui
    const isUserFromIncorporadora = user?.empresa_id === 5;
    
    if (!isUserFromIncorporadora) {
      console.log('⚠️ [SOCKET.IO] Hook não inicializado - usuário não é da incorporadora:', {
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
    // Enviar tipo de usuário real
    // Mas converter para 'consultor' se for admin para permitir entrada no backend
    const userTypeToSend = user.tipo === 'admin' ? 'admin' : (user.tipo === 'consultor' ? 'consultor' : 'consultor');
    
    newSocket.emit('join-incorporadora-notifications', {
      userType: userTypeToSend,
      userId: user.id,
      empresaId: user.empresa_id
    });
    console.log('📢 [SOCKET.IO] Emitindo join-incorporadora-notifications:', {
      userType: userTypeToSend,
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
      
      // Tocar som de notificação para TODOS os usuários logados (não apenas freelancers)
      playNotificationSound();
      
      // Mostrar toast para TODOS os usuários logados
      showInfoToast(
        `Novo cliente: ${data.nome} - ${data.cidade}/${data.estado}`,
        6000
      );
      
      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new-lead',
        data,
        timestamp: new Date()
      }]);
      
      // Se for SDR (consultor interno) ou admin da incorporadora, mostrar modal para capturar lead
      // SDR = consultor interno (NÃO freelancer)
      const isSDR = user.tipo === 'consultor' && !user.is_freelancer;
      const isAdminIncorporadora = user.tipo === 'admin' && user.empresa_id === 5;
      
      console.log('🔍 [SOCKET.IO] Verificando tipo de usuário para mostrar modal:', {
        userTipo: user.tipo,
        isFreelancer: user.is_freelancer,
        isSDR: isSDR,
        isAdminIncorporadora: isAdminIncorporadora,
        empresaId: user.empresa_id
      });
      
      if (isSDR || isAdminIncorporadora) {
        console.log('🎯 [SOCKET.IO] Abrindo modal de novo lead para SDR/Admin');
        setNewLeadData(data);
        setShowNewLeadModal(true);
        console.log('✅ [SOCKET.IO] Modal deve estar aberta agora');
      } else {
        console.log('ℹ️ [SOCKET.IO] Usuário não é SDR nem admin da incorporadora - modal não será exibida');
      }
      
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

    // Listener para novos fechamentos
    newSocket.on('new-fechamento-incorporadora', (data) => {
      console.log('🔔 [SOCKET.IO] Recebido evento new-fechamento-incorporadora:', {
        fechamentoId: data.fechamentoId,
        paciente_nome: data.paciente_nome,
        valor_fechado: data.valor_fechado,
        data_fechamento: data.data_fechamento,
        corretor_nome: data.corretor_nome,
        corretor_foto: data.corretor_foto ? 'Disponível' : 'Não disponível',
        timestamp: data.timestamp,
        socketId: newSocket.id
      });
      
      // Música removida temporariamente para fechamentos
      // playNotificationSound();
      
      // Mostrar toast personalizado com nome do corretor e valor apenas se não for freelancer
      if (!user.is_freelancer) {
        showSuccessToast(
          `💰 Fechamento realizado por ${data.corretor_nome} - R$ ${data.valor_fechado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          8000
        );
      }
      
      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new-fechamento',
        data,
        timestamp: new Date()
      }]);
      
      console.log('✅ [SOCKET.IO] Processamento do evento new-fechamento-incorporadora concluído');
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
  }, [user, showSuccessToast, showInfoToast]);

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

  // Função para capturar lead (atribuir ao SDR logado)
  const capturarLead = async () => {
    if (!newLeadData) return;
    
    // Verificar se é SDR (consultor interno)
    const isSDR = user.tipo === 'consultor' && !user.is_freelancer;
    
    if (!isSDR) {
      console.error('❌ [CAPTURAR LEAD] Apenas SDRs podem capturar leads!');
      showInfoToast('Apenas SDRs podem capturar leads.');
      return;
    }
    
    try {
      console.log('🎯 [SOCKET.IO] Capturando lead:', newLeadData.leadId);
      
      // Fazer requisição para atribuir lead ao SDR e alterar status para "em conversa"
      console.log('📤 [CAPTURAR LEAD] Dados do SDR:', {
        userId: user.id,
        userName: user.nome,
        userType: user.tipo,
        isFreelancer: user.is_freelancer,
        isSDR: isSDR,
        empresaId: user.empresa_id
      });
      
      console.log('📤 [CAPTURAR LEAD] Enviando requisição para endpoint pegarLead:', {
        leadId: newLeadData.leadId,
        endpoint: `/novos-leads/${newLeadData.leadId}/pegar`,
        sdrId: user.id  // Este ID será usado automaticamente pelo endpoint
      });
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/novos-leads/${newLeadData.leadId}/pegar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        // Não enviar body - o endpoint pegarLead usa o ID do usuário logado automaticamente
      });
      
      console.log('📤 [CAPTURAR LEAD] Resposta recebida:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [SOCKET.IO] Lead capturado com sucesso:', result);
        console.log('✅ [CAPTURAR LEAD] Lead atribuído ao SDR via endpoint pegarLead:', {
          leadId: newLeadData.leadId,
          sdrId: user.id,
          sdrNome: user.nome,
          isFreelancer: user.is_freelancer,
          isSDR: true,
          novoStatus: 'em_conversa',
          campoAtualizado: 'sdr_id',
          endpoint: 'pegarLead'
        });
        
        // PARAR A MÚSICA!
        stopNotificationSound();
        
        showSuccessToast(`Lead capturado por ${user.nome}!`);
        setShowNewLeadModal(false);
        setNewLeadData(null);
        
        // Emitir evento para notificar outros usuários
        if (socket) {
          socket.emit('lead-capturado', {
            leadId: newLeadData.leadId,
            sdrId: user.id,
            sdrNome: user.nome,
            empresaId: user.empresa_id
          });
          console.log('📢 [SOCKET.IO] Evento lead-capturado emitido para outros usuários');
        }
        
        // Recarregar a página para atualizar a lista
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Tentar parsear JSON, mas não falhar se não for JSON
        let errorMessage = 'Erro ao capturar lead';
        try {
          const error = await response.json();
          console.error('❌ [SOCKET.IO] Erro ao capturar lead:', error);
          errorMessage = error.error || errorMessage;
        } catch (parseError) {
          const text = await response.text();
          console.error('❌ [SOCKET.IO] Erro ao capturar lead (texto):', text);
          errorMessage = text || errorMessage;
        }
        showInfoToast(errorMessage);
      }
    } catch (error) {
      console.error('❌ [SOCKET.IO] Erro ao capturar lead:', error);
      showInfoToast('Erro de conexão ao capturar lead');
    }
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

          {/* Botões de ação */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
            alignItems: 'center'
          }}>
            {/* Botão de captura - Apenas para SDRs */}
            {user.tipo === 'consultor' && !user.is_freelancer && (
              <button
                onClick={capturarLead}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '0.6rem 1.5rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.25px',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                  transition: 'all 0.3s ease',
                  width: '100%',
                  maxWidth: '240px',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s linear infinite'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
                }}
              >
                <span style={{ 
                  position: 'relative', 
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}>
                  CAPTURAR LEAD AGORA
                </span>
              </button>
            )}

            {/* Botão dispensar - Para todos */}
            <button
              onClick={fecharModalLead}
              style={{
                background: '#f1f5f9',
                color: '#64748b',
                padding: '0.5rem 1.5rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                maxWidth: '240px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#e2e8f0';
                e.target.style.color = '#475569';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#f1f5f9';
                e.target.style.color = '#64748b';
              }}
            >
              Dispensar Notificação
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
    capturarLead,
    fecharModalLead,
    NewLeadModal
  };
};

export default useIncorporadoraNotifications;

