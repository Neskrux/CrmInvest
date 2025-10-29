import { useEffect, useState, useRef, useCallback } from 'react';
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
    try {
      // Parar áudio anterior se existir
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
        audioInstanceRef.current.currentTime = 0;
        audioInstanceRef.current = null;
      }
      
      // Usar música personalizada do SDR se disponível, senão usar áudio padrão
      const audioSource = musicaUrl || `${process.env.PUBLIC_URL || ''}/audioNovoLead.mp3`;
      const audio = new Audio(audioSource);
      audio.volume = 1.0; // Volume máximo
      audio.loop = true; // Música em loop
      
      audioInstanceRef.current = audio;
      
      // Tentar tocar música
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ [AGENDAMENTO] Música tocando em LOOP!');
          })
          .catch(error => {
            // Erro de autoplay policy - normal, não bloquear o modal
            // A música tentará tocar quando o usuário interagir com a página
            console.log('ℹ️ [AGENDAMENTO] Áudio aguardando interação do usuário');
            
            // Adicionar listener de clique para tentar tocar após interação
            const tryPlayOnInteraction = () => {
              if (audioInstanceRef.current && audioInstanceRef.current.paused) {
                audioInstanceRef.current.play()
                  .then(() => {
                    console.log('✅ [AGENDAMENTO] Música iniciada após interação');
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
      console.log('ℹ️ [AGENDAMENTO] Não foi possível criar áudio');
    }
  }, []);

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
      
      try {
        // Tocar música personalizada do SDR
        playAgendamentoSound(data.sdr_musica);
        
        // Mostrar modal
        setAgendamentoData(data);
        setShowAgendamentoModal(true);
        
        // Timer para fechar automaticamente após 20 segundos
        const timer = setTimeout(() => {
          console.log('⏰ [TIMER] Fechando modal de agendamento após 20 segundos...');
          stopAgendamentoSound();
          setShowAgendamentoModal(false);
          setAgendamentoData(null);
        }, 20000);
        modalTimerRef.current = timer;

        // Adicionar à lista de notificações
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'new-agendamento',
          data,
          timestamp: new Date()
        }]);
        
        console.log('✅ [SOCKET.IO] Processamento do evento new-agendamento-incorporadora concluído');
      } catch (error) {
        console.error('❌ [SOCKET.IO] Erro ao processar agendamento:', error);
      }
    });

    // Log de conexão/desconexão
    newSocket.on('connect', () => {
      console.log('✅ [AGENDAMENTO] Socket conectado com sucesso:', newSocket.id);
      
      // Re-entrar no grupo de notificações ao reconectar
      newSocket.emit('join-incorporadora-notifications', {
        userType: 'admin',
        userId: user.id,
        empresaId: user.empresa_id
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ [AGENDAMENTO] Socket desconectado');
    });

    newSocket.on('reconnect', () => {
      console.log('🔄 [AGENDAMENTO] Socket reconectado');
      
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

    // Cleanup
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
    };
  }, [user, playAgendamentoSound, stopAgendamentoSound]);

  // useEffect para parar música quando o modal for fechado
  useEffect(() => {
    // Só executar quando o modal mudar de true para false
    if (!showAgendamentoModal) {
      // Limpar timer se existir
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current);
        modalTimerRef.current = null;
      }
      
      // Parar música se estiver tocando
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

