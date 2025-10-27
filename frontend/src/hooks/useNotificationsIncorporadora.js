import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const useNotificationsIncorporadora = () => {
  const { user } = useAuth();
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [showFechamentoModal, setShowFechamentoModal] = useState(false);
  const [leadData, setLeadData] = useState(null);
  const [agendamentoData, setAgendamentoData] = useState(null);
  const [fechamentoData, setFechamentoData] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || user.empresa_id !== 5) return;

    console.log('🔌 [SOCKET.IO] Conectando ao servidor para notificações da incorporadora...');
    
    socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ [SOCKET.IO] Conectado ao servidor');
      socket.emit('join-room', 'incorporadora-notifications');
      console.log('🏠 [SOCKET.IO] Entrou na sala incorporadora-notifications');
    });

    socket.on('disconnect', () => {
      console.log('❌ [SOCKET.IO] Desconectado do servidor');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [SOCKET.IO] Erro de conexão:', error);
    });

    // Evento para novos leads
    socket.on('new-lead-incorporadora', (data) => {
      console.log('🔔 [SOCKET.IO] Novo lead recebido:', data);
      
      // Buscar dados do SDR
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/consultores/${data.sdr_id}`)
        .then(response => response.json())
        .then(sdrData => {
          const leadWithSdrData = {
            ...data,
            sdr_nome: sdrData.nome || 'SDR',
            sdr_foto: sdrData.foto_url || null,
            sdr_musica: sdrData.musica_url || null
          };
          
          setLeadData(leadWithSdrData);
          setShowLeadModal(true);
          
          // Tocar música do SDR se disponível
          if (sdrData.musica_url) {
            playNotificationSound(sdrData.musica_url);
          }
        })
        .catch(error => {
          console.error('❌ Erro ao buscar dados do SDR:', error);
          setLeadData(data);
          setShowLeadModal(true);
        });
    });

    // Evento para novos agendamentos
    socket.on('new-agendamento-incorporadora', (data) => {
      console.log('📅 [SOCKET.IO] Novo agendamento recebido:', data);
      
      setAgendamentoData(data);
      setShowAgendamentoModal(true);
      
      // Tocar música do SDR se disponível
      if (data.sdr_musica) {
        playNotificationSound(data.sdr_musica);
      }
    });

    // Evento para novos fechamentos
    socket.on('new-fechamento-incorporadora', (data) => {
      console.log('💰 [SOCKET.IO] Novo fechamento recebido:', data);
      
      setFechamentoData(data);
      setShowFechamentoModal(true);
      
      // Tocar música do corretor se disponível
      if (data.corretor_musica) {
        playNotificationSound(data.corretor_musica);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      stopNotificationSound();
    };
  }, [user]);

  const playNotificationSound = (audioUrl) => {
    try {
      stopNotificationSound(); // Parar qualquer áudio anterior
      
      const audio = new Audio(audioUrl);
      audio.loop = true;
      audio.volume = 0.7;
      
      audioRef.current = audio;
      setAudioPlaying(true);
      
      audio.play().catch(error => {
        console.error('❌ Erro ao reproduzir áudio:', error);
        setAudioPlaying(false);
      });
      
      console.log('🔊 [AUDIO] Reproduzindo notificação:', audioUrl);
    } catch (error) {
      console.error('❌ Erro ao configurar áudio:', error);
    }
  };

  const stopNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setAudioPlaying(false);
      console.log('🔇 [AUDIO] Áudio parado');
    }
  };

  const closeLeadModal = () => {
    setShowLeadModal(false);
    setLeadData(null);
    stopNotificationSound();
  };

  const closeAgendamentoModal = () => {
    setShowAgendamentoModal(false);
    setAgendamentoData(null);
    stopNotificationSound();
  };

  const closeFechamentoModal = () => {
    setShowFechamentoModal(false);
    setFechamentoData(null);
    stopNotificationSound();
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
    // Estados dos modais
    showLeadModal,
    showAgendamentoModal,
    showFechamentoModal,
    
    // Dados
    leadData,
    agendamentoData,
    fechamentoData,
    
    // Estados de controle
    audioPlaying,
    
    // Funções de controle
    closeLeadModal,
    closeAgendamentoModal,
    closeFechamentoModal,
    stopNotificationSound,
    
    // Funções de formatação
    formatPhoneNumber,
    formatCurrency,
    formatDateTime
  };
};

export default useNotificationsIncorporadora;
