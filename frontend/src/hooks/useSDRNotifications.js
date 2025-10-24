import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import io from 'socket.io-client';

const useSDRNotifications = () => {
  const { user, isIncorporadora } = useAuth();
  const { showSuccessToast, showInfoToast } = useToast();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNewAgendamentoModal, setShowNewAgendamentoModal] = useState(false);
  const [newAgendamentoData, setNewAgendamentoData] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null); // Referência ao áudio atual

  // Mapeamento de SDRs com suas fotos e sons personalizados
  const sdrMapping = {
    243: {
      nome: 'Hilce',
      foto: 'https://idicuetpukxjqripbpwa.supabase.co/storage/v1/object/public/fotos-interno/Hilce%20SDR.jpg',
      som: '/HILCE.mp3'
    },
    242: {
      nome: 'Richard',
      foto: 'https://idicuetpukxjqripbpwa.supabase.co/storage/v1/object/public/fotos-interno/Richard%20SDR.jpg',
      som: '/HILCE.mp3' // Usar som da Hilce temporariamente
    },
    241: {
      nome: 'Jonathan',
      foto: 'https://idicuetpukxjqripbpwa.supabase.co/storage/v1/object/public/fotos-interno/jonathan%20Corretor.jpg',
      som: '/JONHATAN.mp3'
    },
    244: {
      nome: 'Maria Eduarda',
      foto: 'https://idicuetpukxjqripbpwa.supabase.co/storage/v1/object/public/fotos-interno/Maria%20Eduarda%20SDR.jpg',
      som: '/MARIA EDUARDA.mp3'
    },
    240: {
      nome: 'João',
      foto: 'https://idicuetpukxjqripbpwa.supabase.co/storage/v1/object/public/fotos-interno/Joao%20Corretor.jpg',
      som: '/JOAO.mp3'
    },
    239: {
      nome: 'Renata',
      foto: 'https://idicuetpukxjqripbpwa.supabase.co/storage/v1/object/public/fotos-interno/Renata%20SDR.jpg',
      som: '/RENATA.mp3'
    }
  };

  useEffect(() => {
    if (!isIncorporadora) {
      console.log('⚠️ [SDR NOTIFICATIONS] Hook não inicializado - usuário não é incorporadora:', {
        isIncorporadora,
        userId: user?.id,
        empresaId: user?.empresa_id,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🚀 [SDR NOTIFICATIONS] Inicializando hook de notificações SDR:', {
      userId: user.id,
      userType: user.tipo,
      empresaId: user.empresa_id,
      timestamp: new Date().toISOString()
    });

    // Configurar URL do backend
    const API_BASE_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    console.log('🔗 [SDR NOTIFICATIONS] Conectando ao backend:', API_BASE_URL);
    
    // Conectar ao Socket.IO
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);
    console.log('🔌 [SDR NOTIFICATIONS] Socket criado:', newSocket.id);

    // Entrar no grupo de notificações da incorporadora
    const userTypeToSend = user.tipo === 'admin' ? 'admin' : 'consultor';
    
    newSocket.emit('join-incorporadora-notifications', {
      userType: userTypeToSend,
      userId: user.id,
      empresaId: user.empresa_id
    });
    console.log('📢 [SDR NOTIFICATIONS] Emitindo join-incorporadora-notifications:', {
      userType: userTypeToSend,
      userId: user.id,
      empresaId: user.empresa_id
    });

    console.log('🔔 [SDR NOTIFICATIONS] Conectado às notificações SDR');

    // Listener para novos agendamentos com foto e som personalizados
    newSocket.on('new-agendamento-incorporadora', (data) => {
      console.log('🔔 [SDR NOTIFICATIONS] Recebido evento new-agendamento-incorporadora:', {
        agendamentoId: data.agendamentoId,
        paciente_nome: data.paciente_nome,
        data_agendamento: data.data_agendamento,
        horario: data.horario,
        sdr_nome: data.sdr_nome,
        sdr_id: data.sdr_id,
        sdr_foto: data.sdr_foto ? 'Disponível' : 'Não disponível',
        timestamp: data.timestamp,
        socketId: newSocket.id
      });
      
      // Obter dados do SDR para personalização
      const sdrData = sdrMapping[data.sdr_id] || {
        nome: data.sdr_nome,
        foto: data.sdr_foto || null,
        som: '/audioNovoLead.mp3' // Som padrão
      };
      
      console.log('🎭 [SDR NOTIFICATIONS] Dados do SDR para personalização:', sdrData);
      
      // Música removida temporariamente para agendamentos
      // Se reativar, adicionar verificação: if (!user.is_freelancer) playPersonalizedNotificationSound(sdrData.som, sdrData.nome);
      
      // Mostrar toast personalizado com foto do SDR apenas se não for freelancer
      if (!user.is_freelancer) {
        showPersonalizedToast(sdrData, data);
      }
      
      // Adicionar à lista de notificações
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'new-agendamento',
        data: {
          ...data,
          sdr_personalizado: sdrData
        },
        timestamp: new Date()
      }]);
      
      // Se for admin ou consultor interno, mostrar modal com foto do SDR
      if (user.tipo === 'admin' || (user.tipo === 'consultor' && user.pode_ver_todas_novas_clinicas)) {
        console.log('🎯 [SDR NOTIFICATIONS] Abrindo modal de novo agendamento com foto do SDR');
        setNewAgendamentoData({
          ...data,
          sdr_personalizado: sdrData
        });
        setShowNewAgendamentoModal(true);
        console.log('✅ [SDR NOTIFICATIONS] Modal deve estar aberta agora');
      } else {
        console.log('ℹ️ [SDR NOTIFICATIONS] Usuário não tem permissão para ver modal - apenas toast');
      }
      
      console.log('✅ [SDR NOTIFICATIONS] Processamento do evento new-agendamento-incorporadora concluído');
    });

    // Log de conexão/desconexão
    newSocket.on('connect', () => {
      console.log('✅ [SDR NOTIFICATIONS] Socket conectado:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ [SDR NOTIFICATIONS] Socket desconectado:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ [SDR NOTIFICATIONS] Erro de conexão:', {
        error: error.message,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
    });

    // Cleanup
    return () => {
      console.log('🧹 [SDR NOTIFICATIONS] Limpando conexão Socket.IO:', {
        socketId: newSocket.id,
        userId: user.id,
        empresaId: user.empresa_id,
        timestamp: new Date().toISOString()
      });
      newSocket.disconnect();
    };
  }, [isIncorporadora, user, showSuccessToast, showInfoToast]);

  // Função para tocar som personalizado do SDR
  const playPersonalizedNotificationSound = (somPath, sdrNome) => {
    try {
      // Parar áudio anterior se estiver tocando
      if (currentAudio) {
        console.log(`⏹️ [AUDIO PERSONALIZADO] Parando áudio anterior`);
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
      }
      
      console.log(`🔊 [AUDIO PERSONALIZADO] Tocando som do ${sdrNome}:`, somPath);
      const audio = new Audio(somPath);
      audio.volume = 1.0; // Volume máximo
      audio.loop = true; // Fazer música tocar em loop
      
      // Salvar referência do áudio atual
      setCurrentAudio(audio);
      
      // Adicionar event listeners para debug
      audio.addEventListener('loadstart', () => console.log(`🔊 [AUDIO PERSONALIZADO] Carregando áudio do ${sdrNome}...`));
      audio.addEventListener('canplay', () => console.log(`🔊 [AUDIO PERSONALIZADO] Áudio do ${sdrNome} pronto para tocar`));
      audio.addEventListener('play', () => console.log(`🔊 [AUDIO PERSONALIZADO] Áudio do ${sdrNome} tocando`));
      audio.addEventListener('pause', () => console.log(`⏸️ [AUDIO PERSONALIZADO] Áudio do ${sdrNome} pausado`));
      audio.addEventListener('error', (e) => console.error(`❌ [AUDIO PERSONALIZADO] Erro no áudio do ${sdrNome}:`, e));
      
      // Tocar o áudio com mais tentativas
      const playAudio = () => {
        audio.play().then(() => {
          console.log(`✅ [AUDIO PERSONALIZADO] Som do ${sdrNome} tocando em loop`);
        }).catch(error => {
          console.error(`❌ [AUDIO PERSONALIZADO] Erro ao tocar som do ${sdrNome}:`, error);
          // Tentar novamente após um delay progressivo
          setTimeout(() => {
            console.log(`🔄 [AUDIO PERSONALIZADO] Tentando novamente para ${sdrNome}...`);
            audio.play().catch(e => {
              console.error(`❌ [AUDIO PERSONALIZADO] Segunda tentativa falhou para ${sdrNome}:`, e);
            });
          }, 300);
        });
      };
      
      // Aguardar um pouco antes de tentar tocar para garantir que está carregado
      setTimeout(playAudio, 100);
    } catch (error) {
      console.error(`❌ [AUDIO PERSONALIZADO] Erro ao criar áudio do ${sdrNome}:`, error);
    }
  };

  // Função para parar o áudio (quando lead for capturado)
  const stopNotificationSound = () => {
    if (currentAudio) {
      console.log(`⏹️ [AUDIO PERSONALIZADO] Parando som de notificação`);
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
  };

  // Função para mostrar toast personalizado com foto do SDR
  const showPersonalizedToast = (sdrData, agendamentoData) => {
    // Criar elemento de toast personalizado
    const toastElement = document.createElement('div');
    toastElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1rem;
      max-width: 380px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      animation: slideInRight 0.3s ease-out;
    `;

    // Adicionar animação CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Foto do SDR
    const fotoElement = document.createElement('img');
    fotoElement.src = sdrData.foto;
    fotoElement.alt = `Foto do ${sdrData.nome}`;
    fotoElement.style.cssText = `
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #10b981;
      flex-shrink: 0;
    `;

    // Conteúdo do toast
    const contentElement = document.createElement('div');
    contentElement.style.cssText = 'flex: 1;';
    contentElement.innerHTML = `
      <div style="font-weight: 600; color: #111827; font-size: 0.875rem; margin-bottom: 0.25rem;">
        Novo Agendamento
      </div>
      <div style="color: #6b7280; font-size: 0.8125rem; margin-bottom: 0.125rem;">
        <strong style="color: #111827;">${sdrData.nome}</strong> criou um agendamento
      </div>
      <div style="color: #9ca3af; font-size: 0.75rem;">
        ${agendamentoData.paciente_nome} - ${agendamentoData.data_agendamento} às ${agendamentoData.horario}
      </div>
    `;

    toastElement.appendChild(fotoElement);
    toastElement.appendChild(contentElement);

    // Adicionar ao DOM
    document.body.appendChild(toastElement);

    // Remover após 5 segundos
    setTimeout(() => {
      toastElement.style.opacity = '0';
      toastElement.style.transform = 'translateX(100%)';
      toastElement.style.transition = 'all 0.3s ease-out';
      setTimeout(() => {
        if (toastElement.parentNode) {
          toastElement.parentNode.removeChild(toastElement);
        }
      }, 300);
    }, 5000);
  };

  // Função para limpar notificações
  const clearNotifications = () => {
    console.log('🧹 [SDR NOTIFICATIONS] Limpando notificações:', {
      quantidadeAntes: notifications.length,
      timestamp: new Date().toISOString()
    });
    setNotifications([]);
  };

  // Função para fechar modal
  const fecharModalAgendamento = () => {
    // Parar o áudio quando fechar o modal
    stopNotificationSound();
    setShowNewAgendamentoModal(false);
    setNewAgendamentoData(null);
  };

  // Componente da Modal personalizada com foto do SDR
  const NewAgendamentoModal = () => {
    if (!showNewAgendamentoModal || !newAgendamentoData) return null;

    const sdrData = newAgendamentoData.sdr_personalizado;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '20px',
          padding: '2.5rem',
          maxWidth: '520px',
          width: '90%',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}>
          {/* Badge de notificação */}
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '20px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '25px',
            fontSize: '0.75rem',
            fontWeight: '700',
            letterSpacing: '0.5px',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
          }}>
            🎯 NOVO AGENDAMENTO
          </div>

          {/* Foto do SDR grande */}
          {sdrData.foto && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                position: 'relative',
                display: 'inline-block'
              }}>
                <img 
                  src={sdrData.foto} 
                  alt={`Foto do ${sdrData.nome}`}
                  style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid #10b981',
                    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '25px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  whiteSpace: 'nowrap'
                }}>
                  {sdrData.nome}
                </div>
              </div>
            </div>
          )}

          {/* Informações em cards */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: '12px',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0
              }}>
                🏥
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#065f46', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  PACIENTE
                </div>
                <div style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '700' }}>
                  {newAgendamentoData.paciente_nome}
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '12px',
              border: '1px solid #fbbf24'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0
              }}>
                📅
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#92400e', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  DATA
                </div>
                <div style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '700' }}>
                  {newAgendamentoData.data_agendamento}
                </div>
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              borderRadius: '12px',
              border: '1px solid #60a5fa'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0
              }}>
                ⏰
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#1e40af', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                  HORÁRIO
                </div>
                <div style={{ color: '#111827', fontSize: '1.125rem', fontWeight: '700' }}>
                  {newAgendamentoData.horario}
                </div>
              </div>
            </div>
          </div>

          {/* Botão de confirmar */}
          <button
            onClick={fecharModalAgendamento}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 15px 35px rgba(16, 185, 129, 0.4)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
            }}
          >
            ✓ Confirmar
          </button>
        </div>
      </div>
    );
  };

  return {
    socket,
    notifications,
    clearNotifications,
    playPersonalizedNotificationSound,
    stopNotificationSound,
    showNewAgendamentoModal,
    newAgendamentoData,
    fecharModalAgendamento,
    NewAgendamentoModal,
    sdrMapping
  };
};

export default useSDRNotifications;
