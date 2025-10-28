import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import io from 'socket.io-client';
import logoBrasao from '../images/logobrasaopreto.png';

const useAgendamentoNotifications = () => {
  const { user, isIncorporadora } = useAuth();
  const { showSuccessToast, showInfoToast } = useToast();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [agendamentoData, setAgendamentoData] = useState(null);
  const [audioInstance, setAudioInstance] = useState(null);

  useEffect(() => {
    // Permitir entrada para TODOS os usuários da incorporadora (empresa_id === 5)
    const isUserFromIncorporadora = user?.empresa_id === 5;
    
    if (!isUserFromIncorporadora) {
      return;
    }

    // Configurar URL do backend
    const API_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    // Conectar ao Socket.IO
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    // Entrar no grupo de notificações da incorporadora
    const userTypeToSend = user.tipo === 'admin' ? 'admin' : (user.tipo === 'consultor' ? 'consultor' : 'consultor');
    
    newSocket.emit('join-incorporadora-notifications', {
      userType: userTypeToSend,
      userId: user.id,
      empresaId: user.empresa_id
    });

    // Listener para novos agendamentos
    newSocket.on('new-agendamento-incorporadora', (data) => {
      // Mostrar toast personalizado com nome do SDR e foto apenas se não for freelancer
      if (!user.is_freelancer) {
        showSuccessToast(
          `📅 Novo agendamento criado por ${data.sdr_nome} - ${data.paciente_nome}`,
          6000
        );
      }
      
      // Mostrar modal com foto do SDR para todos (admin e consultores não freelancer)
      if (!user.is_freelancer) {
        setAgendamentoData(data);
        setShowAgendamentoModal(true);
      }
      
      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new-agendamento',
        data,
        timestamp: new Date()
      }]);
    });

    // Log de conexão/desconexão
    newSocket.on('connect', () => {
      // Conectado
    });

    newSocket.on('disconnect', () => {
      // Desconectado
    });

    newSocket.on('connect_error', (error) => {
      // Erro de conexão
    });

    // Cleanup
    return () => {
      newSocket.disconnect();
    };
  }, [user, showSuccessToast, showInfoToast]);

  // Tocar música quando o modal aparecer
  useEffect(() => {
    if (showAgendamentoModal && agendamentoData?.sdr_musica) {
      const audio = new Audio(agendamentoData.sdr_musica);
      audio.volume = 1.0;
      audio.loop = false; // Sem loop - apenas uma vez
      
      setAudioInstance(audio);
      
      // Tocar música
      audio.play().catch(() => {
        // Erro ao tocar música
      });
      
      // Fechar modal quando a música acabar
      audio.addEventListener('ended', () => {
        setShowAgendamentoModal(false);
        setAgendamentoData(null);
        setAudioInstance(null);
      });
      
      // Cleanup ao desmontar
      return () => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      };
    }
  }, [showAgendamentoModal, agendamentoData]);

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

